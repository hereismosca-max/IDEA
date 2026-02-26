from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import pandas as pd

from soccer_predictor.news_features import attach_news_features


@dataclass
class TeamState:
    points_recent: deque[int] = field(default_factory=lambda: deque(maxlen=5))
    gd_recent: deque[int] = field(default_factory=lambda: deque(maxlen=5))

    def points_avg(self) -> float:
        if not self.points_recent:
            return 0.0
        return float(sum(self.points_recent)) / len(self.points_recent)

    def gd_avg(self) -> float:
        if not self.gd_recent:
            return 0.0
        return float(sum(self.gd_recent)) / len(self.gd_recent)


def build_feature_frame(matches: list[dict[str, Any]]) -> pd.DataFrame:
    if not matches:
        return pd.DataFrame()

    rows = sorted(matches, key=_sort_key)
    team_state: dict[str, TeamState] = defaultdict(TeamState)

    out: list[dict[str, Any]] = []

    for m in rows:
        home = m.get("home_team")
        away = m.get("away_team")
        if not home or not away:
            continue

        odds_win = _to_float(m.get("odds_win"))
        odds_draw = _to_float(m.get("odds_draw"))
        odds_lose = _to_float(m.get("odds_lose"))

        implied_home, implied_draw, implied_away = _implied_probs(odds_win, odds_draw, odds_lose)

        hs = team_state[home]
        as_ = team_state[away]

        row = {
            "match_id": m.get("match_id"),
            "issue_date": m.get("issue_date") or m.get("match_date"),
            "match_date": m.get("match_date"),
            "match_time": m.get("match_time"),
            "league_id": str(m.get("league_id") or "unknown"),
            "league_name": m.get("league_name"),
            "match_no_cn": m.get("match_no_cn"),
            "ticket_type": (m.get("ticket_type") or "ALL"),
            "home_team": home,
            "away_team": away,
            "target": m.get("match_result"),
            "finished": m.get("match_result") in {"H", "D", "A"},
            "odds_win": odds_win,
            "odds_draw": odds_draw,
            "odds_lose": odds_lose,
            "implied_home": implied_home,
            "implied_draw": implied_draw,
            "implied_away": implied_away,
            "home_form_points5": hs.points_avg(),
            "away_form_points5": as_.points_avg(),
            "form_points_diff": hs.points_avg() - as_.points_avg(),
            "home_form_gd5": hs.gd_avg(),
            "away_form_gd5": as_.gd_avg(),
            "form_gd_diff": hs.gd_avg() - as_.gd_avg(),
            "asia_handicap_num": _parse_line(m.get("asia_handicap")),
            "ou_line_num": _parse_line(m.get("ou_line")),
            "asia_home_odds": _to_float(m.get("asia_home_odds")),
            "asia_away_odds": _to_float(m.get("asia_away_odds")),
            "ou_over_odds": _to_float(m.get("ou_over_odds")),
            "ou_under_odds": _to_float(m.get("ou_under_odds")),
        }
        out.append(row)

        _update_team_state(team_state, m)

    df = pd.DataFrame(out)
    df = attach_news_features(df)
    return df


def _update_team_state(team_state: dict[str, TeamState], m: dict[str, Any]) -> None:
    home = m.get("home_team")
    away = m.get("away_team")
    result = m.get("match_result")

    if not home or not away or result not in {"H", "D", "A"}:
        return

    home_points = 3 if result == "H" else 1 if result == "D" else 0
    away_points = 3 if result == "A" else 1 if result == "D" else 0

    hg, ag = _parse_score(m.get("score_ft"))
    if hg is None or ag is None:
        if result == "H":
            hg, ag = 1, 0
        elif result == "D":
            hg, ag = 0, 0
        else:
            hg, ag = 0, 1

    home_gd = hg - ag
    away_gd = ag - hg

    team_state[home].points_recent.append(home_points)
    team_state[away].points_recent.append(away_points)
    team_state[home].gd_recent.append(home_gd)
    team_state[away].gd_recent.append(away_gd)


def _sort_key(m: dict[str, Any]) -> tuple:
    d = m.get("match_date") or "1900-01-01"
    t = m.get("match_time") or "00:00"
    try:
        dt = datetime.strptime(f"{d} {t}", "%Y-%m-%d %H:%M")
    except Exception:
        dt = datetime.strptime(d, "%Y-%m-%d")
    return (dt, m.get("match_id") or 0)


def _parse_score(raw: Any) -> tuple[int | None, int | None]:
    if not raw or not isinstance(raw, str) or ":" not in raw:
        return None, None
    left, right = raw.split(":", 1)
    try:
        return int(left), int(right)
    except Exception:
        return None, None


def _implied_probs(
    odds_win: float | None,
    odds_draw: float | None,
    odds_lose: float | None,
) -> tuple[float, float, float]:
    if not odds_win or not odds_draw or not odds_lose:
        return 0.0, 0.0, 0.0
    inv = [1.0 / odds_win, 1.0 / odds_draw, 1.0 / odds_lose]
    total = sum(inv)
    if total <= 0:
        return 0.0, 0.0, 0.0
    return inv[0] / total, inv[1] / total, inv[2] / total


def _parse_line(raw: Any) -> float:
    if raw is None:
        return 0.0
    s = str(raw).strip()
    if not s:
        return 0.0
    s = s.replace("受", "-")
    sign = -1.0 if s.startswith("-") else 1.0
    s = s.lstrip("+-")

    parts = s.split("/")
    nums: list[float] = []
    for p in parts:
        try:
            nums.append(float(p))
        except Exception:
            pass
    if not nums:
        return 0.0
    return sign * (sum(nums) / len(nums))


def _to_float(x: Any) -> float | None:
    if x is None:
        return None
    try:
        return float(x)
    except Exception:
        return None
