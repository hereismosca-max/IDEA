from __future__ import annotations

from datetime import date, datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from zoneinfo import ZoneInfo

from soccer_predictor.config import SETTINGS
from soccer_predictor.db import init_db, upsert_matches
from soccer_predictor.fetcher import TTYingQiuClient


def sync_date(target_date: str, db_path: str | None = None) -> int:
    init_db(db_path)
    client = TTYingQiuClient()
    rows = _fetch_and_merge_one_day(client, target_date)
    return upsert_matches(rows, db_path=db_path)


def sync_range(
    start_date: str,
    end_date: str,
    db_path: str | None = None,
    workers: int = 1,
) -> int:
    init_db(db_path)

    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    days: list[str] = []
    cur = start
    while cur <= end:
        days.append(cur.isoformat())
        cur += timedelta(days=1)

    total = 0
    if workers <= 1:
        client = TTYingQiuClient()
        for d in days:
            rows = _fetch_and_merge_one_day(client, d)
            total += upsert_matches(rows, db_path=db_path)
        return total

    local = threading.local()

    def _fetch_for_day(day: str) -> tuple[str, list[dict]]:
        if not hasattr(local, "client"):
            local.client = TTYingQiuClient()
        rows = _fetch_and_merge_one_day(local.client, day)
        return day, rows

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_fetch_for_day, d): d for d in days}
        for fut in as_completed(futures):
            _, rows = fut.result()
            total += upsert_matches(rows, db_path=db_path)
    return total


def sync_recent(
    days_back: int = 7,
    days_forward: int = 2,
    db_path: str | None = None,
    workers: int = 1,
) -> int:
    tz = ZoneInfo(SETTINGS.market_timezone)
    today = datetime.now(tz).date()
    start = today - timedelta(days=days_back)
    end = today + timedelta(days=days_forward)
    return sync_range(
        start.isoformat(),
        end.isoformat(),
        db_path=db_path,
        workers=workers,
    )


def _fetch_and_merge_one_day(client: TTYingQiuClient, day: str) -> list[dict]:
    # 项目范围先聚焦体彩两类：竞彩足球 + 北京单场
    rows_all: list[dict] = []
    for game in (407, 408):
        rows = client.fetch_matches_by_date(day, game=game)
        rows_all.extend(rows)
    return rows_all
