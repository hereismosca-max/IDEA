"""
Backfill AI Summaries
=====================
One-time script to generate AI summaries for all existing articles that
currently have ai_summary = NULL (i.e. articles processed before this
feature was added).

For each article the script:
  1. Fetches the full article text from the article URL (via content_fetcher).
  2. Calls GPT-4o-mini to generate summary + re-extract tags.
  3. Writes ai_summary to the DB.
  4. Preserves existing ai_tags if the new call fails to produce tags.

Usage (from backend/ directory, with venv active):
    python scripts/backfill_ai_summaries.py [--limit N] [--dry-run]

Options:
    --limit N    Process at most N articles (default: all)
    --dry-run    Print results without writing to DB
"""

import sys
import time
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Allow imports from backend/app/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.article import Article


def main():
    parser = argparse.ArgumentParser(description="Backfill AI summaries for existing articles")
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
        # Target: active articles with no summary yet
        query = (
            db.query(Article)
            .filter(Article.ai_summary.is_(None), Article.is_active == True)
            .order_by(Article.published_at.desc())
        )
        if args.limit:
            query = query.limit(args.limit)
        articles = query.all()

        total = len(articles)
        print(f"Found {total} articles without AI summaries. Starting...\n")
        if args.dry_run:
            print("[DRY RUN — no writes to DB]\n")

        success = 0
        failed  = 0

        for i, article in enumerate(articles, 1):
            print(f"[{i}/{total}] {article.title[:80]}...")
            result = processor.process(
                article.title,
                article.content_snippet or "",
                url=article.url,
            )

            has_summary = bool(result.summary)
            has_tags    = bool(result.tags)

            if has_summary or has_tags:
                print(f"  ✓ summary: {(result.summary or '')[:80]}…")
                if has_tags:
                    print(f"    tags: {result.tags}")
                if not args.dry_run:
                    article.ai_summary = result.summary
                    # Preserve pre-existing tags if new call didn't return any
                    if has_tags:
                        article.ai_tags = result.tags
                    article.ai_processed_at = datetime.now(timezone.utc)
                success += 1
            else:
                # No content available (paywalled / unfetchable).
                # Stamp ai_processed_at so the API filter can hide this article.
                print(f"  ✗ no content — marking as processed (will be filtered from feed)")
                if not args.dry_run:
                    article.ai_processed_at = datetime.now(timezone.utc)
                failed += 1

            # Commit in batches of 10 to avoid holding a huge transaction open
            if not args.dry_run and i % 10 == 0:
                db.commit()
                print(f"  [committed batch at {i}]")

            time.sleep(0.5)  # rate-limit buffer between articles

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
