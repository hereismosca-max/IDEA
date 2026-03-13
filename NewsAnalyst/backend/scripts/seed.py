"""
Seed Script
===========
Inserts initial data into the database:
  - 11 news sources (English)  ← updated 2026-03-13: added TechCrunch, AP News, Axios
  - 7 categories (English)

Run from the backend/ directory:
  python scripts/seed.py

The script is idempotent — existing rows are skipped, only new entries are inserted.
"""

import sys
import os

# Make sure the backend app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.source import Source
from app.models.category import Category

SOURCES = [
    # ── Original sources ──────────────────────────────────────────────────────
    {
        "name": "Financial Times",
        "rss_url": "https://www.ft.com/rss/home/uk",
        "base_url": "https://www.ft.com",
        "language": "en",
    },
    {
        "name": "CNBC",
        "rss_url": "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        "base_url": "https://www.cnbc.com",
        "language": "en",
    },
    {
        "name": "BBC Business",
        "rss_url": "https://feeds.bbci.co.uk/news/business/rss.xml",
        "base_url": "https://www.bbc.com/news/business",
        "language": "en",
    },
    {
        "name": "Yahoo Finance",
        "rss_url": "https://finance.yahoo.com/news/rssindex",
        "base_url": "https://finance.yahoo.com",
        "language": "en",
    },
    {
        "name": "MarketWatch",
        "rss_url": "https://feeds.marketwatch.com/marketwatch/topstories/",
        "base_url": "https://www.marketwatch.com",
        "language": "en",
    },
    # ── Added 2026-03-13 ──────────────────────────────────────────────────────
    {
        "name": "Reuters",
        "rss_url": "https://feeds.reuters.com/reuters/businessNews",
        "base_url": "https://www.reuters.com",
        "language": "en",
    },
    {
        "name": "Bloomberg",
        "rss_url": "https://feeds.bloomberg.com/markets/news.rss",
        "base_url": "https://www.bloomberg.com",
        "language": "en",
    },
    {
        "name": "Wall Street Journal",
        "rss_url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
        "base_url": "https://www.wsj.com",
        "language": "en",
    },
    # ── Added 2026-03-13 (cross-domain expansion) ─────────────────────────────
    {
        "name": "TechCrunch",
        "rss_url": "https://techcrunch.com/feed/",
        "base_url": "https://techcrunch.com",
        "language": "en",
    },
    {
        "name": "AP News",
        "rss_url": "https://feeds.apnews.com/rss/business",
        "base_url": "https://apnews.com",
        "language": "en",
    },
    {
        "name": "Axios",
        "rss_url": "https://api.axios.com/feed/",
        "base_url": "https://www.axios.com",
        "language": "en",
    },
]

CATEGORIES = [
    {"name": "All",                    "slug": "all",         "display_order": 0},
    {"name": "Markets",                "slug": "markets",     "display_order": 1},
    {"name": "Economy",                "slug": "economy",     "display_order": 2},
    {"name": "Policy & Central Banks", "slug": "policy",      "display_order": 3},
    {"name": "Stocks",                 "slug": "stocks",      "display_order": 4},
    {"name": "Commodities",            "slug": "commodities", "display_order": 5},
    {"name": "Crypto",                 "slug": "crypto",      "display_order": 6},
]


def seed():
    db = SessionLocal()
    try:
        # ── Sources ───────────────────────────────────────────────────────────
        print("Seeding sources...")
        for s in SOURCES:
            exists = db.query(Source).filter(Source.name == s["name"]).first()
            if exists:
                print(f"  [skip] {s['name']} already exists")
                continue
            db.add(Source(**s))
            print(f"  [+] {s['name']}")
        db.commit()

        # ── Categories ────────────────────────────────────────────────────────
        print("Seeding categories...")
        for c in CATEGORIES:
            exists = db.query(Category).filter(Category.slug == c["slug"]).first()
            if exists:
                print(f"  [skip] {c['slug']} already exists")
                continue
            db.add(Category(**c, language="en"))
            print(f"  [+] {c['name']}")
        db.commit()

        print("\n✅ Seed complete.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
