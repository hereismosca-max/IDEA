import uuid
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
scheduler = BackgroundScheduler()


def run_fetch_job():
    """
    Core scheduled job: fetches news from all active sources.
    Runs every FETCH_INTERVAL_HOURS hours (default: 6).
    Also runs once immediately on application startup.
    """
    # Local imports to avoid circular dependency issues at startup
    from app.services.fetcher.registry import NEWS_SOURCES
    from app.services.fetcher.rss import RSSFetcher
    from app.services.ai.processor import ai_processor
    from app.core.database import SessionLocal
    from app.models.article import Article
    from app.models.source import Source, FetchLog

    logger.info("─── Scheduled fetch job started ───")
    db = SessionLocal()

    try:
        for source_config in NEWS_SOURCES:
            source = (
                db.query(Source)
                .filter(Source.name == source_config["name"])
                .first()
            )
            if not source or not source.is_active:
                logger.warning(f"Source not found or inactive: {source_config['name']}")
                continue

            # Start fetch log
            log = FetchLog(source_id=source.id, status="running")
            db.add(log)
            db.commit()

            try:
                fetcher = RSSFetcher(
                    source_name=source.name,
                    rss_url=source.rss_url,
                    language=source.language,
                )
                fetched = fetcher.fetch()
                new_count = 0

                for item in fetched:
                    # AI processing (passthrough for Phase 1/2)
                    ai_result = ai_processor.process(
                        item.title, item.content_snippet or ""
                    )

                    # Use INSERT ... ON CONFLICT DO NOTHING to safely skip duplicates
                    stmt = (
                        pg_insert(Article)
                        .values(
                            id=uuid.uuid4(),
                            source_id=source.id,
                            title=item.title,
                            url=item.url,
                            content_snippet=item.content_snippet,
                            published_at=item.published_at,
                            language=item.language,
                            is_active=True,
                            ai_summary=ai_result.summary,
                            ai_tags=ai_result.tags,
                            ai_score=ai_result.score,
                        )
                        .on_conflict_do_nothing(index_elements=["url"])
                    )
                    result = db.execute(stmt)
                    if result.rowcount > 0:
                        new_count += 1

                db.commit()

                # Update fetch log — success
                log.finished_at = datetime.now(timezone.utc)
                log.articles_found = len(fetched)
                log.articles_new = new_count
                log.status = "success"
                db.commit()

                logger.info(
                    f"✓ {source.name}: {len(fetched)} fetched, {new_count} new"
                )

            except Exception as e:
                logger.error(f"✗ {source.name}: fetch failed — {e}")
                db.rollback()
                log.status = "failed"
                log.error_message = str(e)
                log.finished_at = datetime.now(timezone.utc)
                db.commit()

    finally:
        db.close()

    logger.info("─── Scheduled fetch job complete ───")


def start_scheduler():
    scheduler.add_job(
        run_fetch_job,
        trigger=IntervalTrigger(hours=settings.FETCH_INTERVAL_HOURS),
        id="fetch_news",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        f"Scheduler started — interval: every {settings.FETCH_INTERVAL_HOURS}h"
    )
    # Run once immediately so news is available right after startup
    run_fetch_job()


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
