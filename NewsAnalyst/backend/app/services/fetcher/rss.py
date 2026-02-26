import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List

import feedparser

from app.services.fetcher.base import BaseFetcher, FetchedArticle
from app.utils.logger import get_logger

logger = get_logger(__name__)

SNIPPET_MAX_LENGTH = 300


class RSSFetcher(BaseFetcher):
    """Fetches articles from an RSS/Atom feed using feedparser."""

    def fetch(self) -> List[FetchedArticle]:
        logger.info(f"Fetching RSS: {self.source_name} → {self.rss_url}")
        try:
            feed = feedparser.parse(self.rss_url)
            articles = []

            for entry in feed.entries:
                try:
                    article = self._parse_entry(entry)
                    if article:
                        articles.append(article)
                except Exception as e:
                    logger.warning(
                        f"[{self.source_name}] Failed to parse entry: {e}"
                    )
                    continue

            logger.info(f"[{self.source_name}] Fetched {len(articles)} articles")
            return articles

        except Exception as e:
            logger.error(f"[{self.source_name}] RSS fetch failed: {e}")
            return []

    def _parse_entry(self, entry) -> FetchedArticle | None:
        title = getattr(entry, "title", "").strip()
        url = getattr(entry, "link", "").strip()

        if not title or not url:
            return None

        published_at = self._parse_date(entry)
        snippet = self._extract_snippet(entry)

        return FetchedArticle(
            title=title,
            url=url,
            published_at=published_at,
            content_snippet=snippet,
            language=self.language,
        )

    def _parse_date(self, entry) -> datetime:
        try:
            if hasattr(entry, "published") and entry.published:
                dt = parsedate_to_datetime(entry.published)
                return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
        except Exception:
            pass
        return datetime.now(timezone.utc)

    def _extract_snippet(self, entry) -> str | None:
        text = ""
        if hasattr(entry, "summary") and entry.summary:
            text = entry.summary
        elif hasattr(entry, "content") and entry.content:
            text = entry.content[0].get("value", "")

        # Strip basic HTML tags
        text = re.sub(r"<[^>]+>", "", text).strip()
        return text[:SNIPPET_MAX_LENGTH] if text else None
