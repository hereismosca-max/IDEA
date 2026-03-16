"""add notifications table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-16

Creates an in-product notifications table for per-user account events
(email verified, password changed) and future system messages.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE notifications (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type        VARCHAR(50) NOT NULL,
            title       TEXT NOT NULL,
            body        TEXT,
            is_read     BOOLEAN NOT NULL DEFAULT FALSE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX ix_notifications_user_id
            ON notifications(user_id);

        CREATE INDEX ix_notifications_user_unread
            ON notifications(user_id, is_read)
            WHERE is_read = FALSE;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ix_notifications_user_unread;
        DROP INDEX IF EXISTS ix_notifications_user_id;
        DROP TABLE IF EXISTS notifications;
    """)
