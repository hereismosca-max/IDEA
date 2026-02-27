"""
AI Processor Interface
======================
Defines the contract that all AI processors must implement.

Phase 1-2: PassthroughProcessor is used (returns null for all AI fields).
Phase 2+:  OpenAIProcessor extracts structured tags via GPT-4o-mini.

To swap AI providers, implement BaseAIProcessor and update processor.py.

AIProcessingResult.tags structure (stored as JSONB):
    {
        "entities":  ["Apple", "NVIDIA"],          # companies, orgs, people
        "locations": ["United States", "China"],   # countries or regions
        "sectors":   ["Technology"],               # industry sectors
        "topics":    ["earnings", "partnership"],  # event types
        "scale":     "company"                     # company/national/regional/global
    }
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class AIProcessingResult:
    """Output of an AI processing pass on a single article."""
    summary: Optional[str] = None           # Objective, neutral summary (Phase 3)
    tags: Optional[dict] = None             # Structured tag dict (stored as JSONB)
    score: Optional[float] = None           # Importance score 0.0–1.0 (Phase 3)


class BaseAIProcessor(ABC):
    """Abstract base class for AI processors."""

    @abstractmethod
    def process(self, title: str, content: str, url: Optional[str] = None) -> AIProcessingResult:
        """
        Process a single article.

        Args:
            title:   Article headline
            content: Article body or snippet (fallback if URL fetch fails)
            url:     Article URL — used to fetch full text when snippet is sparse

        Returns:
            AIProcessingResult with summary, tags, and score.
        """
        pass
