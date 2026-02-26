from __future__ import annotations

from apscheduler.schedulers.blocking import BlockingScheduler

from soccer_predictor.config import SETTINGS
from soccer_predictor.db import count_finished_matches, init_db
from soccer_predictor.model import load_model_artifact, optimize_model
from soccer_predictor.pipeline import sync_recent


def hourly_sync() -> int:
    # 高频只做数据更新，避免模型被噪音高频重写
    return sync_recent(days_back=2, days_forward=2)


def daily_retrain_if_needed() -> dict:
    # 先补齐近两周数据，再评估是否值得重训
    upserted = sync_recent(days_back=14, days_forward=2)

    start_date = SETTINGS.train_start_date
    finished_total = count_finished_matches(start_date=start_date)
    old = load_model_artifact()
    old_total = int(
        (old or {}).get("finished_samples_total")
        or ((old or {}).get("train_size") or 0) + ((old or {}).get("test_size") or 0)
    )
    new_samples = max(0, finished_total - old_total)

    threshold = SETTINGS.retrain_min_new_samples
    if old and new_samples < threshold:
        return {
            "skipped": True,
            "reason": "not_enough_new_samples",
            "new_samples": new_samples,
            "threshold": threshold,
            "finished_total": finished_total,
            "upserted": upserted,
        }

    metrics = optimize_model(
        min_samples=300,
        train_start_date=start_date,
        validation_size=3000,
        weighted=None,
        search_mode="fast",
    )
    return {
        "skipped": False,
        "upserted": upserted,
        "new_samples": new_samples,
        "threshold": threshold,
        "finished_total": finished_total,
        "train": metrics,
    }


def _safe_run_hourly() -> None:
    try:
        out = hourly_sync()
        print(f"[hourly_sync] upserted={out}")
    except Exception as exc:
        print(f"[hourly_sync] error={exc}")


def _safe_run_daily_retrain() -> None:
    try:
        out = daily_retrain_if_needed()
        print(f"[daily_retrain] {out}")
    except Exception as exc:
        print(f"[daily_retrain] error={exc}")


def main() -> None:
    init_db()

    scheduler = BlockingScheduler(timezone=SETTINGS.market_timezone)
    scheduler.add_job(_safe_run_hourly, "interval", hours=1, id="hourly_sync")
    scheduler.add_job(
        _safe_run_daily_retrain,
        "cron",
        hour=SETTINGS.retrain_hour_cn,
        minute=SETTINGS.retrain_minute_cn,
        id="daily_retrain",
    )

    _safe_run_hourly()
    scheduler.start()


if __name__ == "__main__":
    main()
