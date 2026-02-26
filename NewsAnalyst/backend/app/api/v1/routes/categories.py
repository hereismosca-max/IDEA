import uuid
from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.category import Category
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    language: str
    display_order: int

    model_config = {"from_attributes": True}


@router.get("", response_model=List[CategoryResponse])
def get_categories(
    language: str = Query("en", description="Language filter"),
    db: Session = Depends(get_db),
):
    """Return all active categories for the given language, ordered by display_order."""
    return (
        db.query(Category)
        .filter(Category.language == language, Category.is_active == True)
        .order_by(Category.display_order)
        .all()
    )
