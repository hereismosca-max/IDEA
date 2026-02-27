"""add article_votes table

Revision ID: ad6341ac581e
Revises: a45e0f92002f
Create Date: 2026-02-27 00:31:31.732029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ad6341ac581e'
down_revision: Union[str, None] = 'a45e0f92002f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "article_votes",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("article_id", sa.UUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vote", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "article_id", name="uq_user_article_vote"),
    )
    op.create_index("idx_article_votes_article_id", "article_votes", ["article_id"])
    op.create_index("idx_article_votes_user_id", "article_votes", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_article_votes_user_id", table_name="article_votes")
    op.drop_index("idx_article_votes_article_id", table_name="article_votes")
    op.drop_table("article_votes")
