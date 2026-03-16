"""add article_translations table

Revision ID: d4e5f6a7b8c9
Revises: c3f1a9e2d847
Create Date: 2026-03-16

Creates a normalised article_translations table to cache per-language
translations (title + ai_summary) for any target language.

Also migrates existing zh data from the articles.title_zh /
articles.ai_summary_zh columns (added in b2f94e1c7a30) into the new
table so cached translations are not lost.  The old columns are
intentionally left in place — code that reads them via raw SQL will
continue to work during any transition period.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3f1a9e2d847'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS article_translations (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            article_id  UUID        NOT NULL
                            REFERENCES articles(id) ON DELETE CASCADE,
            lang        VARCHAR(10) NOT NULL,
            title       TEXT,
            ai_summary  TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_article_translations_article_lang
                UNIQUE (article_id, lang)
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_article_translations_article_id
            ON article_translations (article_id)
    """)

    # Migrate existing Simplified Chinese translations from articles table.
    # Uses ON CONFLICT DO NOTHING so re-running the migration is idempotent.
    op.execute("""
        INSERT INTO article_translations (article_id, lang, title, ai_summary)
        SELECT id, 'zh', title_zh, ai_summary_zh
        FROM   articles
        WHERE  title_zh IS NOT NULL OR ai_summary_zh IS NOT NULL
        ON CONFLICT (article_id, lang) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS article_translations")
