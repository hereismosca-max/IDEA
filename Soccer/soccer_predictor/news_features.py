from __future__ import annotations

import os
from typing import Iterable

import pandas as pd

from soccer_predictor.config import SETTINGS

NEWS_NUMERIC_COLS = [
    "news_sentiment_home",
    "news_sentiment_away",
    "news_sentiment_diff",
    "news_injury_impact_home",
    "news_injury_impact_away",
    "news_transfer_shock_home",
    "news_transfer_shock_away",
    "news_motivation_home",
    "news_motivation_away",
    "news_weather_impact",
]


def attach_news_features(
    df: pd.DataFrame,
    feature_path: str | None = None,
    default_value: float = 0.0,
) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.copy()
    path = feature_path or SETTINGS.news_feature_path
    extra = _load_news_frame(path)

    if extra is None or extra.empty:
        for col in NEWS_NUMERIC_COLS:
            if col not in out.columns:
                out[col] = float(default_value)
            else:
                out[col] = pd.to_numeric(out[col], errors="coerce").fillna(float(default_value))
        out["news_sentiment_diff"] = out["news_sentiment_home"] - out["news_sentiment_away"]
        return out

    merged = out.merge(extra, on="match_id", how="left")
    for col in NEWS_NUMERIC_COLS:
        if col not in merged.columns:
            merged[col] = float(default_value)
        else:
            merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(float(default_value))
    merged["news_sentiment_diff"] = merged["news_sentiment_home"] - merged["news_sentiment_away"]
    return merged


def _load_news_frame(path: str) -> pd.DataFrame | None:
    if not path or not os.path.exists(path):
        return None
    try:
        raw = pd.read_csv(path)
    except Exception:
        return None
    if raw.empty or "match_id" not in raw.columns:
        return None

    keep = ["match_id"] + [c for c in NEWS_NUMERIC_COLS if c in raw.columns]
    out = raw[keep].copy()
    out["match_id"] = pd.to_numeric(out["match_id"], errors="coerce")
    out = out.dropna(subset=["match_id"])
    out["match_id"] = out["match_id"].astype(int)
    for col in _iter_without_first(keep):
        out[col] = pd.to_numeric(out[col], errors="coerce")
    return out.drop_duplicates(subset=["match_id"], keep="last")


def _iter_without_first(items: list[str]) -> Iterable[str]:
    for i, value in enumerate(items):
        if i == 0:
            continue
        yield value

