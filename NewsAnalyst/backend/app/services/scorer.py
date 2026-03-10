"""
Article Importance Scorer
=========================
Assigns an importance score (1–100) to a financial news article,
calibrated for an investor / market-analyst audience.

Design principles
-----------------
- **Investor-first perspective**: earnings surprises and direct asset-price
  movers score higher than generic macro background pieces.
- **LLM-based**: GPT-4o-mini reasons about the full context — entity
  significance, event magnitude, and market timing — instead of matching
  fixed keywords that go stale.
- **Phase-B interface pre-reserved**: accepts an optional `user_context`
  dict that will power personalised relevance scoring in Phase 4/5.
  When `user_context=None` the function returns a pure objective score.

Storage convention
------------------
The DB column `articles.ai_score` is `Float` (0.0–1.0).
This module works in integer 1–100; callers must convert before storing:
    db_value = score_article(...) / 100.0

Usage (backfill script / standalone)
-------------------------------------
    from app.services.scorer import score_article
    score = score_article(api_key, title, ai_summary, ai_tags)

Usage (within existing OpenAI call)
-------------------------------------
For **new articles**, the importance_score is returned directly inside the
JSON output of openai_processor.py (same API call, zero extra cost).
This module is used only for the standalone backfill path.
"""

import json
import time
from typing import Optional

from openai import OpenAI, APIError, RateLimitError

from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Scoring system prompt ──────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are scoring financial news articles for an investment-focused platform.
Audience: investors, traders, and market analysts — NOT general readers.

Score each article 1–100 based on how important it is to someone actively
managing investments or tracking financial markets.

Scoring guide:
90–100 · Market-shaking / systemic events
  — Federal Reserve rate decisions or emergency interventions
  — Geopolitical crises with direct, immediate economic impact (sanctions,
    war affecting energy/supply chains)
  — Market-wide crashes or circuit-breaker triggers
  — Bankruptcy of a systemically important institution (major bank, etc.)

70–89 · High-impact — investors need to act or reposition
  — Major earnings surprise (>10% beat or miss) for large-cap companies
    (e.g. Nvidia, Apple, Amazon, Goldman Sachs)
  — M&A deals that reshape an entire industry
  — Central bank policy signals (Fed chair, ECB) beyond routine commentary
  — Significant regulatory action against a dominant market player
  — Macro data (GDP, inflation, jobs) significantly above/below consensus

50–69 · Notable but not urgent
  — Earnings for mid-to-large cap (in-line or small beat/miss)
  — Sector-wide regulatory change
  — Major company leadership change (CEO, CFO at a well-known firm)
  — Notable geopolitical development without immediate price impact
  — Significant commodity moves (oil, gold)

30–49 · Moderate investor interest
  — Earnings for smaller or niche companies
  — New product launches by major companies
  — Strategic partnerships between significant firms
  — IPO filings or completions for noteworthy companies
  — Individual analyst upgrades / downgrades on large-caps

10–29 · Low direct investment relevance
  — Minor corporate announcements or routine press releases
  — Educational, explainer, or background context articles
  — Small-company routine updates with no market-moving potential

Return ONLY a JSON object with a single field:
{"importance_score": <integer 1-100>}
"""

# Default score returned on any error (conservative middle-low)
_DEFAULT_SCORE = 30


def score_article(
    api_key: str,
    title: str,
    ai_summary: Optional[str],
    ai_tags: Optional[dict],
    user_context: Optional[dict] = None,   # ← Phase-B personalisation hook
    model: str = "gpt-4o-mini",
    delay: float = 0.3,
) -> int:
    """
    Score a single article's importance for an investor audience.

    Parameters
    ----------
    api_key:      OpenAI API key.
    title:        Article headline.
    ai_summary:   Objective AI-generated summary already stored in the DB.
    ai_tags:      Structured tags dict (entities, topics, sectors, scale).
    user_context: **Phase-B hook — currently unused.**
                  Future format::

                      {
                          "followed_sectors":  ["Technology", "Finance"],
                          "followed_entities": ["Nvidia", "Apple"],
                      }

                  When provided in a future phase, the score will be a
                  weighted blend::

                      final = round(0.7 * objective + 0.3 * relevance_boost)

                  For now, user_context=None → pure objective score.
    model:        OpenAI model name.
    delay:        Seconds to sleep after each call (rate-limit courtesy).

    Returns
    -------
    int
        Integer 1–100.  Returns ``_DEFAULT_SCORE`` (30) on any error so
        the caller always gets a usable value.

    Notes
    -----
    Callers must divide by 100.0 before writing to the ``ai_score`` DB
    column (which is ``Float(0.0–1.0)``).
    """
    # ── Phase-B future hook note ─────────────────────────────────────────────
    # When user_context is provided:
    #   1. Compute objective_score as below.
    #   2. Compute relevance_boost from user_context (e.g. +20 if an entity
    #      the user follows is mentioned, +15 if a followed sector matches).
    #   3. Return round(0.7 * objective_score + 0.3 * relevance_boost).
    # For now, user_context is always None.
    # ────────────────────────────────────────────────────────────────────────

    client = OpenAI(api_key=api_key)

    # Build a compact, informative context message
    parts: list[str] = [f"Title: {title}"]
    if ai_summary:
        parts.append(f"Summary: {ai_summary}")
    if ai_tags:
        if ai_tags.get("scale"):
            parts.append(f"Scale: {ai_tags['scale']}")
        if ai_tags.get("sectors"):
            parts.append(f"Sectors: {', '.join(ai_tags['sectors'])}")
        if ai_tags.get("topics"):
            parts.append(f"Topics: {', '.join(ai_tags['topics'])}")
        if ai_tags.get("entities"):
            parts.append(f"Key entities: {', '.join(ai_tags['entities'][:5])}")

    user_msg = "\n".join(parts)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0,      # deterministic scoring
            max_tokens=20,      # only need {"importance_score": N}
        )

        data = json.loads(response.choices[0].message.content)
        raw  = data.get("importance_score", _DEFAULT_SCORE)
        score = int(max(1, min(100, raw)))

        time.sleep(delay)
        return score

    except RateLimitError:
        logger.warning(f"Rate limit hit while scoring: {title[:60]}…")
        time.sleep(10)
        return _DEFAULT_SCORE

    except (APIError, json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        logger.warning(f"Scoring failed for '{title[:60]}': {e}")
        return _DEFAULT_SCORE

    except Exception as e:
        logger.error(f"Unexpected error scoring '{title[:60]}': {e}")
        return _DEFAULT_SCORE
