import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    preferred_lang: Mapped[str] = mapped_column(
        String(10), nullable=False, default="en"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Email verification ────────────────────────────────────────────────────
    email_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    email_verification_token: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )
    email_verification_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Password reset ────────────────────────────────────────────────────────
    password_reset_token: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )
    password_reset_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    saved_articles: Mapped[list["UserSavedArticle"]] = relationship(
        "UserSavedArticle", back_populates="user"
    )
    article_votes: Mapped[list["ArticleVote"]] = relationship(  # type: ignore[name-defined]
        "ArticleVote", back_populates="user"
    )
