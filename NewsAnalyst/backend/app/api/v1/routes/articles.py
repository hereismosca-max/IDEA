from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.core.database import get_db
from app.models.article import Article
from app.schemas.article import ArticleListResponse, ArticleResponse
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("", response_model=ArticleListResponse)
def get_articles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    language: str = Query("en", description="Language filter"),
    category_slug: Optional[str] = Query(None, description="Category slug filter"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD, UTC)"),
    db: Session = Depends(get_db),
):
    """
    Fetch a paginated list of articles.
    Ordered by published_at descending (newest first).
    Optionally filtered to a single UTC calendar day via ?date=YYYY-MM-DD.
    """
    query = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(Article.is_active == True, Article.language == language)
        .order_by(Article.published_at.desc())
    )

    # Date filter — restrict to a single UTC calendar day
    if date:
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            query = query.filter(
                Article.published_at >= day_start,
                Article.published_at < day_end,
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Category filter — wired up in Phase 2/3 when AI tagging is active
    # if category_slug and category_slug != "all":
    #     query = query.join(ArticleCategory).join(Category).filter(Category.slug == category_slug)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ArticleListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(article_id: str, db: Session = Depends(get_db)):
    """Fetch a single article by ID."""
    article = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(Article.id == article_id, Article.is_active == True)
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article
