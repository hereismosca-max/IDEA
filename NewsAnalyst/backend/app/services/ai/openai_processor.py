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
You are a financial news data extractor working for an investor-focused platform.
Your job is to read a news article and return:
  (1) a concise objective data summary,
  (2) structured metadata tags, and
  (3) an importance score for investors.

Extraction rules (summary + tags):
- Extract ONLY concrete facts, numbers, and events explicitly stated in the article.
- Do NOT paraphrase, interpret, or add context beyond what the article states.
- Do NOT make market predictions, investment suggestions, or trend analyses.
- Prioritise specific data points: percentages, dollar figures, dates, named entities.
- Be precise and concise. Prefer well-known names (e.g. "Apple" not "Apple Inc.").
- If a field has no relevant value, return an empty list (or null for scale).
- The summary must be 2-3 sentences of objective factual data only.

Importance score rules:
- Score 1–100 from the perspective of an investor or market analyst.
- Higher = more directly relevant to investment decisions or asset prices.
- 90-100: Systemic events (Fed rate decision, major crisis, market-wide crash)
- 70-89: High-impact (major earnings surprise for large-cap, major M&A, key policy)
- 50-69: Notable (mid-large cap earnings, leadership change, sector regulation)
- 30-49: Moderate (smaller company earnings, product launches, analyst calls)
- 10-29: Low relevance (minor announcements, background/explainer pieces)

Return a JSON object with exactly these fields:
{
  "summary":          "...",  // 2-3 sentences of objective factual data
  "entities":         [...],  // Up to 5 company names, organization names, or person names
  "locations":        [...],  // Up to 3 countries or geographic regions
  "sectors":          [...],  // Up to 2 industry sectors from the allowed list
  "topics":           [...],  // Up to 3 event types from the allowed list
  "scale":            "...",  // One of: company, national, regional, global
  "importance_score": 0       // Integer 1-100, investor-perspective importance
}

Allowed sectors: Technology, Finance, Energy, Healthcare, Consumer, Industrial, Real Estate, Materials, Utilities, Telecommunications, Crypto, Commodities, Agriculture
Allowed topics: earnings, merger, acquisition, ipo, bankruptcy, interest_rate, inflation, gdp, employment, trade, regulation, policy, sanctions, geopolitics, product_launch, partnership, investment, lawsuit, leadership_change, stock_buyback, dividend, debt
Allowed scale values: company, national, regional, global
"""

# Minimum content length to consider article body "available".
# Paywall pages / bot-block responses are typically < 150 chars of useful text.
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
        self._client = OpenAI(
            api_key=api_key,
            timeout=30.0,   # Hard cap: abort if OpenAI doesn't respond within 30 s.
                            # Without this, a stalled call can block the scheduler
                            # indefinitely, freezing all subsequent article processing.
        )
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

        # If content is too short the article is likely paywalled or bot-blocked.
        # Skip the AI call entirely — the caller will mark this article as processed
        # with no summary so it can be filtered out of the feed.
        if len(input_text.strip()) < _MIN_CONTENT_CHARS:
            return AIProcessingResult()

        user_message = f"Title: {title}\n\nContent: {input_text}"

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
                max_tokens=550,     # +50 for importance_score field
            )

            raw = response.choices[0].message.content
            data = json.loads(raw)

            tags    = self._validate_and_clean(data)
            summary = self._extract_summary(data)
            score   = self._extract_score(data)

            # Brief delay to be kind to rate limits
            time.sleep(self._delay)

            return AIProcessingResult(summary=summary, tags=tags, score=score)

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

    def _extract_score(self, data: dict) -> Optional[float]:
        """
        Extract importance_score from GPT output and convert to 0.0–1.0.

        The prompt asks for an integer 1–100; we store it as a float 0.0–1.0
        (matching the existing DB column type) so no schema migration is needed.
        Returns None if the field is missing or malformed — callers should treat
        None as "not yet scored".
        """
        raw = data.get("importance_score")
        if raw is None:
            return None
        try:
            clamped = max(1, min(100, int(raw)))
            return round(clamped / 100.0, 4)
        except (TypeError, ValueError):
            return None

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
