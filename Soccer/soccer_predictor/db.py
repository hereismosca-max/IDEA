from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Iterable

from soccer_predictor.config import SETTINGS


@contextmanager
def get_conn(db_path: str | None = None):
    path = db_path or SETTINGS.db_path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: str | None = None) -> None:
    with get_conn(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS matches (
                match_id INTEGER PRIMARY KEY,
                qt_match_id INTEGER,
                issue_date TEXT,
                match_date TEXT NOT NULL,
                match_time TEXT,
                league_id INTEGER,
                league_name TEXT,
                match_no_cn TEXT,
                ticket_type TEXT,
                home_team TEXT,
                away_team TEXT,
                odds_win REAL,
                odds_draw REAL,
                odds_lose REAL,
                asia_home_odds REAL,
                asia_handicap TEXT,
                asia_away_odds REAL,
                ou_over_odds REAL,
                ou_line TEXT,
                ou_under_odds REAL,
                score_ht TEXT,
                score_ft TEXT,
                match_result TEXT,
                status INTEGER,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id)"
        )
        _ensure_column(conn, "matches", "match_no_cn", "TEXT")
        _ensure_column(conn, "matches", "ticket_type", "TEXT")
        _ensure_column(conn, "matches", "issue_date", "TEXT")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_matches_issue_date ON matches(issue_date)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_matches_ticket_type ON matches(ticket_type)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS match_views (
                match_id INTEGER NOT NULL,
                issue_date TEXT NOT NULL,
                ticket_type TEXT NOT NULL,
                match_no_cn TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (match_id, issue_date, ticket_type)
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_match_views_issue_ticket ON match_views(issue_date, ticket_type)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_match_views_match_id ON match_views(match_id)"
        )
        _backfill_match_views_if_empty(conn)


def _ensure_column(conn: sqlite3.Connection, table: str, name: str, ctype: str) -> None:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    if any(c[1] == name for c in cols):
        return
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ctype}")


def _backfill_match_views_if_empty(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) FROM match_views").fetchone()[0]
    if count:
        return
    conn.execute(
        """
        INSERT OR IGNORE INTO match_views (match_id, issue_date, ticket_type, match_no_cn, updated_at)
        SELECT
            match_id,
            COALESCE(issue_date, match_date),
            COALESCE(ticket_type, 'ALL'),
            match_no_cn,
            updated_at
        FROM matches
        WHERE match_id IS NOT NULL
          AND COALESCE(issue_date, match_date) IS NOT NULL
        """
    )


def upsert_matches(rows: Iterable[dict[str, Any]], db_path: str | None = None) -> int:
    rows = list(rows)
    if not rows:
        return 0

    cols = [
        "match_id",
        "qt_match_id",
        "issue_date",
        "match_date",
        "match_time",
        "league_id",
        "league_name",
        "match_no_cn",
        "ticket_type",
        "home_team",
        "away_team",
        "odds_win",
        "odds_draw",
        "odds_lose",
        "asia_home_odds",
        "asia_handicap",
        "asia_away_odds",
        "ou_over_odds",
        "ou_line",
        "ou_under_odds",
        "score_ht",
        "score_ft",
        "match_result",
        "status",
        "updated_at",
    ]

    placeholders = ",".join(["?"] * len(cols))
    set_parts: list[str] = []
    for c in cols:
        if c == "match_id":
            continue
        if c == "match_no_cn":
            set_parts.append("match_no_cn=COALESCE(excluded.match_no_cn,matches.match_no_cn)")
            continue
        if c == "ticket_type":
            set_parts.append(
                "ticket_type=CASE "
                "WHEN excluded.ticket_type='ALL' AND matches.ticket_type IN ('JCZQ','BJDC') "
                "THEN matches.ticket_type ELSE excluded.ticket_type END"
            )
            continue
        if c == "issue_date":
            set_parts.append(
                "issue_date=CASE "
                "WHEN excluded.ticket_type='ALL' AND matches.ticket_type IN ('JCZQ','BJDC') "
                "THEN COALESCE(matches.issue_date, excluded.issue_date) "
                "WHEN excluded.ticket_type IN ('JCZQ','BJDC') "
                "AND matches.ticket_type=excluded.ticket_type "
                "AND matches.issue_date IS NOT NULL AND excluded.issue_date IS NOT NULL "
                "THEN CASE WHEN excluded.issue_date < matches.issue_date "
                "THEN excluded.issue_date ELSE matches.issue_date END "
                "ELSE excluded.issue_date END"
            )
            continue
        set_parts.append(f"{c}=excluded.{c}")

    set_clause = ",".join(set_parts)

    with get_conn(db_path) as conn:
        conn.executemany(
            f"""
            INSERT INTO matches ({','.join(cols)})
            VALUES ({placeholders})
            ON CONFLICT(match_id) DO UPDATE SET {set_clause}
            """,
            [tuple(r.get(c) for c in cols) for r in rows],
        )
        view_rows = []
        for r in rows:
            match_id = r.get("match_id")
            issue_date = r.get("issue_date") or r.get("match_date")
            if match_id is None or issue_date is None:
                continue
            view_rows.append(
                (
                    match_id,
                    issue_date,
                    r.get("ticket_type") or "ALL",
                    r.get("match_no_cn"),
                    r.get("updated_at") or "",
                )
            )
        if view_rows:
            # 同时写入 ALL 视图，避免 UI “全部比赛”再次从大库过滤
            all_view_rows = []
            for (match_id, issue_date, ticket_type, match_no_cn, updated_at) in view_rows:
                all_view_rows.append((match_id, issue_date, "ALL", match_no_cn, updated_at))
            view_rows.extend(all_view_rows)
            conn.executemany(
                """
                INSERT INTO match_views (match_id, issue_date, ticket_type, match_no_cn, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(match_id, issue_date, ticket_type) DO UPDATE SET
                    match_no_cn=COALESCE(excluded.match_no_cn, match_views.match_no_cn),
                    updated_at=excluded.updated_at
                """,
                view_rows,
            )
    return len(rows)


def reset_db(db_path: str | None = None) -> dict[str, int]:
    init_db(db_path)
    with get_conn(db_path) as conn:
        before_matches = conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
        before_views = conn.execute("SELECT COUNT(*) FROM match_views").fetchone()[0]
        conn.execute("DELETE FROM match_views")
        conn.execute("DELETE FROM matches")
    return {"matches_deleted": int(before_matches), "views_deleted": int(before_views)}


def fetch_matches(
    db_path: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    with_result_only: bool = False,
) -> list[dict[str, Any]]:
    where = []
    params: list[Any] = []

    if start_date:
        where.append("match_date >= ?")
        params.append(start_date)
    if end_date:
        where.append("match_date <= ?")
        params.append(end_date)
    if with_result_only:
        where.append("match_result IN ('H','D','A')")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    with get_conn(db_path) as conn:
        rows = conn.execute(
            f"""
            SELECT *
            FROM matches
            {where_sql}
            ORDER BY match_date, match_time, match_id
            """,
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def fetch_matches_by_date(db_path: str | None, date: str) -> list[dict[str, Any]]:
    return fetch_matches(db_path=db_path, start_date=date, end_date=date)


def count_finished_matches(
    db_path: str | None = None,
    start_date: str | None = None,
) -> int:
    where = ["match_result IN ('H','D','A')"]
    params: list[Any] = []
    if start_date:
        where.append("match_date >= ?")
        params.append(start_date)
    where_sql = f"WHERE {' AND '.join(where)}"

    with get_conn(db_path) as conn:
        row = conn.execute(
            f"SELECT COUNT(*) AS n FROM matches {where_sql}",
            params,
        ).fetchone()
    return int(row["n"] if row else 0)


def fetch_matches_by_issue_date(
    db_path: str | None,
    issue_date: str,
    ticket_type: str = "ALL",
) -> list[dict[str, Any]]:
    view_ticket = ticket_type if ticket_type in {"JCZQ", "BJDC"} else "ALL"
    params: list[Any] = [issue_date, view_ticket]

    with get_conn(db_path) as conn:
        rows = conn.execute(
            """
            SELECT
                m.match_id,
                m.qt_match_id,
                v.issue_date AS issue_date,
                m.match_date,
                m.match_time,
                m.league_id,
                m.league_name,
                v.match_no_cn AS match_no_cn,
                v.ticket_type AS ticket_type,
                m.home_team,
                m.away_team,
                m.odds_win,
                m.odds_draw,
                m.odds_lose,
                m.asia_home_odds,
                m.asia_handicap,
                m.asia_away_odds,
                m.ou_over_odds,
                m.ou_line,
                m.ou_under_odds,
                m.score_ht,
                m.score_ft,
                m.match_result,
                m.status,
                m.updated_at
            FROM match_views v
            JOIN matches m ON m.match_id = v.match_id
            WHERE v.issue_date = ?
              AND v.ticket_type = ?
            ORDER BY m.match_time, m.match_id
            """,
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def fetch_team_history_matches(
    db_path: str | None,
    start_date: str,
    end_date: str,
    teams: list[str],
) -> list[dict[str, Any]]:
    if not teams:
        return []

    placeholders = ",".join(["?"] * len(teams))
    params: list[Any] = [start_date, end_date, *teams, *teams]

    with get_conn(db_path) as conn:
        rows = conn.execute(
            f"""
            SELECT *
            FROM matches
            WHERE match_date >= ?
              AND match_date <= ?
              AND match_result IN ('H','D','A')
              AND (home_team IN ({placeholders}) OR away_team IN ({placeholders}))
            ORDER BY match_date, match_time, match_id
            """,
            params,
        ).fetchall()
    return [dict(r) for r in rows]
