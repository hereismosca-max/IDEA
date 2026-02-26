"""
AI Processor Interface
======================
Defines the contract that all AI processors must implement.

Phase 1-2: PassthroughProcessor is used (returns null for all AI fields).
Phase 3:   A real processor (e.g. OpenAIProcessor) replaces it.

To swap AI providers, implement BaseAIProcessor and update processor.py.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class AIProcessingResult:
    """Output of an AI processing pass on a single article."""
    summary: Optional[str] = None           # Objective, neutral summary
    tags: Optional[List[str]] = None        # Category tags e.g. ["Markets", "Policy"]
    score: Optional[float] = None           # Importance score 0.0–1.0


class BaseAIProcessor(ABC):
    """Abstract base class for AI processors."""

    @abstractmethod
    def process(self, title: str, content: str) -> AIProcessingResult:
        """
        Process a single article.

        Args:
            title:   Article headline
            content: Article body or snippet

        Returns:
            AIProcessingResult with summary, tags, and score.
        """
        pass
