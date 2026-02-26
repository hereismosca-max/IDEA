"""
AI Processor — Phase 1/2 Placeholder
=====================================
PassthroughProcessor does nothing and returns empty results for all AI fields.
It allows the rest of the codebase to call AI processing without caring
whether a real AI model is connected.

─── How to swap in a real AI (Phase 3) ───────────────────────────────────────
1. Create a new class (e.g. OpenAIProcessor) that inherits BaseAIProcessor
2. Implement the process() method using your chosen AI API
3. Change the last line of this file:
       ai_processor = OpenAIProcessor()
   Everything else stays the same.
──────────────────────────────────────────────────────────────────────────────
"""

from app.services.ai.base import BaseAIProcessor, AIProcessingResult
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PassthroughProcessor(BaseAIProcessor):
    """Placeholder: returns null for all AI fields. No external calls."""

    def process(self, title: str, content: str) -> AIProcessingResult:
        # Phase 1/2: do nothing
        return AIProcessingResult(summary=None, tags=None, score=None)


# ── Active processor instance ─────────────────────────────────────────────────
# Change this line in Phase 3 to activate real AI:
#   ai_processor = OpenAIProcessor()
# ─────────────────────────────────────────────────────────────────────────────
ai_processor = PassthroughProcessor()
