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
"""

NEWS_SOURCES = [
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
]
