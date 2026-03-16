from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy import or_, text, func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user, get_optional_user
from app.models.article import Article, UserSavedArticle
from app.models.vote import ArticleVote
from app.models.user import User
from app.schemas.article import ArticleListResponse, ArticleResponse, ArticleTranslationResponse
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
@limiter.limit("60/minute")
def get_articles(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=20, description="Items per page (max 20)"),
    language: str = Query("en", description="Language filter"),
    category_slug: Optional[str] = Query(None, description="Category slug filter"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD, UTC). Ignored when 'search' or date_from/date_to are present."),
    date_from: Optional[str] = Query(None, description="Filter from this UTC datetime (ISO 8601). Used with date_to for local-timezone day filtering."),
    date_to: Optional[str] = Query(None, description="Filter to this UTC datetime (ISO 8601). Used with date_from for local-timezone day filtering."),
    search: Optional[str] = Query(None, description="Search in article title and AI summary (case-insensitive). When present, date filter is ignored."),
    sort: str = Query("latest", description="Sort order: 'latest' (default, newest first) | 'popular' (most voted first) | 'impact' (highest AI score first)"),
    db: Session = Depends(get_db),
):
    """
    Fetch a paginated list of articles.
    Supports full-text search across title + AI summary, date filtering,
    section filtering, and sorting by recency or popularity.
    """
    # ── Build shared filter list ───────────────────────────────────────────────
    # Filters are collected into a list so the lean COUNT query and the full
    # data query can reuse them without duplication.  The previous pattern of
    # calling query.count() on a query that already carried joinedload() caused
    # SQLAlchemy to wrap the whole joined SELECT inside a subquery just to count,
    # running the expensive join + sort twice per request.
    filters = [
        Article.is_active == True,
        Article.language == language,
        Article.ai_summary.isnot(None),
    ]

    # ── Search filter — when active, date filter is ignored ─────────────────
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Article.title.ilike(term),
                Article.ai_summary.ilike(term),
            )
        )
    elif date_from and date_to:
        # Preferred: caller supplies exact UTC boundaries for a local calendar day
        try:
            from_dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            to_dt   = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            filters.extend([
                Article.published_at >= from_dt,
                Article.published_at < to_dt,
            ])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from/date_to format. Use ISO 8601.")
    elif date:
        # Fallback: legacy YYYY-MM-DD treated as UTC day
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            filters.extend([
                Article.published_at >= day_start,
                Article.published_at < day_end,
            ])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # ── Section filter — uses JSONB containment queries on ai_tags ───────────
    if category_slug and category_slug != "all":
        section_filter = SECTION_FILTERS.get(category_slug)
        if section_filter is not None:
            filters.append(section_filter)
        else:
            filters.append(text("false"))

    # ── Lean COUNT — no JOIN, no ORDER BY ────────────────────────────────────
    # A plain SELECT COUNT(id) is far cheaper than letting SQLAlchemy wrap a
    # joinedload query in a subquery, which would execute the full join + sort
    # just to produce a single integer.
    total = db.query(func.count(Article.id)).filter(*filters).scalar()

    # ── Data query with eager loading and sort ────────────────────────────────
    query = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(*filters)
    )

    if sort == "popular":
        # Order by net vote score (upvotes − downvotes), then by recency as tiebreaker
        net_votes = (
            db.query(func.coalesce(func.sum(ArticleVote.vote), 0))
            .filter(ArticleVote.article_id == Article.id)
            .correlate(Article)
            .scalar_subquery()
        )
        query = query.order_by(net_votes.desc(), Article.published_at.desc())
    elif sort == "impact":
        # Order by AI importance score descending; NULLs last, recency as tiebreaker
        query = query.order_by(text("ai_score DESC NULLS LAST"), Article.published_at.desc())
    else:
        # "latest" — default: newest published first
        query = query.order_by(Article.published_at.desc())

    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ArticleListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/headlines", response_model=List[ArticleResponse])
@limiter.limit("60/minute")
def get_headlines(
    request: Request,
    language: str = Query("en", description="Content language"),
    limit: int = Query(5, ge=1, le=20, description="Max number of headlines"),
    db: Session = Depends(get_db),
):
    """
    Return the most impactful recent articles for the headline ticker.
    Prioritises global/national scale events published in the last 7 days.
    Falls back to the most recent articles if not enough high-scale results exist.
    Must be defined BEFORE /saved and /{article_id} so FastAPI matches it as a
    literal path segment.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    # ── Primary: global / national scale, last 7 days ────────────────────────
    primary = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(
            Article.is_active == True,
            Article.language == language,
            Article.ai_summary.isnot(None),
            Article.published_at >= cutoff,
            or_(_scale("global"), _scale("national")),
        )
        .order_by(Article.published_at.desc())
        .limit(limit)
        .all()
    )

    if len(primary) >= limit:
        return [ArticleResponse.model_validate(a) for a in primary]

    # ── Fallback: supplement with the most recent articles ───────────────────
    needed = limit - len(primary)
    exclude_ids = [a.id for a in primary]

    fallback_q = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(
            Article.is_active == True,
            Article.language == language,
            Article.ai_summary.isnot(None),
        )
        .order_by(Article.published_at.desc())
    )
    if exclude_ids:
        fallback_q = fallback_q.filter(Article.id.notin_(exclude_ids))

    fallback = fallback_q.limit(needed).all()

    return [ArticleResponse.model_validate(a) for a in primary + fallback]


@router.get("/saved", response_model=ArticleListResponse)
@limiter.limit("60/minute")
def get_saved_articles(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a paginated list of the current user's saved articles,
    ordered by saved_at descending (most recently saved first).
    Must be defined BEFORE /{article_id} so FastAPI matches 'saved'
    as a literal path segment, not as a UUID parameter.
    """
    query = (
        db.query(Article)
        .options(joinedload(Article.source))
        .join(UserSavedArticle, UserSavedArticle.article_id == Article.id)
        .filter(UserSavedArticle.user_id == current_user.id, Article.is_active == True)
        .order_by(UserSavedArticle.saved_at.desc())
    )

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ArticleListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


_SUPPORTED_LANGS = {"zh", "zh-TW", "es", "fr", "ko", "ja"}


@router.get("/{article_id}/translate", response_model=ArticleTranslationResponse)
@limiter.limit("20/minute")
def translate_article_endpoint(
    request: Request,
    article_id: str,
    lang: str = Query("zh", description="Target language code: zh, zh-TW, es, fr, ko, ja"),
    db: Session = Depends(get_db),
):
    """
    Return the translation of an article's title and AI summary in the requested language.

    On first call: calls OpenAI to translate and caches the result in article_translations.
    On subsequent calls: returns the cached translation immediately (no API cost).

    Must be defined BEFORE /{article_id} so FastAPI matches the literal path
    segment 'translate' before treating it as a UUID parameter.
    """
    from app.services.translator import translate_article as _translate

    try:
        import uuid as _uuid
        article_uuid = _uuid.UUID(article_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid article ID format")

    article = (
        db.query(Article)
        .filter(Article.id == article_uuid, Article.is_active == True)
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if lang not in _SUPPORTED_LANGS:
        raise HTTPException(status_code=400, detail=f"Unsupported translation language: {lang}")

    # ── Check translation cache via article_translations table ───────────────
    try:
        row = db.execute(
            text(
                "SELECT title, ai_summary FROM article_translations "
                "WHERE article_id = :aid AND lang = :lang"
            ),
            {"aid": str(article_uuid), "lang": lang},
        ).fetchone()
        if row and (row[0] or row[1]):
            return ArticleTranslationResponse(
                article_id=article_uuid,
                lang=lang,
                title=row[0],
                ai_summary=row[1],
            )
    except Exception:
        # Table doesn't exist yet (migration pending) — fall through to translate
        pass

    # ── Translate via OpenAI ─────────────────────────────────────────────────
    translated_title, translated_summary = _translate(article.title, article.ai_summary, lang=lang)

    # ── Cache result in article_translations ─────────────────────────────────
    try:
        db.execute(
            text(
                "INSERT INTO article_translations (article_id, lang, title, ai_summary) "
                "VALUES (:aid, :lang, :title, :summary) "
                "ON CONFLICT (article_id, lang) DO UPDATE "
                "SET title = EXCLUDED.title, ai_summary = EXCLUDED.ai_summary"
            ),
            {
                "aid": str(article_uuid),
                "lang": lang,
                "title": translated_title,
                "summary": translated_summary,
            },
        )
        db.commit()
    except Exception:
        db.rollback()

    return ArticleTranslationResponse(
        article_id=article_uuid,
        lang=lang,
        title=translated_title,
        ai_summary=translated_summary,
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

    # Count upvotes and downvotes in a single query using conditional aggregation.
    # Previously this was 2 separate COUNT queries; combining saves a DB round-trip.
    vote_row = db.execute(
        text(
            "SELECT "
            "  COUNT(*) FILTER (WHERE vote = 1)  AS upvotes, "
            "  COUNT(*) FILTER (WHERE vote = -1) AS downvotes "
            "FROM article_votes WHERE article_id = :aid"
        ),
        {"aid": str(article_id)},
    ).fetchone()
    upvotes   = int(vote_row[0]) if vote_row else 0
    downvotes = int(vote_row[1]) if vote_row else 0

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


@router.get("/{article_id}/related", response_model=List[ArticleResponse])
@limiter.limit("60/minute")
def get_related_articles(
    request: Request,
    article_id: str,
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """
    Return up to `limit` articles that share at least one sector or topic
    with the given article, ordered by published_at descending.
    Returns an empty list if no tags are available.
    """
    try:
        import uuid as _uuid
        article_uuid = _uuid.UUID(article_id)
    except ValueError:
        return []

    article = db.query(Article).filter(Article.id == article_uuid).first()
    if not article or not article.ai_tags:
        return []

    tags = article.ai_tags
    sectors = tags.get("sectors", []) or []
    topics  = tags.get("topics",  []) or []

    # Build OR of JSONB containment checks for each matching tag
    conditions = []
    for s in sectors:
        conditions.append(text(f"ai_tags->'sectors' @> '[\"{ s }\"]'::jsonb"))
    for t in topics:
        conditions.append(text(f"ai_tags->'topics' @> '[\"{ t }\"]'::jsonb"))

    if not conditions:
        return []

    related = (
        db.query(Article)
        .options(joinedload(Article.source))
        .filter(
            Article.id != article_uuid,
            Article.is_active == True,
            Article.ai_summary.isnot(None),   # only articles with real summaries
            or_(*conditions),
        )
        .order_by(Article.published_at.desc())
        .limit(limit)
        .all()
    )

    return [ArticleResponse.model_validate(a) for a in related]
