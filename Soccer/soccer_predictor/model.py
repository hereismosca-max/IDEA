from __future__ import annotations

import itertools
import os
import re
import warnings
from datetime import date, datetime, timedelta
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from soccer_predictor.config import SETTINGS
from soccer_predictor.db import (
    fetch_matches,
    fetch_matches_by_issue_date,
    fetch_team_history_matches,
)
from soccer_predictor.features import build_feature_frame
from soccer_predictor.news_features import NEWS_NUMERIC_COLS

# Avoid matplotlib cache warnings when optional model libs import plotting deps.
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
# Silence loky physical-core detection warning on macOS sandbox.
os.environ.setdefault("LOKY_MAX_CPU_COUNT", "8")

try:
    from lightgbm import LGBMClassifier
except Exception:  # pragma: no cover - optional dependency
    LGBMClassifier = None

try:
    from catboost import CatBoostClassifier
except Exception:  # pragma: no cover - optional dependency
    CatBoostClassifier = None

NUMERIC_COLS = [
    "odds_win",
    "odds_draw",
    "odds_lose",
    "implied_home",
    "implied_draw",
    "implied_away",
    "home_form_points5",
    "away_form_points5",
    "form_points_diff",
    "home_form_gd5",
    "away_form_gd5",
    "form_gd_diff",
    "asia_handicap_num",
    "ou_line_num",
    "asia_home_odds",
    "asia_away_odds",
    "ou_over_odds",
    "ou_under_odds",
    *NEWS_NUMERIC_COLS,
]

CATEGORICAL_COLS = ["league_id", "ticket_type"]

FEATURE_GROUPS: dict[str, dict[str, Any]] = {
    "odds_1x2": {
        "label": "欧赔胜平负",
        "desc": "主/平/客欧赔 + 隐含概率",
        "numeric": [
            "odds_win",
            "odds_draw",
            "odds_lose",
            "implied_home",
            "implied_draw",
            "implied_away",
        ],
        "categorical": [],
    },
    "form_recent": {
        "label": "球队近况",
        "desc": "双方近5场积分与净胜球",
        "numeric": [
            "home_form_points5",
            "away_form_points5",
            "form_points_diff",
            "home_form_gd5",
            "away_form_gd5",
            "form_gd_diff",
        ],
        "categorical": [],
    },
    "asia_handicap": {
        "label": "让球指数",
        "desc": "亚盘水位与让球线",
        "numeric": [
            "asia_handicap_num",
            "asia_home_odds",
            "asia_away_odds",
        ],
        "categorical": [],
    },
    "over_under": {
        "label": "大小球指数",
        "desc": "大小球盘口与水位",
        "numeric": [
            "ou_line_num",
            "ou_over_odds",
            "ou_under_odds",
        ],
        "categorical": [],
    },
    "league": {
        "label": "联赛信息",
        "desc": "联赛ID（类别特征）",
        "numeric": [],
        "categorical": ["league_id"],
    },
    "ticket_context": {
        "label": "玩法类型",
        "desc": "竞彩足球/北京单场（统一模型内显式学习玩法差异）",
        "numeric": [],
        "categorical": ["ticket_type"],
    },
    "news_context": {
        "label": "新闻语境",
        "desc": "新闻情绪/伤停/转会/战意/天气（占位）",
        "numeric": list(NEWS_NUMERIC_COLS),
        "categorical": [],
    },
}

DEFAULT_FEATURE_GROUPS = [
    "odds_1x2",
    "form_recent",
    "asia_handicap",
    "over_under",
    "league",
    "ticket_context",
]


def load_model_artifact(model_path: str | None = None) -> dict[str, Any] | None:
    path = model_path or SETTINGS.model_path
    if not os.path.exists(path):
        return None
    try:
        return joblib.load(path)
    except Exception:
        return None


MODEL_FAMILY_LABELS: dict[str, str] = {
    "logreg": "LogisticRegression",
    "hgbt": "HistGradientBoosting",
    "lightgbm": "LightGBM",
    "catboost": "CatBoost",
}


def get_available_model_families() -> dict[str, str]:
    out = {
        "logreg": MODEL_FAMILY_LABELS["logreg"],
        "hgbt": MODEL_FAMILY_LABELS["hgbt"],
    }
    if LGBMClassifier is not None:
        out["lightgbm"] = MODEL_FAMILY_LABELS["lightgbm"]
    if CatBoostClassifier is not None:
        out["catboost"] = MODEL_FAMILY_LABELS["catboost"]
    return out


def _normalize_model_family(model_family: str | None) -> str:
    available = get_available_model_families()
    if model_family is None or model_family == "auto":
        for name in ["lightgbm", "catboost", "hgbt", "logreg"]:
            if name in available:
                return name
        return "logreg"

    if model_family not in available:
        raise RuntimeError(f"Model family not available: {model_family}. available={list(available.keys())}")
    return model_family


def _normalize_model_candidates(model_candidates: list[str] | None) -> list[str]:
    available = get_available_model_families()
    if not model_candidates:
        preferred = ["lightgbm", "catboost", "hgbt", "logreg"]
        return [m for m in preferred if m in available]

    out: list[str] = []
    seen: set[str] = set()
    for m in model_candidates:
        if m in available and m not in seen:
            out.append(m)
            seen.add(m)
    if not out:
        raise RuntimeError(
            f"No valid model candidates. requested={model_candidates}, available={list(available.keys())}"
        )
    return out


def _default_fast_model_candidates(model_path: str | None = None) -> list[str]:
    available = get_available_model_families()
    preferred = [m for m in ["logreg", "catboost", "lightgbm", "hgbt"] if m in available]
    out = preferred[:2]

    old = load_model_artifact(model_path)
    old_family = (old or {}).get("model_family")
    if old_family in available and old_family not in out:
        out = [old_family] + out
    seen: set[str] = set()
    uniq: list[str] = []
    for m in out:
        if m not in seen:
            uniq.append(m)
            seen.add(m)
    return uniq or [m for m in ["logreg", "hgbt"] if m in available]


def _resolve_feature_group_combos(
    candidate_groups: list[str],
    search_mode: str,
) -> list[list[str]]:
    valid = set(candidate_groups)
    if search_mode in {"standard", "full"}:
        combos: list[list[str]] = []
        for r in range(1, len(candidate_groups) + 1):
            for group_tuple in itertools.combinations(candidate_groups, r):
                combos.append(list(group_tuple))
        return combos

    # fast mode: curated high-value combinations to reduce latency.
    presets: list[list[str]] = [
        ["odds_1x2"],
        ["odds_1x2", "asia_handicap"],
        ["odds_1x2", "over_under"],
        ["odds_1x2", "form_recent"],
        ["odds_1x2", "asia_handicap", "over_under"],
        ["odds_1x2", "form_recent", "asia_handicap", "over_under"],
        ["odds_1x2", "form_recent", "asia_handicap", "over_under", "league"],
    ]
    if "ticket_context" in valid:
        presets.append(["odds_1x2", "form_recent", "asia_handicap", "over_under", "ticket_context"])
        presets.append(
            ["odds_1x2", "form_recent", "asia_handicap", "over_under", "league", "ticket_context"]
        )
    if "news_context" in valid:
        presets.append(["odds_1x2", "asia_handicap", "over_under", "news_context"])
        presets.append(["odds_1x2", "form_recent", "asia_handicap", "over_under", "league", "news_context"])

    out: list[list[str]] = []
    seen: set[tuple[str, ...]] = set()
    for combo in presets:
        filtered = [g for g in combo if g in valid]
        if not filtered:
            continue
        key = tuple(sorted(filtered))
        if key in seen:
            continue
        seen.add(key)
        out.append(filtered)

    if out:
        return out

    combos: list[list[str]] = []
    for r in range(1, len(candidate_groups) + 1):
        for group_tuple in itertools.combinations(candidate_groups, r):
            combos.append(list(group_tuple))
    return combos


def _is_better_model(candidate: dict[str, Any], current: dict[str, Any] | None) -> tuple[bool, str]:
    if not current:
        return True, "no_current_model"

    cand_m = (candidate.get("metrics") or {})
    curr_m = (current.get("metrics") or {})

    cand_acc = cand_m.get("accuracy")
    curr_acc = curr_m.get("accuracy")
    cand_ll = cand_m.get("log_loss")
    curr_ll = curr_m.get("log_loss")

    if curr_acc is None or (isinstance(curr_acc, float) and np.isnan(curr_acc)):
        if cand_acc is not None and not (isinstance(cand_acc, float) and np.isnan(cand_acc)):
            return True, "current_accuracy_nan"
    if cand_acc is None or (isinstance(cand_acc, float) and np.isnan(cand_acc)):
        return False, "candidate_accuracy_nan"

    # 优先准确率，次看 log-loss
    if float(cand_acc) > float(curr_acc) + 0.001:
        return True, "higher_accuracy"

    if curr_ll is None or (isinstance(curr_ll, float) and np.isnan(curr_ll)):
        return False, "no_metric_improvement"
    if cand_ll is None or (isinstance(cand_ll, float) and np.isnan(cand_ll)):
        return False, "candidate_logloss_nan"
    if float(cand_acc) >= float(curr_acc) - 0.0005 and float(cand_ll) < float(curr_ll) - 0.002:
        return True, "lower_logloss_with_similar_accuracy"

    return False, "no_metric_improvement"


def get_feature_groups() -> dict[str, dict[str, Any]]:
    return FEATURE_GROUPS


def _normalize_feature_groups(
    feature_groups: list[str] | None,
    model_path: str | None = None,
) -> list[str]:
    valid = set(FEATURE_GROUPS.keys())
    if feature_groups is None:
        old = load_model_artifact(model_path)
        old_groups = (old or {}).get("feature_groups") or []
        picked = [g for g in old_groups if g in valid]
        if picked:
            return picked
        return list(DEFAULT_FEATURE_GROUPS)

    picked = [g for g in feature_groups if g in valid]
    if not picked:
        raise RuntimeError("No valid feature groups selected.")
    return picked


def _resolve_feature_columns(feature_groups: list[str]) -> tuple[list[str], list[str]]:
    numeric_raw: list[str] = []
    categorical_raw: list[str] = []
    for g in feature_groups:
        conf = FEATURE_GROUPS[g]
        numeric_raw.extend(conf.get("numeric", []))
        categorical_raw.extend(conf.get("categorical", []))

    # 保持全局列顺序，避免模型输入列顺序漂移
    numeric_set = set(numeric_raw)
    cat_set = set(categorical_raw)
    numeric_cols = [c for c in NUMERIC_COLS if c in numeric_set]
    categorical_cols = [c for c in CATEGORICAL_COLS if c in cat_set]
    return numeric_cols, categorical_cols


def _safe_metric_value(x: Any) -> float:
    if x is None:
        return float("nan")
    try:
        return float(x)
    except Exception:
        return float("nan")


def _trial_balanced_score(trial: dict[str, Any]) -> float:
    acc = _safe_metric_value(trial.get("accuracy"))
    rob = _safe_metric_value(trial.get("robust_score"))
    if np.isnan(acc):
        return float("nan")
    if np.isnan(rob):
        return acc
    return 0.65 * acc + 0.35 * rob


def _is_trial_better(candidate: dict[str, Any], current: dict[str, Any] | None) -> bool:
    if current is None:
        return True

    c_rob = _safe_metric_value(candidate.get("robust_score"))
    o_rob = _safe_metric_value(current.get("robust_score"))

    c_acc = _safe_metric_value(candidate.get("accuracy"))
    o_acc = _safe_metric_value(current.get("accuracy"))
    c_ll = _safe_metric_value(candidate.get("log_loss"))
    o_ll = _safe_metric_value(current.get("log_loss"))

    # 主目标：准确率；辅目标：稳健分数。避免为了稳定性牺牲过多命中率。
    if not np.isnan(c_rob) and not np.isnan(o_rob) and not np.isnan(c_acc) and not np.isnan(o_acc):
        c_balanced = 0.65 * c_acc + 0.35 * c_rob
        o_balanced = 0.65 * o_acc + 0.35 * o_rob
        if c_balanced > o_balanced + 1e-9:
            return True
        if c_balanced < o_balanced - 1e-9:
            return False

    if np.isnan(c_acc):
        return False
    if np.isnan(o_acc):
        return True
    if c_acc > o_acc + 1e-9:
        return True
    if c_acc < o_acc - 1e-9:
        return False

    # 准确率一致时，优先更低的 log-loss
    if np.isnan(c_ll):
        return False
    if np.isnan(o_ll):
        return True
    return c_ll < o_ll - 1e-9


def _prepare_training_dataframe(
    db_path: str | None = None,
    train_start_date: str | None = None,
) -> pd.DataFrame:
    matches = fetch_matches(
        db_path=db_path,
        start_date=train_start_date or SETTINGS.train_start_date,
        with_result_only=True,
    )
    df = build_feature_frame(matches)
    if df.empty:
        raise RuntimeError("No training data in DB. Run sync first.")

    df = df[df["target"].isin(["H", "D", "A"])].copy()
    if df.empty:
        raise RuntimeError("No valid training labels in DB.")

    df["dt"] = pd.to_datetime(df["match_date"] + " " + df["match_time"].fillna("00:00"))
    df = df.sort_values("dt").reset_index(drop=True)
    return df


def _apply_train_limit(df: pd.DataFrame, train_limit: int | None) -> pd.DataFrame:
    if train_limit is None:
        return df.copy().reset_index(drop=True)
    if train_limit <= 0:
        raise RuntimeError("train_limit must be positive.")
    if len(df) <= train_limit:
        return df.copy().reset_index(drop=True)
    return df.iloc[-train_limit:].copy().reset_index(drop=True)


def _compute_sample_weights(df: pd.DataFrame) -> np.ndarray:
    n = len(df)
    if n <= 0:
        return np.ones(0, dtype=float)

    w = np.ones(n, dtype=float)

    # 1) 赔率确定性加权：过于“稳胆”的样本降权，减少模型被低赔率样本主导。
    prob_cols = ["implied_home", "implied_draw", "implied_away"]
    if set(prob_cols).issubset(df.columns):
        probs = df[prob_cols].astype(float).copy()
        max_prob = probs.max(axis=1)
        if max_prob.notna().any():
            fill_value = float(max_prob.dropna().median())
            max_prob = max_prob.fillna(fill_value).clip(lower=0.34, upper=0.95)
            confidence_w = 1.0 + 1.5 * (0.55 - max_prob)
            confidence_w = confidence_w.clip(lower=0.35, upper=1.8).to_numpy(dtype=float)
            w *= confidence_w

    # 2) 时间衰减：近期比赛略高权，采用温和衰减避免过度“遗忘”历史样本。
    if "dt" in df.columns:
        dt = pd.to_datetime(df["dt"], errors="coerce")
        if dt.notna().any():
            latest = dt.max()
            age_days = (latest - dt).dt.days.fillna(0).clip(lower=0).to_numpy(dtype=float)
            half_life_days = 540.0
            decay_raw = np.exp(-np.log(2.0) * age_days / half_life_days)
            decay_w = 0.85 + 0.15 * decay_raw
            decay_w = np.clip(decay_w, 0.85, 1.0)
            w *= decay_w

    # 3) 结果类别平衡：轻度平衡 H/D/A，避免偏向主胜。
    if "target" in df.columns:
        y = df["target"].astype(str)
        vc = y.value_counts()
        if not vc.empty:
            class_w_map: dict[str, float] = {}
            total = float(len(y))
            num_classes = max(len(vc), 1)
            for k, c in vc.items():
                # 类似 balanced 权重，但使用更窄区间，避免放大噪声类别。
                cw = total / (num_classes * float(c))
                class_w_map[str(k)] = float(np.clip(cw, 0.85, 1.2))
            class_w = y.map(class_w_map).fillna(1.0).to_numpy(dtype=float)
            w *= class_w

    mean_w = float(np.mean(w))
    if mean_w <= 0 or not np.isfinite(mean_w):
        return np.ones(n, dtype=float)
    w = w / mean_w
    w = np.clip(w, 0.3, 2.2)
    return w.astype(float)


def _build_model_pipeline(
    numeric_cols: list[str],
    categorical_cols: list[str],
    model_family: str,
) -> Pipeline:
    dense_output = model_family in {"hgbt", "catboost"}
    transformers = []
    if numeric_cols:
        num_steps = [("imputer", SimpleImputer(strategy="median"))]
        if model_family == "logreg":
            num_steps.append(("scaler", StandardScaler()))
        transformers.append(
            (
                "num",
                Pipeline(steps=num_steps),
                numeric_cols,
            )
        )
    if categorical_cols:
        transformers.append(
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "onehot",
                            OneHotEncoder(
                                handle_unknown="ignore",
                                sparse_output=not dense_output,
                            ),
                        ),
                    ]
                ),
                categorical_cols,
            )
        )

    preprocessor = ColumnTransformer(
        transformers=transformers,
        sparse_threshold=0.0 if dense_output else 0.3,
    )
    if model_family == "logreg":
        clf = LogisticRegression(max_iter=2000)
    elif model_family == "hgbt":
        clf = HistGradientBoostingClassifier(
            max_depth=6,
            max_leaf_nodes=63,
            learning_rate=0.05,
            random_state=42,
        )
    elif model_family == "lightgbm":
        if LGBMClassifier is None:
            raise RuntimeError("lightgbm is not installed.")
        clf = LGBMClassifier(
            objective="multiclass",
            n_estimators=500,
            learning_rate=0.03,
            num_leaves=63,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
            force_col_wise=True,
            verbosity=-1,
        )
    elif model_family == "catboost":
        if CatBoostClassifier is None:
            raise RuntimeError("catboost is not installed.")
        clf = CatBoostClassifier(
            loss_function="MultiClass",
            depth=6,
            learning_rate=0.05,
            iterations=500,
            verbose=False,
            random_seed=42,
        )
    else:
        raise RuntimeError(f"Unknown model family: {model_family}")
    return Pipeline(steps=[("prep", preprocessor), ("clf", clf)])


def _fit_model(
    train_df: pd.DataFrame,
    numeric_cols: list[str],
    categorical_cols: list[str],
    weighted: bool,
    model_family: str,
) -> tuple[Pipeline, list[str]]:
    feature_cols = numeric_cols + categorical_cols
    X_train = train_df[feature_cols]
    y_train = train_df["target"]
    model = _build_model_pipeline(
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        model_family=model_family,
    )
    if weighted:
        sample_weight = _compute_sample_weights(train_df)
        model.fit(X_train, y_train, clf__sample_weight=sample_weight)
    else:
        model.fit(X_train, y_train)
    classes = list(model.named_steps["clf"].classes_)
    return model, classes


def _evaluate_model(
    model: Pipeline,
    eval_df: pd.DataFrame,
    classes: list[str],
    numeric_cols: list[str],
    categorical_cols: list[str],
) -> tuple[float, float, float, dict[str, Any]]:
    feature_cols = numeric_cols + categorical_cols
    X_eval = eval_df[feature_cols]
    y_eval = eval_df["target"]

    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message="X does not have valid feature names, but .* was fitted with feature names",
            category=UserWarning,
        )
        y_pred = model.predict(X_eval)
        y_prob = model.predict_proba(X_eval)

    acc = float(accuracy_score(y_eval, y_pred)) if len(eval_df) else np.nan
    ll = float(log_loss(y_eval, y_prob, labels=classes)) if len(eval_df) else np.nan

    if {"implied_home", "implied_draw", "implied_away"}.issubset(set(eval_df.columns)):
        baseline_col = eval_df[["implied_home", "implied_draw", "implied_away"]].idxmax(axis=1)
        baseline_pred = baseline_col.map(
            {
                "implied_home": "H",
                "implied_draw": "D",
                "implied_away": "A",
            }
        )
        baseline_acc = float(accuracy_score(y_eval, baseline_pred)) if len(eval_df) else np.nan
    else:
        baseline_acc = np.nan

    stability = _daily_stability_metrics(eval_df=eval_df, y_pred=y_pred)
    return acc, ll, baseline_acc, stability


def _daily_stability_metrics(eval_df: pd.DataFrame, y_pred: np.ndarray) -> dict[str, Any]:
    if eval_df.empty:
        return {
            "daily_acc_mean": np.nan,
            "daily_acc_median": np.nan,
            "daily_acc_std": np.nan,
            "daily_acc_p10": np.nan,
            "daily_acc_p90": np.nan,
            "daily_days": 0,
            "daily_matches_median": np.nan,
            "robust_score": np.nan,
        }

    date_col = "issue_date" if "issue_date" in eval_df.columns else "match_date"
    if date_col not in eval_df.columns:
        return {
            "daily_acc_mean": np.nan,
            "daily_acc_median": np.nan,
            "daily_acc_std": np.nan,
            "daily_acc_p10": np.nan,
            "daily_acc_p90": np.nan,
            "daily_days": 0,
            "daily_matches_median": np.nan,
            "robust_score": np.nan,
        }

    daily = pd.DataFrame(
        {
            "day": eval_df[date_col].astype(str),
            "correct": (eval_df["target"].astype(str).to_numpy() == np.asarray(y_pred).astype(str)),
        }
    )
    grp = daily.groupby("day", as_index=False).agg(acc=("correct", "mean"), n=("correct", "size"))
    if grp.empty:
        return {
            "daily_acc_mean": np.nan,
            "daily_acc_median": np.nan,
            "daily_acc_std": np.nan,
            "daily_acc_p10": np.nan,
            "daily_acc_p90": np.nan,
            "daily_days": 0,
            "daily_matches_median": np.nan,
            "robust_score": np.nan,
        }

    acc_series = grp["acc"].astype(float)
    std = float(acc_series.std(ddof=0))
    mean = float(acc_series.mean())
    median = float(acc_series.median())
    p10 = float(acc_series.quantile(0.10))
    p90 = float(acc_series.quantile(0.90))
    robust = mean - 0.35 * std
    return {
        "daily_acc_mean": mean,
        "daily_acc_median": median,
        "daily_acc_std": std,
        "daily_acc_p10": p10,
        "daily_acc_p90": p90,
        "daily_days": int(len(grp)),
        "daily_matches_median": float(grp["n"].median()),
        "robust_score": robust,
    }


def _train_once_on_df(
    df: pd.DataFrame,
    feature_groups: list[str],
    numeric_cols: list[str],
    categorical_cols: list[str],
    train_start_date: str,
    finished_samples_total: int,
    train_limit: int | None,
    split_ratio: float = 0.8,
    weighted: bool = True,
    model_family: str = "logreg",
) -> tuple[dict[str, Any], dict[str, Any]]:
    if len(df) < 2:
        raise RuntimeError("Not enough rows to split train/test.")

    split_idx = int(len(df) * split_ratio)
    split_idx = min(max(split_idx, 1), len(df) - 1)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    model, classes = _fit_model(
        train_df=train_df,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        weighted=weighted,
        model_family=model_family,
    )
    acc, ll, baseline_acc, stability = _evaluate_model(
        model=model,
        eval_df=test_df,
        classes=classes,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
    )
    robust = _safe_metric_value(stability.get("robust_score"))
    balanced_score = float(acc) if np.isnan(robust) else float(0.65 * acc + 0.35 * robust)

    artifact = {
        "model": model,
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "feature_groups": feature_groups,
        "model_family": model_family,
        "trained_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "train_size": int(len(train_df)),
        "test_size": int(len(test_df)),
        "classes": classes,
        "metrics": {
            "accuracy": acc,
            "log_loss": ll,
            "baseline_accuracy": baseline_acc,
            "balanced_score": balanced_score,
            **stability,
        },
        "train_start_date": train_start_date,
        "train_limit": train_limit,
        "split_ratio": split_ratio,
        "weighted_training": weighted,
        "weighting_strategy": "confidence+recency+class_balance" if weighted else "none",
        "model_family": model_family,
        "samples_used": int(len(df)),
        "finished_samples_total": int(finished_samples_total),
    }

    summary = {
        "train_size": int(len(train_df)),
        "test_size": int(len(test_df)),
        "accuracy": acc,
        "log_loss": ll,
        "baseline_accuracy": baseline_acc,
        "balanced_score": balanced_score,
        "daily_acc_mean": stability.get("daily_acc_mean"),
        "daily_acc_median": stability.get("daily_acc_median"),
        "daily_acc_std": stability.get("daily_acc_std"),
        "daily_acc_p10": stability.get("daily_acc_p10"),
        "daily_acc_p90": stability.get("daily_acc_p90"),
        "robust_score": stability.get("robust_score"),
        "daily_days": stability.get("daily_days"),
        "classes": classes,
        "finished_samples_total": int(finished_samples_total),
        "samples_used": int(len(df)),
        "train_limit": train_limit,
        "split_ratio": split_ratio,
        "weighted_training": weighted,
        "weighting_strategy": "confidence+recency+class_balance" if weighted else "none",
        "model_family": model_family,
        "feature_groups": feature_groups,
        "feature_count": len(numeric_cols + categorical_cols),
    }
    return artifact, summary


def train_model(
    db_path: str | None = None,
    model_path: str | None = None,
    min_samples: int = 300,
    train_start_date: str | None = None,
    replace_if_better: bool = False,
    feature_groups: list[str] | None = None,
    train_limit: int | None = None,
    split_ratio: float = 0.8,
    weighted: bool = True,
    model_family: str = "auto",
) -> dict[str, Any]:
    effective_start = train_start_date or SETTINGS.train_start_date
    feature_groups = _normalize_feature_groups(feature_groups, model_path=model_path)
    selected_model_family = _normalize_model_family(model_family)
    numeric_cols, categorical_cols = _resolve_feature_columns(feature_groups)
    if not numeric_cols and not categorical_cols:
        raise RuntimeError("Selected feature groups produced empty feature columns.")

    df_all = _prepare_training_dataframe(
        db_path=db_path,
        train_start_date=effective_start,
    )
    finished_samples_total = len(df_all)
    df = _apply_train_limit(df_all, train_limit=train_limit)
    if len(df) < min_samples:
        raise RuntimeError(f"Not enough samples for training: {len(df)} < {min_samples}")

    artifact, summary = _train_once_on_df(
        df=df,
        feature_groups=feature_groups,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        train_start_date=effective_start,
        finished_samples_total=finished_samples_total,
        train_limit=train_limit,
        split_ratio=split_ratio,
        weighted=weighted,
        model_family=selected_model_family,
    )

    model_path = model_path or SETTINGS.model_path
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    old_artifact = load_model_artifact(model_path)
    model_updated = True
    replace_reason = "force_replace"
    if replace_if_better:
        model_updated, replace_reason = _is_better_model(artifact, old_artifact)
    if model_updated:
        joblib.dump(artifact, model_path)

    summary["model_path"] = model_path
    summary["model_updated"] = model_updated
    summary["replace_reason"] = replace_reason
    return summary


def optimize_model(
    db_path: str | None = None,
    model_path: str | None = None,
    train_start_date: str | None = None,
    min_samples: int = 100,
    capacities: list[int | None] | None = None,
    feature_group_candidates: list[str] | None = None,
    split_ratio_candidates: list[float] | None = None,
    validation_size: int = 3000,
    weighted: bool | None = True,
    model_candidates: list[str] | None = None,
    search_mode: str = "standard",
) -> dict[str, Any]:
    effective_start = train_start_date or SETTINGS.train_start_date
    model_path = model_path or SETTINGS.model_path

    mode = search_mode.strip().lower()
    if mode not in {"fast", "standard", "full"}:
        raise RuntimeError("search_mode must be one of: fast, standard, full")
    weighted_options = [weighted] if isinstance(weighted, bool) else [True, False]

    if mode == "fast":
        raw_caps = capacities or [1500, 3000, 5000]
    elif mode == "full":
        raw_caps = capacities or [1000, 1500, 2000, 3000, 5000, None]
    else:
        raw_caps = capacities or [1500, 3000, 5000, None]
    normalized_caps: list[int | None] = []
    seen: set[int | None] = set()
    for cap in raw_caps:
        v = None if cap is None else int(cap)
        if v is not None and v <= 0:
            continue
        if v not in seen:
            normalized_caps.append(v)
            seen.add(v)
    if not normalized_caps:
        raise RuntimeError("No valid capacities configured for optimize_model.")

    candidate_groups = feature_group_candidates or list(DEFAULT_FEATURE_GROUPS)
    candidate_groups = [g for g in candidate_groups if g in FEATURE_GROUPS]
    if not candidate_groups:
        raise RuntimeError("No valid feature groups for optimize_model.")
    if model_candidates:
        candidate_models = _normalize_model_candidates(model_candidates)
    elif mode == "fast":
        candidate_models = _default_fast_model_candidates(model_path=model_path)
    elif mode == "full":
        candidate_models = _normalize_model_candidates(None)
    else:
        candidate_models = _normalize_model_candidates(["logreg", "catboost", "lightgbm", "hgbt"])

    if mode == "fast":
        raw_ratios = split_ratio_candidates or [0.8]
    elif mode == "full":
        raw_ratios = split_ratio_candidates or [0.7, 0.75, 0.8]
    else:
        raw_ratios = split_ratio_candidates or [0.75, 0.8]
    ratios: list[float] = []
    seen_ratio: set[float] = set()
    for ratio in raw_ratios:
        r = float(ratio)
        if r <= 0.5 or r >= 0.95:
            continue
        if r not in seen_ratio:
            ratios.append(r)
            seen_ratio.add(r)
    if not ratios:
        raise RuntimeError("No valid split ratios configured for optimize_model.")

    combos = _resolve_feature_group_combos(candidate_groups, search_mode=mode)

    df_all = _prepare_training_dataframe(db_path=db_path, train_start_date=effective_start)
    finished_samples_total = len(df_all)
    max_holdout = len(df_all) - min_samples
    if max_holdout < 100:
        raise RuntimeError("Not enough total data for robust optimize validation split.")
    holdout = min(validation_size, max_holdout)
    holdout = max(200, holdout) if max_holdout >= 200 else max_holdout

    train_pool = df_all.iloc[:-holdout].copy().reset_index(drop=True)
    fixed_eval = df_all.iloc[-holdout:].copy().reset_index(drop=True)
    if len(train_pool) < min_samples:
        raise RuntimeError("Training pool is too small after reserving fixed validation data.")

    trials: list[dict[str, Any]] = []
    best_summary: dict[str, Any] | None = None
    best_trial: dict[str, Any] | None = None

    for groups in combos:
        numeric_cols, categorical_cols = _resolve_feature_columns(groups)
        if not numeric_cols and not categorical_cols:
            continue
        for cap in normalized_caps:
            source_df = _apply_train_limit(train_pool, train_limit=cap)
            if len(source_df) < min_samples:
                continue
            for split_ratio in ratios:
                split_idx = int(len(source_df) * split_ratio)
                split_idx = min(max(split_idx, 1), len(source_df) - 1)
                train_df = source_df.iloc[:split_idx].copy()
                if len(train_df) < min_samples:
                    continue
                for model_family in candidate_models:
                    for weighted_flag in weighted_options:
                        try:
                            model, classes = _fit_model(
                                train_df=train_df,
                                numeric_cols=numeric_cols,
                                categorical_cols=categorical_cols,
                                weighted=weighted_flag,
                                model_family=model_family,
                            )
                            acc, ll, baseline_acc, stability = _evaluate_model(
                                model=model,
                                eval_df=fixed_eval,
                                classes=classes,
                                numeric_cols=numeric_cols,
                                categorical_cols=categorical_cols,
                            )
                        except Exception:
                            continue

                        trial = {
                            "feature_groups": groups,
                            "train_limit": cap,
                            "split_ratio": split_ratio,
                            "weighted_training": weighted_flag,
                            "weighting_strategy": "confidence+recency+class_balance" if weighted_flag else "none",
                            "model_family": model_family,
                            "samples_used": int(len(source_df)),
                            "train_size": int(len(train_df)),
                            "test_size": int(len(fixed_eval)),
                            "accuracy": acc,
                            "log_loss": ll,
                            "baseline_accuracy": baseline_acc,
                            "daily_acc_mean": stability.get("daily_acc_mean"),
                            "daily_acc_median": stability.get("daily_acc_median"),
                            "daily_acc_std": stability.get("daily_acc_std"),
                            "daily_acc_p10": stability.get("daily_acc_p10"),
                            "daily_acc_p90": stability.get("daily_acc_p90"),
                            "daily_days": stability.get("daily_days"),
                            "daily_matches_median": stability.get("daily_matches_median"),
                            "robust_score": stability.get("robust_score"),
                            "feature_count": len(numeric_cols + categorical_cols),
                        }
                        trial["balanced_score"] = float(_trial_balanced_score(trial))
                        trials.append(trial)

                        if _is_trial_better(trial, best_summary):
                            best_summary = trial
                            best_trial = {
                                "feature_groups": groups,
                                "train_limit": cap,
                                "split_ratio": split_ratio,
                                "model_family": model_family,
                                "weighted_training": weighted_flag,
                                "numeric_cols": numeric_cols,
                                "categorical_cols": categorical_cols,
                            }

    if not trials or best_summary is None or best_trial is None:
        raise RuntimeError("optimize_model did not find a valid training candidate.")

    final_df = _apply_train_limit(df_all, train_limit=best_trial["train_limit"])
    final_model, final_classes = _fit_model(
        train_df=final_df,
        numeric_cols=best_trial["numeric_cols"],
        categorical_cols=best_trial["categorical_cols"],
        weighted=bool(best_trial["weighted_training"]),
        model_family=best_trial["model_family"],
    )
    # Keep selection metrics from fixed holdout before refit to avoid optimistic bias.
    final_acc = float(best_summary.get("accuracy"))
    final_ll = float(best_summary.get("log_loss"))
    final_baseline = float(best_summary.get("baseline_accuracy"))
    final_stability = {
        "daily_acc_mean": best_summary.get("daily_acc_mean"),
        "daily_acc_median": best_summary.get("daily_acc_median"),
        "daily_acc_std": best_summary.get("daily_acc_std"),
        "daily_acc_p10": best_summary.get("daily_acc_p10"),
        "daily_acc_p90": best_summary.get("daily_acc_p90"),
        "daily_days": best_summary.get("daily_days"),
        "daily_matches_median": best_summary.get("daily_matches_median"),
        "robust_score": best_summary.get("robust_score"),
    }

    artifact = {
        "model": final_model,
        "numeric_cols": best_trial["numeric_cols"],
        "categorical_cols": best_trial["categorical_cols"],
        "feature_groups": best_trial["feature_groups"],
        "trained_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "train_size": int(len(final_df)),
        "test_size": int(len(fixed_eval)),
        "classes": final_classes,
        "metrics": {
            "accuracy": float(final_acc),
            "log_loss": float(final_ll),
            "baseline_accuracy": float(final_baseline),
            "balanced_score": float(_trial_balanced_score(best_summary)),
            **final_stability,
        },
        "train_start_date": effective_start,
        "train_limit": best_trial["train_limit"],
        "split_ratio": best_trial["split_ratio"],
        "model_family": best_trial["model_family"],
        "weighted_training": bool(best_trial["weighted_training"]),
        "weighting_strategy": (
            "confidence+recency+class_balance" if bool(best_trial["weighted_training"]) else "none"
        ),
        "samples_used": int(len(final_df)),
        "finished_samples_total": int(finished_samples_total),
        "validation_size": int(len(fixed_eval)),
        "metrics_source": "fixed_holdout_before_refit",
    }

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(artifact, model_path)

    leaderboard = sorted(
        trials,
        key=lambda x: (
            -_safe_metric_value(_trial_balanced_score(x)),
            -_safe_metric_value(x.get("accuracy")),
            _safe_metric_value(x.get("log_loss")),
        ),
    )[:15]

    best_summary = {
        "feature_groups": best_trial["feature_groups"],
        "train_limit": best_trial["train_limit"],
        "split_ratio": best_trial["split_ratio"],
        "model_family": best_trial["model_family"],
        "weighted_training": bool(best_trial["weighted_training"]),
        "weighting_strategy": (
            "confidence+recency+class_balance" if bool(best_trial["weighted_training"]) else "none"
        ),
        "samples_used": int(len(final_df)),
        "train_size": int(len(final_df)),
        "test_size": int(len(fixed_eval)),
        "accuracy": float(final_acc),
        "log_loss": float(final_ll),
        "baseline_accuracy": float(final_baseline),
        "balanced_score": float(_trial_balanced_score(best_summary)),
        "daily_acc_mean": final_stability.get("daily_acc_mean"),
        "daily_acc_median": final_stability.get("daily_acc_median"),
        "daily_acc_std": final_stability.get("daily_acc_std"),
        "daily_acc_p10": final_stability.get("daily_acc_p10"),
        "daily_acc_p90": final_stability.get("daily_acc_p90"),
        "daily_days": final_stability.get("daily_days"),
        "robust_score": final_stability.get("robust_score"),
        "feature_count": len(best_trial["numeric_cols"] + best_trial["categorical_cols"]),
        "finished_samples_total": int(finished_samples_total),
        "model_path": model_path,
        "model_updated": True,
        "replace_reason": "optimized_best_trial_fixed_holdout",
    }

    return {
        "evaluated": len(trials),
        "search_space": {
            "search_mode": mode,
            "feature_group_candidates": candidate_groups,
            "feature_group_combinations": len(combos),
            "capacities": normalized_caps,
            "split_ratios": ratios,
            "model_candidates": candidate_models,
            "weighted_candidates": weighted_options,
            "validation_size": int(len(fixed_eval)),
        },
        "best": best_summary,
        "leaderboard": leaderboard,
    }


def predict_by_date(
    target_date: str | None = None,
    db_path: str | None = None,
    model_path: str | None = None,
    ticket_type: str = "ALL",
    history_days: int = 730,
) -> list[dict[str, Any]]:
    target_date = target_date or date.today().isoformat()

    target_dt = datetime.strptime(target_date, "%Y-%m-%d").date()
    start_dt = target_dt - timedelta(days=history_days)
    day_rows = fetch_matches_by_issue_date(
        db_path=db_path,
        issue_date=target_date,
        ticket_type=ticket_type,
    )
    if not day_rows:
        # fallback for old rows without issue_date
        day_rows = fetch_matches(
            db_path=db_path,
            start_date=target_date,
            end_date=target_date,
        )
        if ticket_type in {"JCZQ", "BJDC"}:
            day_rows = [r for r in day_rows if (r.get("ticket_type") or "ALL") == ticket_type]
    if not day_rows:
        return []

    teams = sorted(
        {
            t
            for r in day_rows
            for t in (r.get("home_team"), r.get("away_team"))
            if t
        }
    )
    history_rows = fetch_team_history_matches(
        db_path=db_path,
        start_date=start_dt.isoformat(),
        end_date=target_date,
        teams=teams,
    )

    # Use historical completed matches + today's matches.
    merged: dict[int, dict[str, Any]] = {}
    for r in history_rows:
        mid = r.get("match_id")
        if mid is not None:
            merged[int(mid)] = r
    for r in day_rows:
        mid = r.get("match_id")
        if mid is not None:
            merged[int(mid)] = r

    df = build_feature_frame(list(merged.values()))
    if df.empty:
        return []

    artifact = joblib.load(model_path or SETTINGS.model_path)
    model: Pipeline = artifact["model"]
    numeric_cols = artifact["numeric_cols"]
    categorical_cols = artifact["categorical_cols"]

    day_ids = {int(r["match_id"]) for r in day_rows if r.get("match_id") is not None}
    day_df = df[df["match_id"].isin(day_ids)].copy()
    if day_df.empty:
        return []

    X = day_df[numeric_cols + categorical_cols]
    proba = model.predict_proba(X)
    classes = list(model.named_steps["clf"].classes_)

    out: list[dict[str, Any]] = []
    for i, (_, row) in enumerate(day_df.iterrows()):
        class_prob = {c: float(proba[i][j]) for j, c in enumerate(classes)}
        out.append(
            {
                "match_id": int(row["match_id"]),
                "match_date": row["match_date"],
                "match_time": row["match_time"],
                "league_id": row["league_id"],
                "league_name": row.get("league_name"),
                "match_no_cn": row.get("match_no_cn"),
                "ticket_type": row.get("ticket_type", "ALL"),
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "odds_win": row["odds_win"],
                "odds_draw": row["odds_draw"],
                "odds_lose": row["odds_lose"],
                "prob_home": class_prob.get("H", 0.0),
                "prob_draw": class_prob.get("D", 0.0),
                "prob_away": class_prob.get("A", 0.0),
                "actual": row["target"],
                "finished": bool(row["finished"]),
            }
        )

    def _sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
        code = str(item.get("match_no_cn") or "")
        m = re.search(r"(\d+)$", code)
        if m:
            return (0, int(m.group(1)), item.get("match_time") or "", item["match_id"])
        return (1, item.get("match_time") or "", item["match_id"])

    out.sort(key=_sort_key)
    return out
