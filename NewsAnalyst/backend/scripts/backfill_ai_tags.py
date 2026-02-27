"""
Backfill AI Tags
================
One-time script to run OpenAI tag extraction on all existing articles
that currently have ai_tags = NULL.

Usage (from backend/ directory):
    python scripts/backfill_ai_tags.py [--limit N] [--dry-run]

Options:
    --limit N    Process at most N articles (default: all)
    --dry-run    Print extracted tags without writing to DB
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import text

# Allow imports from backend/app/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.article import Article


def main():
    parser = argparse.ArgumentParser(description="Backfill AI tags for existing articles")
    parser.add_argument("--limit", type=int, default=None, help="Max articles to process")
    parser.add_argument("--dry-run", action="store_true", help="Print only, no DB writes")
    args = parser.parse_args()

    # ── Guard: require API key ────────────────────────────────────────────────
    if not settings.OPENAI_API_KEY:
        print("ERROR: OPENAI_API_KEY is not set in .env")
        sys.exit(1)

    from app.services.ai.openai_processor import OpenAIProcessor
    processor = OpenAIProcessor(api_key=settings.OPENAI_API_KEY)

    db = SessionLocal()
    try:
        # JSONB + psycopg3 quirk: None may be stored as JSON 'null' (not SQL NULL),
        # so we check for both SQL NULL and the JSON literal 'null' string.
        query = db.query(Article).filter(
            text("ai_tags IS NULL OR ai_tags::text = 'null'")
        )
        if args.limit:
            query = query.limit(args.limit)
        articles = query.all()

        total = len(articles)
        print(f"Found {total} articles without AI tags. Starting processing...\n")
        if args.dry_run:
            print("[DRY RUN — no writes to DB]\n")

        success = 0
        failed  = 0

        for i, article in enumerate(articles, 1):
            print(f"[{i}/{total}] {article.title[:80]}...")
            result = processor.process(article.title, article.content_snippet or "")

            if result.tags:
                print(f"  ✓ tags: {result.tags}")
                if not args.dry_run:
                    article.ai_tags = result.tags
                    article.ai_processed_at = datetime.now(timezone.utc)
                success += 1
            else:
                print(f"  ✗ no tags returned (article skipped)")
                failed += 1

        if not args.dry_run:
            db.commit()
            print(f"\n✅ Done. {success} updated, {failed} skipped.")
        else:
            print(f"\n[DRY RUN] Would update {success} articles, skip {failed}.")

    except Exception as e:
        db.rollback()
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
