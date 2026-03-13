"""
News Source Registry
====================
To add a new news source, add an entry to NEWS_SOURCES below.
No other code needs to change.

Fields:
  name     — Display name (must match Sources table exactly)
  rss_url  — RSS feed URL
  base_url — Media homepage
  language — 'en' or 'zh'

Source notes:
  Reuters     — Major news wire; feeds.reuters.com verified accessible from Railway (US-West).
  Bloomberg   — feeds.bloomberg.com publicly available (30 articles/feed); content paywalled
                but RSS titles/snippets are enough for AI tagging.
  WSJ         — Wall Street Journal (Dow Jones); feeds.a.dj.com publicly available RSS;
                content paywalled but snippets are sufficient for summaries.
  FT          — Financial Times; heavily paywalled, but RSS titles are valuable signal.
  BBC Business — Broad coverage; low paywall rate, good for macro/policy context.
  TechCrunch  — Top startup/VC/AI news; techcrunch.com/feed/ confirmed 20 articles (2026-03-13).
                Critical for AI & tech sector signals — largest market driver in 2025-26.
  AP News     — Associated Press global newswire; feeds.apnews.com DNS fails locally (VPN/proxy)
                but accessible from Railway US-West (same pattern as Reuters). Neutral, fast.
  Axios       — High signal-to-noise short-form business news; api.axios.com/feed/ confirmed
                100 articles live (2026-03-13). Covers AI policy, markets, geopolitics.
"""

NEWS_SOURCES = [
    # ── Original 5 sources ────────────────────────────────────────────────────
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
