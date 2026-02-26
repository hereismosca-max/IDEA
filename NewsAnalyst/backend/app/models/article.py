import uuid

from sqlalchemy import String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    content_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    fetched_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # ── AI fields (Phase 3) — all nullable until AI is connected ─────────────
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_processed_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="articles")
    article_categories: Mapped[list["ArticleCategory"]] = relationship(
        "ArticleCategory", back_populates="article"
    )
    saved_by_users: Mapped[list["UserSavedArticle"]] = relationship(
        "UserSavedArticle", back_populates="article"
    )


class UserSavedArticle(Base):
    """Junction table: a user's saved/bookmarked articles."""

    __tablename__ = "user_saved_articles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True
    )
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id"), primary_key=True
    )
    saved_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="saved_articles")
    article: Mapped["Article"] = relationship("Article", back_populates="saved_by_users")
