from __future__ import annotations

import json
import re
import time
from datetime import datetime
from typing import Any

import requests

from soccer_predictor.config import SETTINGS


RESULT_MAP = {
    "3": "H",
    "1": "D",
    "0": "A",
}


class TTYingQiuClient:
    def __init__(self, timeout: int = 20):
        self.timeout = timeout
        self.session = requests.Session()

    def fetch_matches_by_date(
        self,
        date: str,
        game: int = 0,
        page_size: int = 200,
    ) -> list[dict[str, Any]]:
        # page_size 保留以兼容旧调用签名（静态 JSON 不分页）
        _ = page_size
        if game == 407:
            return self.fetch_ticket_matches_by_date(date, "JCZQ")
        if game == 408:
            return self.fetch_ticket_matches_by_date(date, "BJDC")
        if game == 0:
            out = self.fetch_ticket_matches_by_date(date, "JCZQ")
            out.extend(self.fetch_ticket_matches_by_date(date, "BJDC"))
            merged: dict[int, dict[str, Any]] = {}
            for row in out:
                mid = row.get("match_id")
                if mid is None:
                    continue
                merged[mid] = row
            # ALL 视图使用两种彩票赛事并集
            for row in merged.values():
                row["ticket_type"] = "ALL"
            return list(merged.values())
        return []

    def fetch_ticket_matches_by_date(self, date: str, ticket_type: str) -> list[dict[str, Any]]:
        url = self._build_static_url(date, ticket_type)
        data = self._get_json(url)
        matches = data.get("matchList", []) or []
        return [self._normalize_match(m, ticket_type=ticket_type, issue_date=date) for m in matches]

    def _build_static_url(self, date: str, ticket_type: str) -> str:
        if ticket_type == "JCZQ":
            base = SETTINGS.tty_jczq_static_url.format(date=date)
        elif ticket_type == "BJDC":
            base = SETTINGS.tty_bd_static_url.format(date=date)
        else:
            raise ValueError(f"Unsupported ticket_type: {ticket_type}")
        return f"{base}?v={int(time.time() * 1000)}"

    def _get_json(self, url: str) -> dict[str, Any]:
        resp = self.session.get(
            url,
            timeout=self.timeout,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json,text/plain,*/*",
                "Referer": "https://www.ttyingqiu.com/",
            },
        )
        if resp.status_code == 404:
            return {}
        resp.raise_for_status()
        text = (resp.text or "").strip()
        if not text:
            return {}
        try:
            return resp.json()
        except ValueError:
            # 兼容 JSONP 场景
            matched = re.search(r"(\{.*\})", text, re.S)
            if not matched:
                return {}
            return json.loads(matched.group(1))

    def _normalize_match(
        self,
        row: dict[str, Any],
        ticket_type: str,
        issue_date: str,
    ) -> dict[str, Any]:
        eu1, eu2, eu3 = _parse_triplet(row.get("oddsEurope"))
        a1, a_line, a2 = _parse_triplet(row.get("oddsAsia"))
        o1, o_line, o2 = _parse_triplet(row.get("bigsmall"))

        score = row.get("score") or []
        score_ht = score[0] if len(score) > 0 else None
        score_ft = score[1] if len(score) > 1 else None

        status = _safe_int(row.get("status"))
        match_result = _derive_result(row.get("matchResult"), score_ft, status)

        return {
            "match_id": _safe_int(row.get("matchId")),
            "qt_match_id": _safe_int(row.get("qtMatchId")),
            "issue_date": issue_date,
            "match_date": row.get("matchDate") or issue_date,
            "match_time": row.get("matchTime"),
            "league_id": _safe_int(row.get("leagueId")),
            "league_name": row.get("leagueName"),
            "match_no_cn": row.get("matchNoCn"),
            "ticket_type": ticket_type,
            "home_team": row.get("homeName"),
            "away_team": row.get("awayName"),
            "odds_win": eu1,
            "odds_draw": eu2,
            "odds_lose": eu3,
            "asia_home_odds": a1,
            "asia_handicap": a_line,
            "asia_away_odds": a2,
            "ou_over_odds": o1,
            "ou_line": o_line,
            "ou_under_odds": o2,
            "score_ht": score_ht,
            "score_ft": score_ft,
            "match_result": match_result,
            "status": status,
            "updated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        }


def _derive_result(raw_result: Any, score_ft: str | None, status: int | None) -> str | None:
    if raw_result is not None:
        mapped = RESULT_MAP.get(str(raw_result))
        if mapped:
            return mapped
    if status != 2 or not score_ft:
        return None
    if ":" not in score_ft:
        return None
    left, right = score_ft.split(":", 1)
    try:
        hg = int(left)
        ag = int(right)
    except Exception:
        return None
    if hg > ag:
        return "H"
    if hg < ag:
        return "A"
    return "D"


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        sval = str(val).strip()
        if sval == "" or sval == ";;":
            return None
        return float(sval)
    except Exception:
        return None


def _safe_int(val: Any) -> int | None:
    try:
        if val is None or str(val).strip() == "":
            return None
        return int(val)
    except Exception:
        return None


def _parse_triplet(raw: Any) -> tuple[float | None, str | None, float | None]:
    if not raw:
        return None, None, None
    parts = str(raw).split(";")
    if len(parts) != 3:
        return None, None, None
    return _safe_float(parts[0]), parts[1].strip() or None, _safe_float(parts[2])
