"""
Vote endpoints for article ▲/▼ reactions.

POST /api/v1/articles/{article_id}/vote   — cast or toggle a vote (auth required)
GET  /api/v1/articles/{article_id}/votes  — fetch vote counts (auth optional)
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.article import Article
from app.models.vote import ArticleVote
from app.models.user import User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class VoteRequest(BaseModel):
    vote: int  # 1 or -1

    @field_validator("vote")
    @classmethod
    def vote_must_be_valid(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("vote must be 1 (up) or -1 (down)")
        return v


class VoteCountsResponse(BaseModel):
    upvotes: int
    downvotes: int
    user_vote: Optional[int] = None  # 1, -1, or None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_counts(db: Session, article_id: str) -> tuple[int, int]:
    """Return (upvotes, downvotes) for an article."""
    ups = (
        db.query(func.count(ArticleVote.id))
        .filter(ArticleVote.article_id == article_id, ArticleVote.vote == 1)
        .scalar()
        or 0
    )
    downs = (
        db.query(func.count(ArticleVote.id))
        .filter(ArticleVote.article_id == article_id, ArticleVote.vote == -1)
        .scalar()
        or 0
    )
    return ups, downs


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/{article_id}/vote", response_model=VoteCountsResponse)
def cast_vote(
    article_id: str,
    payload: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cast an upvote (1) or downvote (-1) on an article.
    Toggle behaviour:
      - Same vote again → removes the vote
      - Opposite vote   → switches to new value
      - New vote        → inserts
    """
    # Verify article exists
    article = db.query(Article).filter(Article.id == article_id, Article.is_active == True).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    existing = (
        db.query(ArticleVote)
        .filter(ArticleVote.user_id == current_user.id, ArticleVote.article_id == article_id)
        .first()
    )

    if existing:
        if existing.vote == payload.vote:
            # Same vote → toggle off (delete)
            db.delete(existing)
        else:
            # Opposite vote → update
            existing.vote = payload.vote
    else:
        # No prior vote → insert
        new_vote = ArticleVote(
            user_id=current_user.id,
            article_id=article_id,
            vote=payload.vote,
        )
        db.add(new_vote)

    db.commit()

    ups, downs = _get_counts(db, article_id)

    # Fetch fresh user_vote after commit
    fresh = (
        db.query(ArticleVote)
        .filter(ArticleVote.user_id == current_user.id, ArticleVote.article_id == article_id)
        .first()
    )
    return VoteCountsResponse(
        upvotes=ups,
        downvotes=downs,
        user_vote=fresh.vote if fresh else None,
    )


@router.get("/{article_id}/votes", response_model=VoteCountsResponse)
def get_vote_counts(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Fetch upvote/downvote counts for an article (no auth required)."""
    article = db.query(Article).filter(Article.id == article_id, Article.is_active == True).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    ups, downs = _get_counts(db, article_id)

    user_vote = None
    if current_user:
        existing = (
            db.query(ArticleVote)
            .filter(ArticleVote.user_id == current_user.id, ArticleVote.article_id == article_id)
            .first()
        )
        user_vote = existing.vote if existing else None

    return VoteCountsResponse(upvotes=ups, downvotes=downs, user_vote=user_vote)
