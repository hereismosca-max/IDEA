"""
Save / bookmark endpoints.

POST /api/v1/articles/{article_id}/save  — toggle save (auth required)
GET  /api/v1/articles/{article_id}/save  — check save status (auth required)
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.article import Article, UserSavedArticle
from app.models.user import User
from app.schemas.article import SaveStatusResponse

router = APIRouter()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/{article_id}/save", response_model=SaveStatusResponse)
def toggle_save(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Toggle save state for an article.
    - Already saved → remove → returns {"is_saved": false}
    - Not saved     → add    → returns {"is_saved": true}
    Requires verified email.
    """
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="email_not_verified")

    try:
        article_uuid = uuid.UUID(article_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Article not found")

    article = db.query(Article).filter(
        Article.id == article_uuid, Article.is_active == True
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    existing = db.get(UserSavedArticle, (current_user.id, article_uuid))

    if existing:
        db.delete(existing)
        db.commit()
        return SaveStatusResponse(is_saved=False)
    else:
        save = UserSavedArticle(user_id=current_user.id, article_id=article_uuid)
        db.add(save)
        db.commit()
        return SaveStatusResponse(is_saved=True)


@router.get("/{article_id}/save", response_model=SaveStatusResponse)
def get_save_status(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check whether the current user has saved a given article."""
    try:
        article_uuid = uuid.UUID(article_id)
    except ValueError:
        return SaveStatusResponse(is_saved=False)

    existing = db.get(UserSavedArticle, (current_user.id, article_uuid))
    return SaveStatusResponse(is_saved=existing is not None)
