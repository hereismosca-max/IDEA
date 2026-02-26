import uuid
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.source import Source
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class SourceResponse(BaseModel):
    id: uuid.UUID
    name: str
    base_url: str
    language: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("", response_model=List[SourceResponse])
def get_sources(db: Session = Depends(get_db)):
    """Return all active news sources."""
    return db.query(Source).filter(Source.is_active == True).all()
