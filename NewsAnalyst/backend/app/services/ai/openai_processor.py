"""
OpenAI Processor
================
Extracts structured, factual tags AND generates an objective summary for
financial news articles using GPT-4o-mini.

For each article the processor:
  1. Attempts to fetch the full article body via the article URL
     (needed for sources like Yahoo Finance whose RSS feeds have no snippet).
  2. Falls back to the RSS content_snippet if the fetch fails.
  3. Sends title + best-available content to GPT-4o-mini in a single call
     that returns both a human-readable summary and structured tag metadata.

Result stored in AIProcessingResult:
    summary  → ai_summary column (displayed on news card)
    tags     → ai_tags JSONB column (used for section filtering)

Tag structure:
    {
        "entities":  ["Apple", "Tim Cook"],         # companies, orgs, people
        "locations": ["United States"],             # countries or regions
        "sectors":   ["Technology"],                # industry sector(s)
        "topics":    ["earnings", "stock_buyback"], # event types
        "scale":     "company"                      # scope of impact
    }
"""

import json
import time
from typing import Optional

from openai import OpenAI, APIError, RateLimitError

from app.services.ai.base import BaseAIProcessor, AIProcessingResult
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Allowed values for controlled vocabulary ──────────────────────────────────
ALLOWED_SECTORS = [
    "Technology", "Finance", "Energy", "Healthcare", "Consumer",
    "Industrial", "Real Estate", "Materials", "Utilities",
    "Telecommunications", "Crypto", "Commodities", "Agriculture",
]

ALLOWED_TOPICS = [
    "earnings", "merger", "acquisition", "ipo", "bankruptcy",
    "interest_rate", "inflation", "gdp", "employment", "trade",
    "regulation", "policy", "sanctions", "geopolitics",
    "product_launch", "partnership", "investment", "lawsuit",
    "leadership_change", "stock_buyback", "dividend", "debt",
]

ALLOWED_SCALES = ["company", "national", "regional", "global"]

# ── System prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are a financial news information extractor. Your job is to read a news article and return:
(1) a concise factual summary, and (2) structured metadata tags.

Rules:
- If full article content is provided: extract ONLY facts stated in the article. Do NOT infer, predict, or analyze.
- If content is marked as [UNAVAILABLE] (paywalled or fetch failed): write a 1-2 sentence factual summary \
based strictly on what the headline itself states — do not speculate beyond what the title implies.
- Do NOT make market predictions, investment suggestions, or trend analyses.
- Be precise and concise. Prefer well-known names (e.g. "Apple" not "Apple Inc.").
- If a field has no relevant value, return an empty list (or null for scale).
- When full content is available, the summary must be 2-3 sentences. When only the title is available, 1-2 sentences is fine.

Return a JSON object with exactly these fields:
{
  "summary":   "...",   // factual summary of the article
  "entities":  [...],   // Up to 5 company names, organization names, or person names
  "locations": [...],   // Up to 3 countries or geographic regions
  "sectors":   [...],   // Up to 2 industry sectors from the allowed list
  "topics":    [...],   // Up to 3 event types from the allowed list
  "scale":     "..."    // One of: company, national, regional, global
}

Allowed sectors: Technology, Finance, Energy, Healthcare, Consumer, Industrial, Real Estate, Materials, Utilities, Telecommunications, Crypto, Commodities, Agriculture
Allowed topics: earnings, merger, acquisition, ipo, bankruptcy, interest_rate, inflation, gdp, employment, trade, regulation, policy, sanctions, geopolitics, product_launch, partnership, investment, lawsuit, leadership_change, stock_buyback, dividend, debt
Allowed scale values: company, national, regional, global
"""

# Minimum content length to be considered "available" (avoids paywall login pages, etc.)
_MIN_CONTENT_CHARS = 150


class OpenAIProcessor(BaseAIProcessor):
    """
    Calls GPT-4o-mini to generate a summary and extract structured tags from
    an article. Attempts to fetch full article text first (for sources with
    sparse RSS snippets). Falls back gracefully on any error.
    """

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", delay: float = 0.3):
        """
        Args:
            api_key: OpenAI API key.
            model:   Model name (default: gpt-4o-mini).
            delay:   Seconds to wait between calls (rate-limit courtesy).
        """
        self._client = OpenAI(api_key=api_key)
        self._model = model
        self._delay = delay
        logger.info(f"OpenAIProcessor initialised — model: {model}")

    def process(self, title: str, content: str, url: Optional[str] = None) -> AIProcessingResult:
        """
        Generate a summary and extract structured tags for a single article.

        Attempts to fetch the full article body via `url` first; falls back
        to `content` (RSS snippet) if the fetch fails or no URL is provided.
        Returns empty AIProcessingResult on any failure.
        """
        # ── Step 1: Get best available content ───────────────────────────────
        from app.services.fetcher.content_fetcher import fetch_article_text

        full_text = fetch_article_text(url) if url else None
        input_text = full_text or content or ""

        # If content is too short (empty RSS + failed fetch, or paywall page), tell
        # the AI explicitly so it falls back to title-only mode rather than returning
        # an empty summary.
        if len(input_text.strip()) < _MIN_CONTENT_CHARS:
            content_block = "[UNAVAILABLE]"
        else:
            content_block = input_text

        user_message = f"Title: {title}\n\nContent: {content_block}"

        # ── Step 2: Call GPT-4o-mini ─────────────────────────────────────────
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=0,      # deterministic extraction
                max_tokens=500,     # increased from 300 to accommodate summary
            )

            raw = response.choices[0].message.content
            data = json.loads(raw)

            tags    = self._validate_and_clean(data)
            summary = self._extract_summary(data)

            # Brief delay to be kind to rate limits
            time.sleep(self._delay)

            return AIProcessingResult(summary=summary, tags=tags)

        except RateLimitError:
            logger.warning(f"OpenAI rate limit hit for: {title[:60]}…")
            time.sleep(5)   # back off 5s on rate limit
            return AIProcessingResult()

        except APIError as e:
            logger.error(f"OpenAI API error for '{title[:60]}': {e}")
            return AIProcessingResult()

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"OpenAI response parse error for '{title[:60]}': {e}")
            return AIProcessingResult()

        except Exception as e:
            logger.error(f"Unexpected error in OpenAIProcessor for '{title[:60]}': {e}")
            return AIProcessingResult()

    # ── Private helpers ───────────────────────────────────────────────────────

    def _extract_summary(self, data: dict) -> Optional[str]:
        """Extract and lightly sanitise the summary string from GPT output."""
        summary = data.get("summary")
        if not summary or not isinstance(summary, str):
            return None
        return summary.strip() or None

    def _validate_and_clean(self, data: dict) -> dict:
        """Sanitise AI output against allowed vocabularies."""
        entities  = [str(e).strip() for e in data.get("entities",  []) if e][:5]
        locations = [str(l).strip() for l in data.get("locations", []) if l][:3]

        raw_sectors = data.get("sectors", [])
        sectors = [s for s in raw_sectors if s in ALLOWED_SECTORS][:2]

        raw_topics = data.get("topics", [])
        topics = [t for t in raw_topics if t in ALLOWED_TOPICS][:3]

        scale = data.get("scale")
        if scale not in ALLOWED_SCALES:
            scale = None

        return {
            "entities":  entities,
            "locations": locations,
            "sectors":   sectors,
            "topics":    topics,
            "scale":     scale,
        }
