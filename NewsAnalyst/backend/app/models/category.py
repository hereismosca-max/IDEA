import uuid

from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    article_categories: Mapped[list["ArticleCategory"]] = relationship(
        "ArticleCategory", back_populates="category"
    )


class ArticleCategory(Base):
    """
    Junction table: maps articles to categories.
    assigned_by = 'manual' (hardcoded) or 'ai' (Phase 3).
    """

    __tablename__ = "article_categories"

    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id"), primary_key=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), primary_key=True
    )
    assigned_by: Mapped[str] = mapped_column(
        String(20), nullable=False, default="manual"
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    article: Mapped["Article"] = relationship(
        "Article", back_populates="article_categories"
    )
    category: Mapped["Category"] = relationship(
        "Category", back_populates="article_categories"
    )
