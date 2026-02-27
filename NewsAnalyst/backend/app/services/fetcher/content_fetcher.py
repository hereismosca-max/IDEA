"""
Content Fetcher
===============
Fetches and extracts the full readable text of a single article URL.
Used by the AI processing pipeline to supplement sparse RSS snippets
(e.g. Yahoo Finance RSS entries often have no body text).

Returns None on any failure — callers must handle the None case gracefully.
The AI processor falls back to the original content_snippet when this returns None.
"""

from typing import Optional

import httpx
import trafilatura

from app.utils.logger import get_logger

logger = get_logger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
_TIMEOUT = 10       # seconds — avoids hanging on slow sites
_MAX_CHARS = 4000   # GPT-4o-mini input budget (~3 000 tokens at 0.75 tok/char)


def fetch_article_text(url: str) -> Optional[str]:
    """
    Download and extract the main readable text from an article URL.

    Uses httpx for the HTTP request and trafilatura for HTML-to-text
    extraction (trafilatura outperforms newspaper3k and BeautifulSoup on
    financial news sites).

    Args:
        url: The article's canonical URL.

    Returns:
        Extracted plain text (up to _MAX_CHARS characters), or None if
        anything fails (network error, bot block, extraction failure, etc.).
    """
    # ── HTTP fetch ────────────────────────────────────────────────────────────
    try:
        with httpx.Client(follow_redirects=True, timeout=_TIMEOUT) as client:
            response = client.get(url, headers=_HEADERS)
            response.raise_for_status()
            html = response.text
    except Exception as exc:
        logger.debug(f"Content fetch failed for {url!r}: {exc}")
        return None

    # ── HTML → plain text extraction ──────────────────────────────────────────
    try:
        text = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=False,
            no_fallback=False,   # allow trafilatura's fallback heuristics
        )
    except Exception as exc:
        logger.debug(f"Trafilatura extraction failed for {url!r}: {exc}")
        return None

    if not text:
        return None

    return text[:_MAX_CHARS]
