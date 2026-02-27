import uuid

from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


class ArticleVote(Base):
    """Stores a single user's ▲/▼ vote on an article.

    vote = 1  → upvote (agree)
    vote = -1 → downvote (disagree)
    """

    __tablename__ = "article_votes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False
    )
    vote: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 or -1
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Each user can only have one vote per article
    __table_args__ = (UniqueConstraint("user_id", "article_id", name="uq_user_article_vote"),)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="article_votes")  # type: ignore[name-defined]
    article: Mapped["Article"] = relationship("Article", back_populates="votes")  # type: ignore[name-defined]
