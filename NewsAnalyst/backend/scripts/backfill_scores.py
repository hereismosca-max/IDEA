"""
Backfill AI Importance Scores
==============================
Assigns importance scores (1–100, stored as 0.0–1.0 Float) to all articles
that already have an ai_summary but no ai_score yet.

Uses GPT-4o-mini via scorer.py — inputs are title + ai_summary + ai_tags
already stored in the DB, so NO web fetching is required.

Estimated cost: ~3 400 articles × ~300 input tokens × $0.15/1M = ~$0.15 total.
Estimated time: ~3 400 articles × 0.3 s delay ≈ 17 min (or run with --batch).

Usage
-----
    # From the backend/ directory with venv active:
    python scripts/backfill_scores.py

    # Dry-run (no writes, just print what would happen):
    python scripts/backfill_scores.py --dry-run

    # Limit to N articles (useful for testing a small batch first):
    python scripts/backfill_scores.py --limit 50

    # Adjust inter-call delay to avoid rate limits (default 0.3 s):
    python scripts/backfill_scores.py --delay 0.5
"""

import argparse
import sys
import time
from pathlib import Path

# Allow running from either the backend/ directory or the project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.scorer import score_article
from app.utils.logger import get_logger

logger = get_logger("backfill_scores")


def main(dry_run: bool = False, limit: int | None = None, delay: float = 0.3) -> None:
    if not settings.OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY is not set — aborting.")
        sys.exit(1)

    db = SessionLocal()

    try:
        # Fetch articles that have a summary but no score yet
        query = text("""
            SELECT id, title, ai_summary, ai_tags
            FROM articles
            WHERE ai_summary IS NOT NULL
              AND ai_score IS NULL
            ORDER BY published_at DESC
            LIMIT :lim
        """)
        rows = db.execute(query, {"lim": limit or 999_999}).fetchall()

    finally:
        db.close()

    total = len(rows)
    if total == 0:
        logger.info("Nothing to backfill — all articles already have ai_score.")
        return

    logger.info(
        f"Starting backfill: {total} articles to score"
        + (" (DRY RUN — no writes)" if dry_run else "")
    )

    scored = 0
    errors = 0

    for i, row in enumerate(rows, 1):
        article_id  = row[0]
        title       = row[1]
        ai_summary  = row[2]
        ai_tags     = row[3]  # already a dict (SQLAlchemy deserialises JSONB)

        try:
            score_int = score_article(
                api_key=settings.OPENAI_API_KEY,
                title=title,
                ai_summary=ai_summary,
                ai_tags=ai_tags,
                delay=delay,
            )
            score_float = round(score_int / 100.0, 4)

            if dry_run:
                logger.info(f"[{i}/{total}] DRY — '{title[:60]}' → {score_int}/100")
            else:
                db = SessionLocal()
                try:
                    db.execute(
                        text("UPDATE articles SET ai_score = :score WHERE id = :id"),
                        {"score": score_float, "id": article_id},
                    )
                    db.commit()
                finally:
                    db.close()

                scored += 1
                if i % 50 == 0 or i == total:
                    logger.info(f"  Progress: {i}/{total} scored ({errors} errors)")

        except Exception as e:
            errors += 1
            logger.error(f"[{i}/{total}] Failed for '{title[:60]}': {e}")
            time.sleep(1)   # brief pause on unexpected error before continuing

    logger.info(
        f"Backfill complete: {scored} scored, {errors} errors"
        + (" (DRY RUN)" if dry_run else "")
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill ai_score for existing articles")
    parser.add_argument("--dry-run", action="store_true", help="Print scores without writing to DB")
    parser.add_argument("--limit",   type=int, default=None, help="Max articles to process")
    parser.add_argument("--delay",   type=float, default=0.3, help="Seconds between API calls")
    args = parser.parse_args()

    main(dry_run=args.dry_run, limit=args.limit, delay=args.delay)
