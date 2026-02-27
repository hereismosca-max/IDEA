from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import or_, text, func
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models.article import Article
from app.models.vote import ArticleVote
from app.models.user import User
from app.schemas.article import ArticleListResponse, ArticleResponse
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# ── Section filter definitions (JSONB queries on ai_tags) ────────────────────
# Each section maps to an OR of JSONB containment conditions.
# Uses PostgreSQL @> operator: ai_tags->'field' @> '["value"]'::jsonb
def _s(sector: str):
    """Match articles whose ai_tags.sectors array contains `sector`."""
    return text(f"ai_tags->'sectors' @> '[\"{sector}\"]'::jsonb")

def _t(topic: str):
    """Match articles whose ai_tags.topics array contains `topic`."""
    return text(f"ai_tags->'topics' @> '[\"{topic}\"]'::jsonb")

def _scale(scale: str):
    """Match articles whose ai_tags.scale equals `scale`."""
    return text(f"ai_tags->>'scale' = '{scale}'")

SECTION_FILTERS = {
    # Finance sector + high-signal market-activity topics
    "markets": or_(
        _s("Finance"),
        _t("earnings"), _t("investment"), _t("ipo"),
        _t("merger"), _t("acquisition"),
        _t("stock_buyback"), _t("dividend"),
    ),
    # Technology sector
    "technology": _s("Technology"),
    # Macro-economic: national/global events + macro topics
    "economy": or_(
        _scale("national"), _scale("global"),
        _t("policy"), _t("employment"), _t("gdp"),
        _t("inflation"), _t("trade"),
        _t("regulation"), _t("interest_rate"),
    ),
    # Energy + Commodities + Agriculture sectors
    "energy": or_(
        _s("Energy"), _s("Commodities"), _s("Agriculture"),
    ),
    # Crypto sector
    "crypto": _s("Crypto"),
}


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

    # Section filter — uses JSONB containment queries on ai_tags
    if category_slug and category_slug != "all":
        section_filter = SECTION_FILTERS.get(category_slug)
        if section_filter is not None:
            query = query.filter(section_filter)
        # Unknown slug → return empty result set rather than error
        else:
            query = query.filter(text("false"))

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
def get_article(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Fetch a single article by ID, including vote counts and the caller's vote."""
    article = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(Article.id == article_id, Article.is_active == True)
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Count upvotes and downvotes
    upvotes = (
        db.query(func.count(ArticleVote.id))
        .filter(ArticleVote.article_id == article_id, ArticleVote.vote == 1)
        .scalar() or 0
    )
    downvotes = (
        db.query(func.count(ArticleVote.id))
        .filter(ArticleVote.article_id == article_id, ArticleVote.vote == -1)
        .scalar() or 0
    )

    # Determine the caller's current vote (None if unauthenticated)
    user_vote = None
    if current_user:
        existing = (
            db.query(ArticleVote)
            .filter(
                ArticleVote.user_id == current_user.id,
                ArticleVote.article_id == article_id,
            )
            .first()
        )
        user_vote = existing.vote if existing else None

    # Build response manually so we can attach the computed vote fields
    response = ArticleResponse.model_validate(article)
    response.upvotes = upvotes
    response.downvotes = downvotes
    response.user_vote = user_vote
    return response
