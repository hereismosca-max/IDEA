import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class SourceBrief(BaseModel):
    """Minimal source info embedded in article responses."""
    id: uuid.UUID
    name: str
    base_url: str

    model_config = {"from_attributes": True}


class ArticleResponse(BaseModel):
    id: uuid.UUID
    title: str
    url: str
    content_snippet: Optional[str] = None
    published_at: datetime
    fetched_at: datetime
    language: str
    source: SourceBrief

    # AI fields — structured tags extracted by OpenAIProcessor
    ai_summary: Optional[str] = None
    ai_tags: Optional[dict] = None   # {"entities":[], "locations":[], "sectors":[], "topics":[], "scale":""}
    ai_score: Optional[float] = None

    # Vote counts — only populated on single-article GET /articles/{id} responses
    upvotes: int = 0
    downvotes: int = 0
    user_vote: Optional[int] = None  # 1, -1, or None

    # Translation cache — present after GET /articles/{id}/translate is called
    title_zh: Optional[str] = None
    ai_summary_zh: Optional[str] = None

    model_config = {"from_attributes": True}


class ArticleTranslationResponse(BaseModel):
    """Returned by GET /articles/{id}/translate."""
    article_id: uuid.UUID
    title_zh: Optional[str] = None
    ai_summary_zh: Optional[str] = None


class ArticleListResponse(BaseModel):
    items: List[ArticleResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class SaveStatusResponse(BaseModel):
    is_saved: bool
