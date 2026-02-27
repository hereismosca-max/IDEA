"""
OpenAI Processor
================
Extracts structured, factual tags from financial news articles using
GPT-4o-mini. No market analysis or predictions — purely information
extraction (who, where, what type of event, which industry).

Tag structure returned in AIProcessingResult.tags:
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
You are a financial news information extractor. Your only job is to read a news article and extract factual metadata.

Rules:
- Extract ONLY facts stated in the article. Do NOT infer, predict, or analyze.
- Do NOT make market predictions, investment suggestions, or trend analyses.
- Be precise and concise. Prefer well-known names (e.g. "Apple" not "Apple Inc.").
- If a field has no relevant value, return an empty list (or null for scale).

Return a JSON object with exactly these fields:
{
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


class OpenAIProcessor(BaseAIProcessor):
    """
    Calls GPT-4o-mini to extract structured tags from article title + snippet.
    Falls back gracefully (returns empty result) on any API error.
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

    def process(self, title: str, content: str) -> AIProcessingResult:
        """
        Extract structured tags for a single article.
        Returns empty AIProcessingResult on any failure.
        """
        user_message = f"Title: {title}\n\nContent: {content[:800]}"

        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=0,        # deterministic extraction
                max_tokens=300,
            )

            raw = response.choices[0].message.content
            data = json.loads(raw)

            tags = self._validate_and_clean(data)

            # Brief delay to be kind to rate limits
            time.sleep(self._delay)

            return AIProcessingResult(tags=tags)

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
