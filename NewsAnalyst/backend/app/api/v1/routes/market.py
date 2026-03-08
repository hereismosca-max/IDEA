"""Market data snapshot endpoint  —  GET /api/v1/market/snapshot

Fetches key financial indicators from Yahoo Finance via yfinance.
Results are cached in-memory for 5 minutes to avoid hammering the API.
"""

import threading
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter

router = APIRouter()

# ── In-memory cache ───────────────────────────────────────────────────────────
_lock:    threading.Lock      = threading.Lock()
_data:    Optional[list]      = None
_fetched: Optional[datetime]  = None
_TTL      = 300  # seconds (5 min)

# ── Indicators to track ───────────────────────────────────────────────────────
# symbol: Yahoo Finance ticker; decimals: how many decimal places to round price
INDICATORS = [
    {"symbol": "^GSPC", "label": "S&P 500",   "decimals": 2},
    {"symbol": "^IXIC", "label": "NASDAQ",    "decimals": 2},
    {"symbol": "^DJI",  "label": "DJIA",      "decimals": 2},
    {"symbol": "^VIX",  "label": "VIX",       "decimals": 2},
    {"symbol": "^TNX",  "label": "10Y Yield", "decimals": 3},
    {"symbol": "GC=F",  "label": "Gold",      "decimals": 2},
]


def _fetch_fresh() -> list:
    """Pull latest prices from Yahoo Finance (runs ~1-2 s)."""
    import yfinance as yf  # lazy import — only loaded when this function runs

    results = []
    for ind in INDICATORS:
        try:
            fi    = yf.Ticker(ind["symbol"]).fast_info
            price = float(fi.last_price)
            prev  = float(fi.previous_close)
            chg   = price - prev
            pct   = (chg / prev * 100) if prev else 0.0
            results.append({
                "symbol":     ind["symbol"],
                "label":      ind["label"],
                "price":      round(price, ind["decimals"]),
                "change":     round(chg,   ind["decimals"]),
                "change_pct": round(pct,   2),
            })
        except Exception:
            # If one ticker fails, return a null placeholder so the rest still show
            results.append({
                "symbol":     ind["symbol"],
                "label":      ind["label"],
                "price":      None,
                "change":     None,
                "change_pct": None,
            })
    return results


def _get_snapshot() -> list:
    """Return cached snapshot, refreshing it when the TTL has expired."""
    global _data, _fetched
    with _lock:
        now = datetime.now(timezone.utc)
        if _data and _fetched and (now - _fetched).total_seconds() < _TTL:
            return _data
        _data    = _fetch_fresh()
        _fetched = now
        return _data


# ── Route ─────────────────────────────────────────────────────────────────────
@router.get("/snapshot")
def get_market_snapshot():
    """
    Return a snapshot of key financial indicators.
    Data is cached for 5 minutes; the `cached_at` field shows when it was last refreshed.
    """
    snapshot = _get_snapshot()
    return {
        "indicators": snapshot,
        "cached_at":  _fetched.isoformat() if _fetched else None,
    }
