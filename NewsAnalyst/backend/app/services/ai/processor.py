"""
AI Processor — Active Instance
================================
Selects the appropriate processor based on available configuration:
  - OPENAI_API_KEY is set  →  OpenAIProcessor (GPT-4o-mini, structured tags)
  - OPENAI_API_KEY is empty →  PassthroughProcessor (no-op, returns nulls)

This file is the single place that decides which AI backend is active.
The rest of the codebase just imports `ai_processor` and calls .process().
"""

from typing import Optional

from app.services.ai.base import BaseAIProcessor, AIProcessingResult
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PassthroughProcessor(BaseAIProcessor):
    """No-op fallback: returns null for all AI fields. No external calls."""

    def process(self, title: str, content: str, url: Optional[str] = None) -> AIProcessingResult:
        return AIProcessingResult(summary=None, tags=None, score=None)


# ── Active processor selection ────────────────────────────────────────────────
def _build_processor() -> BaseAIProcessor:
    if settings.OPENAI_API_KEY:
        from app.services.ai.openai_processor import OpenAIProcessor
        logger.info("AI backend: OpenAIProcessor (GPT-4o-mini)")
        return OpenAIProcessor(api_key=settings.OPENAI_API_KEY)
    else:
        logger.info("AI backend: PassthroughProcessor (OPENAI_API_KEY not set)")
        return PassthroughProcessor()


ai_processor = _build_processor()
