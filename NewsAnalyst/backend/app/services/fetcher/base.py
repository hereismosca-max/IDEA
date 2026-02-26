"""
Base Fetcher
============
Abstract base class for all news fetchers.

To add a new news source type (e.g. a custom scraper):
  1. Create a new class that inherits from BaseFetcher
  2. Implement the fetch() method
  3. Register it in registry.py
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


@dataclass
class FetchedArticle:
    """Raw article data returned by a fetcher before saving to the database."""
    title: str
    url: str
    published_at: datetime
    content_snippet: Optional[str] = None
    language: str = "en"


class BaseFetcher(ABC):
    """Abstract base class that all fetchers must implement."""

    def __init__(self, source_name: str, rss_url: str, language: str = "en"):
        self.source_name = source_name
        self.rss_url = rss_url
        self.language = language

    @abstractmethod
    def fetch(self) -> List[FetchedArticle]:
        """
        Fetch articles from the source.
        Returns a list of FetchedArticle objects.
        Must not raise exceptions — handle errors internally and return empty list.
        """
        pass
