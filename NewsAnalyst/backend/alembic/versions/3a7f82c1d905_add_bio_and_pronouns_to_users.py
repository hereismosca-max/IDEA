"""add bio and pronouns to users

Revision ID: 3a7f82c1d905
Revises: 1e5967f26b22
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a7f82c1d905'
down_revision: Union[str, None] = '1e5967f26b22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('pronouns', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'pronouns')
    op.drop_column('users', 'bio')
