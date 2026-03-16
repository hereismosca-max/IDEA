"""
Translation Service
===================
Translates article titles and AI summaries into the requested language
using GPT-4o-mini.  Translations are cached in the `article_translations`
table so each (article, lang) pair is translated at most once.

Usage:
    from app.services.translator import translate_article
    title_t, summary_t = translate_article(title, ai_summary, lang='ja')
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


_LANG_LABELS: dict = {
    'zh':    'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'es':    'Spanish (Español)',
    'fr':    'French (Français)',
    'ko':    'Korean (한국어)',
    'ja':    'Japanese (日本語)',
}


def _system_prompt(lang: str) -> str:
    label = _LANG_LABELS.get(lang, lang)
    return (
        f"You are a professional financial news translator.\n"
        f"Translate the provided JSON fields from English to {label}.\n"
        f"Return ONLY a valid JSON object with the same keys as the input.\n"
        f"Rules:\n"
        f"- Keep all proper nouns (company names, ticker symbols, people's names) as-is in English.\n"
        f"- Keep numbers, dates, and financial figures as-is.\n"
        f"- Produce natural, concise text suitable for a news website.\n"
        f"- Do NOT add any commentary, explanation, or markdown fences — just the JSON."
    )


def translate_article(
    title: str,
    ai_summary: Optional[str],
    lang: str = 'zh',
) -> Tuple[Optional[str], Optional[str]]:
    """
    Translate a news article's title and AI summary to the given language.

    Returns (translated_title, translated_summary).  Returns (None, None) if
    the API key is not configured or if the translation call fails.
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
                {"role": "system", "content": _system_prompt(lang)},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)

        translated_title: Optional[str] = result.get("title") or None
        translated_summary: Optional[str] = result.get("ai_summary") or None
        return translated_title, translated_summary

    except (RateLimitError, APIError) as exc:
        logger.error("translate_article: OpenAI API error — %s", exc)
        return None, None
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("translate_article: failed to parse translation response — %s", exc)
        return None, None
    except Exception as exc:
        logger.error("translate_article: unexpected error — %s", exc)
        return None, None
