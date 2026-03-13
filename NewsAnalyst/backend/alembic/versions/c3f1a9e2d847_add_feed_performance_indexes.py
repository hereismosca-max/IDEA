"""add feed performance indexes

Revision ID: c3f1a9e2d847
Revises: b2f94e1c7a30
Create Date: 2026-03-13

Background
----------
With ~6 000+ articles in the DB, every paginated feed request was performing
a full sequential table scan because no composite index covered the common
WHERE + ORDER BY pattern.

Two indexes are created:

  ix_articles_feed:   (is_active, language, published_at DESC)
                      Covers the WHERE clause used by every list request and
                      the ORDER BY used in "latest" mode (default).

  ix_articles_impact: (is_active, language, ai_score DESC NULLS LAST, published_at DESC)
                      Covers the same WHERE clause + the ORDER BY used in
                      "impact" sort mode.

At ~6 000 rows these take < 100 ms — effectively zero downtime.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers
revision: str = 'c3f1a9e2d847'
down_revision: Union[str, None] = 'b2f94e1c7a30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_articles_feed "
        "ON articles (is_active, language, published_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_articles_impact "
        "ON articles (is_active, language, ai_score DESC NULLS LAST, published_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_articles_impact")
    op.execute("DROP INDEX IF EXISTS ix_articles_feed")
