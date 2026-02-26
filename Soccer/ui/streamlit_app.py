from __future__ import annotations

import pathlib
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
import streamlit as st

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from soccer_predictor.config import SETTINGS
from soccer_predictor.model import (
    load_model_artifact,
    MODEL_FAMILY_LABELS,
    optimize_model,
    predict_by_date,
)
from soccer_predictor.pipeline import sync_recent

st.set_page_config(page_title="Soccer Predictor", layout="wide")
st.title("体彩胜平负预测")

cn_today = datetime.now(ZoneInfo(SETTINGS.market_timezone)).date()

page = st.sidebar.radio(
    "功能菜单",
    ["历史比赛记录", "今日比赛"],
    index=0,
)

st.sidebar.markdown("---")
st.sidebar.caption("数据维护")
opt_mode_label = st.sidebar.selectbox(
    "优化模式",
    ["快速(推荐)", "深度(更慢)"],
    index=0,
)
if st.sidebar.button("同步近期数据"):
    n = sync_recent(days_back=7, days_forward=2)
    st.cache_data.clear()
    st.sidebar.success(f"同步完成：{n} 条")

if st.sidebar.button("自动优化模型(参数组合+容量)"):
    search_mode = "fast" if opt_mode_label.startswith("快速") else "standard"
    with st.spinner("正在执行参数组合与训练容量搜索，请稍候..."):
        result = optimize_model(
            min_samples=300,
            validation_size=3000,
            weighted=None,
            search_mode=search_mode,
        )
    st.cache_data.clear()
    st.session_state["last_optimize_result"] = result
    best = result.get("best") or {}
    acc = best.get("accuracy")
    try:
        acc_txt = f"{float(acc) * 100:.2f}%"
    except Exception:
        acc_txt = "-"
    st.sidebar.success(
        f"优化完成，最佳准确率：{acc_txt}"
    )


@st.cache_data(show_spinner=False, ttl=600)
def _cached_predict(target: str, ttype: str, hdays: int):
    return predict_by_date(target, ticket_type=ttype, history_days=hdays)


def _label_result(code: str | None) -> str:
    return {"H": "主胜", "D": "平局", "A": "客胜"}.get(code or "", "-")


def _safe_pct(x: float | None) -> str:
    if x is None:
        return "-"
    try:
        return f"{float(x) * 100:.2f}%"
    except Exception:
        return "-"


def _safe_float(x: float | None) -> str:
    if x is None:
        return "-"
    try:
        return f"{float(x):.4f}"
    except Exception:
        return "-"


def _render_prediction_table(
    target_date: str,
    ticket_type: str,
    history_days: int,
    title_prefix: str,
) -> None:
    rows = _cached_predict(target_date, ticket_type, history_days)
    label_map = {"ALL": "全部比赛", "JCZQ": "竞彩足球", "BJDC": "北京单场"}
    st.subheader(f"{title_prefix} · {target_date} · {label_map[ticket_type]}")
    if not rows:
        st.info("该条件下暂无可预测数据。")
        return

    df = pd.DataFrame(rows)
    prob_cols = ["prob_home", "prob_draw", "prob_away"]
    df["pred_code"] = df[prob_cols].idxmax(axis=1).map(
        {"prob_home": "H", "prob_draw": "D", "prob_away": "A"}
    )
    df["pred_label"] = df["pred_code"].map(_label_result)
    df["confidence"] = df[prob_cols].max(axis=1)
    df["actual_label"] = df["actual"].map(_label_result)
    df["is_correct"] = (df["finished"]) & (df["pred_code"] == df["actual"])

    artifact = load_model_artifact()
    model_metrics = (artifact or {}).get("metrics") or {}
    finished_df = df[df["finished"] == True]  # noqa: E712
    day_acc = float(finished_df["is_correct"].mean()) if not finished_df.empty else None

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("总准确率(测试集)", _safe_pct(model_metrics.get("accuracy")))
    m2.metric("赔率基线准确率", _safe_pct(model_metrics.get("baseline_accuracy")))
    m3.metric("当日已完赛准确率", _safe_pct(day_acc))
    m4.metric("当日场次", str(len(df)))
    model_family = (artifact or {}).get("model_family")
    if model_family:
        st.caption(f"当前模型：{MODEL_FAMILY_LABELS.get(model_family, model_family)}")
    weighting_strategy = (artifact or {}).get("weighting_strategy")
    if weighting_strategy:
        st.caption(f"训练加权：{weighting_strategy}")
    st.caption(
        "模型稳定性(验证窗口按日)："
        f"balanced={_safe_float(model_metrics.get('balanced_score'))}, "
        f"mean={_safe_pct(model_metrics.get('daily_acc_mean'))}, "
        f"median={_safe_pct(model_metrics.get('daily_acc_median'))}, "
        f"std={_safe_pct(model_metrics.get('daily_acc_std'))}, "
        f"稳健分数={_safe_float(model_metrics.get('robust_score'))}"
    )
    if len(finished_df) <= 20:
        st.caption("提示：单日场次较少时，当日准确率会天然大幅波动，需结合长期稳定性指标看模型。")

    view_df = df[
        [
            "match_no_cn",
            "match_time",
            "league_name",
            "home_team",
            "away_team",
            "odds_win",
            "odds_draw",
            "odds_lose",
            "prob_home",
            "prob_draw",
            "prob_away",
            "pred_label",
            "confidence",
            "actual_label",
            "finished",
            "is_correct",
        ]
    ].copy()

    view_df = view_df.rename(
        columns={
            "match_no_cn": "赛事编号",
            "match_time": "开赛时间",
            "league_name": "联赛",
            "home_team": "主队",
            "away_team": "客队",
            "odds_win": "欧赔-主",
            "odds_draw": "欧赔-平",
            "odds_lose": "欧赔-客",
            "prob_home": "主胜概率",
            "prob_draw": "平局概率",
            "prob_away": "客胜概率",
            "pred_label": "模型预测",
            "confidence": "预测置信度",
            "actual_label": "最终赛果",
            "finished": "已完赛",
            "is_correct": "预测命中",
        }
    )

    for c in ["主胜概率", "平局概率", "客胜概率", "预测置信度"]:
        view_df[c] = view_df[c].map(lambda x: f"{x * 100:.2f}%" if pd.notna(x) else "-")
    view_df["赛事编号"] = view_df["赛事编号"].fillna("-")
    view_df["联赛"] = view_df["联赛"].fillna("-")

    st.dataframe(view_df, use_container_width=True, hide_index=True)


def _render_last_optimize_summary() -> None:
    out = st.session_state.get("last_optimize_result")
    if not out:
        return

    best = out.get("best") or {}
    with st.expander("最近一次自动优化结果", expanded=False):
        mode = (out.get("search_space") or {}).get("search_mode")
        s1, s2, s3, s4 = st.columns(4)
        s1.metric("最佳准确率", _safe_pct(best.get("accuracy")))
        s2.metric("log-loss", "-" if best.get("log_loss") is None else f"{best.get('log_loss'):.4f}")
        s3.metric("稳健分数", _safe_float(best.get("robust_score")))
        s4.metric("按日波动σ", _safe_pct(best.get("daily_acc_std")))
        st.caption(f"平衡评分(准确率+稳健)：{_safe_float(best.get('balanced_score'))}")
        t1, t2 = st.columns(2)
        t1.metric("训练样本(使用)", str(best.get("samples_used") or "-"))
        t2.metric("搜索组合数", str(out.get("evaluated") or "-"))
        st.caption(
            f"最佳参数组：{', '.join(best.get('feature_groups') or [])} | "
            f"容量：{best.get('train_limit')} | 切分比例：{best.get('split_ratio')} | "
            f"模型：{MODEL_FAMILY_LABELS.get(best.get('model_family'), best.get('model_family'))} | "
            f"加权训练：{best.get('weighting_strategy') if best.get('weighting_strategy') else ('是' if best.get('weighted_training') else '否')}"
        )
        if mode:
            st.caption(f"搜索模式：{mode}")

        leaderboard = out.get("leaderboard") or []
        if leaderboard:
            df = pd.DataFrame(leaderboard)
            if "feature_groups" in df.columns:
                df["feature_groups"] = df["feature_groups"].map(lambda x: ",".join(x) if isinstance(x, list) else x)
            df = df.rename(
                columns={
                    "feature_groups": "参数组组合",
                    "train_limit": "容量限制",
                    "model_family": "模型",
                    "samples_used": "实际样本",
                    "train_size": "训练集",
                    "test_size": "测试集",
                    "accuracy": "准确率",
                    "log_loss": "log-loss",
                    "robust_score": "稳健分数",
                    "balanced_score": "平衡评分",
                    "daily_acc_std": "按日波动σ",
                    "baseline_accuracy": "基线准确率",
                    "feature_count": "特征数",
                }
            )
            for col in ["准确率", "基线准确率", "按日波动σ"]:
                if col in df.columns:
                    df[col] = df[col].map(lambda x: f"{float(x) * 100:.2f}%" if pd.notna(x) else "-")
            if "稳健分数" in df.columns:
                df["稳健分数"] = df["稳健分数"].map(lambda x: f"{float(x):.4f}" if pd.notna(x) else "-")
            if "平衡评分" in df.columns:
                df["平衡评分"] = df["平衡评分"].map(lambda x: f"{float(x):.4f}" if pd.notna(x) else "-")
            if "模型" in df.columns:
                df["模型"] = df["模型"].map(lambda x: MODEL_FAMILY_LABELS.get(x, x))
            st.dataframe(df, use_container_width=True, hide_index=True)


category_options = {"全部比赛": "ALL", "竞彩足球": "JCZQ", "北京单场": "BJDC"}
if page == "历史比赛记录":
    _render_last_optimize_summary()

    default_date = cn_today - timedelta(days=1)
    if "history_target_date" not in st.session_state:
        st.session_state["history_target_date"] = default_date
    min_date = datetime.strptime(SETTINGS.train_start_date, "%Y-%m-%d").date()

    col1, col2, col3 = st.columns(3)
    with col1:
        nav1, nav2, nav3 = st.columns([1, 2, 1])
        if nav1.button("◀", key="date_prev", use_container_width=True):
            st.session_state["history_target_date"] = max(
                min_date,
                st.session_state["history_target_date"] - timedelta(days=1),
            )
        if nav3.button("▶", key="date_next", use_container_width=True):
            st.session_state["history_target_date"] = min(
                cn_today,
                st.session_state["history_target_date"] + timedelta(days=1),
            )
        target_date = nav2.date_input(
            "选择日期",
            key="history_target_date",
            min_value=min_date,
            max_value=cn_today,
        )
    with col2:
        history_days = st.selectbox("历史窗口(天)", options=[365, 540, 730, 1095], index=0)
    with col3:
        selected = st.radio("赛事分类", list(category_options.keys()), horizontal=True, index=1)
    _render_prediction_table(
        target_date.isoformat(),
        category_options[selected],
        int(history_days),
        "历史比赛记录",
    )

elif page == "今日比赛":
    _render_last_optimize_summary()
    col1, col2 = st.columns(2)
    with col1:
        history_days = st.selectbox("历史窗口(天)", options=[365, 540, 730, 1095], index=0)
    with col2:
        selected = st.radio("赛事分类", list(category_options.keys()), horizontal=True, index=1)
    _render_prediction_table(
        cn_today.isoformat(),
        category_options[selected],
        int(history_days),
        "今日比赛",
    )
