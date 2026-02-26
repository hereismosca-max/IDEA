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
        "name": "Reuters",
        "rss_url": "https://feeds.reuters.com/reuters/businessNews",
        "base_url": "https://www.reuters.com",
        "language": "en",
    },
    {
        "name": "CNBC",
        "rss_url": "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        "base_url": "https://www.cnbc.com",
        "language": "en",
    },
    {
        "name": "AP News",
        "rss_url": "https://rsshub.app/apnews/topics/financial-markets",
        "base_url": "https://apnews.com",
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
