"""
Translation Service
===================
Translates article titles and AI summaries into Chinese (Simplified)
using GPT-4o-mini.  Translations are cached in the `articles` table
(title_zh, ai_summary_zh columns) so each article is translated at most
once.

Usage:
    from app.services.translator import translate_article
    title_zh, summary_zh = translate_article(title, ai_summary)
"""

import json
from typing import Optional, Tuple

from openai import OpenAI, APIError, RateLimitError

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Re-use a single client instance (thread-safe)
_client: Optional[OpenAI] = None


def _get_client() -> Optional[OpenAI]:
    """Return an OpenAI client, or None if no API key is configured."""
    global _client
    if _client is None and settings.OPENAI_API_KEY:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


_SYSTEM_PROMPT = """\
You are a professional financial news translator.
Translate the provided JSON fields from English to Simplified Chinese (简体中文).
Return ONLY a valid JSON object with the same keys as the input.
Rules:
- Keep all proper nouns (company names, ticker symbols, people's names) as-is in English.
- Keep numbers, dates, and financial figures as-is.
- Produce natural, concise Chinese suitable for a news website.
- Do NOT add any commentary, explanation, or markdown fences — just the JSON.
"""


def translate_article(
    title: str,
    ai_summary: Optional[str],
) -> Tuple[Optional[str], Optional[str]]:
    """
    Translate a news article's title and AI summary to Simplified Chinese.

    Returns (title_zh, ai_summary_zh).  Returns (None, None) if the API key
    is not configured or if the translation call fails.
    """
    client = _get_client()
    if client is None:
        logger.warning("translate_article: OPENAI_API_KEY not set — skipping translation")
        return None, None

    # Build the payload — only include summary if it exists
    input_obj: dict = {"title": title}
    if ai_summary:
        input_obj["ai_summary"] = ai_summary

    user_msg = json.dumps(input_obj, ensure_ascii=False)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)

        title_zh: Optional[str] = result.get("title") or None
        summary_zh: Optional[str] = result.get("ai_summary") or None
        return title_zh, summary_zh

    except (RateLimitError, APIError) as exc:
        logger.error("translate_article: OpenAI API error — %s", exc)
        return None, None
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("translate_article: failed to parse translation response — %s", exc)
        return None, None
    except Exception as exc:
        logger.error("translate_article: unexpected error — %s", exc)
        return None, None
