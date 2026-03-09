"""add translation fields to articles

Revision ID: b2f94e1c7a30
Revises: 3a7f82c1d905
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2f94e1c7a30'
down_revision: Union[str, None] = '3a7f82c1d905'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Chinese translation cache columns to articles table.
    # Both are NULL until the /translate endpoint is first called for a given article.
    op.add_column('articles', sa.Column('title_zh', sa.Text(), nullable=True))
    op.add_column('articles', sa.Column('ai_summary_zh', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('articles', 'ai_summary_zh')
    op.drop_column('articles', 'title_zh')
