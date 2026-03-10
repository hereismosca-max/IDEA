import uuid
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import update as sa_update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
scheduler = BackgroundScheduler()


def run_fetch_job():
    """
    Core scheduled job: fetches news from all active sources and immediately
    runs AI tagging + summary on any newly inserted articles.
    Runs every FETCH_INTERVAL_MINUTES minutes (default: 5).
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
                new_items = []  # track truly new articles for AI processing

                # ── Phase 1: INSERT all fetched items, skip existing URLs ─────
                for item in fetched:
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
                            ai_summary=None,
                            ai_tags=None,
                            ai_score=None,
                            ai_processed_at=None,
                        )
                        .on_conflict_do_nothing(index_elements=["url"])
                    )
                    result = db.execute(stmt)
                    if result.rowcount > 0:
                        new_count += 1
                        new_items.append(item)  # only newly inserted

                db.commit()

                # ── Phase 2: AI tagging + summary only for new articles ───────
                if new_items:
                    no_content_count = 0
                    for item in new_items:
                        ai_result = ai_processor.process(
                            item.title,
                            item.content_snippet or "",
                            url=item.url,
                        )
                        if ai_result.tags or ai_result.summary:
                            # Content available and processed successfully
                            db.execute(
                                sa_update(Article)
                                .where(Article.url == item.url)
                                .values(
                                    ai_summary=ai_result.summary,
                                    ai_tags=ai_result.tags,
                                    ai_score=ai_result.score,   # 0.0–1.0; None if LLM skipped
                                    ai_processed_at=datetime.now(timezone.utc),
                                )
                            )
                        else:
                            # No content (paywalled / bot-blocked) — stamp processed_at
                            # so the article is excluded from the feed by the API filter.
                            db.execute(
                                sa_update(Article)
                                .where(Article.url == item.url)
                                .values(ai_processed_at=datetime.now(timezone.utc))
                            )
                            no_content_count += 1
                    db.commit()
                    logger.info(
                        f"  AI processed {len(new_items)} new articles "
                        f"({len(new_items) - no_content_count} with content, "
                        f"{no_content_count} no-content filtered out)"
                    )

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

        # ── Catch-up: back-fill articles that have no summary yet ──────────
        # Handles articles that existed before OPENAI_API_KEY was active, or
        # whose AI phase was skipped / errored in a previous run.
        # Capped at 20 per run so we comfortably finish within the 5-min window.
        try:
            orphans = (
                db.query(Article)
                .filter(
                    Article.ai_summary.is_(None),
                    Article.ai_processed_at.is_(None),
                    Article.is_active == True,
                )
                .order_by(Article.published_at.desc())
                .limit(20)
                .all()
            )
            if orphans:
                logger.info(f"Catch-up: {len(orphans)} articles need AI tagging")
                no_content_orphans = 0
                for article in orphans:
                    ai_result = ai_processor.process(
                        article.title,
                        article.content_snippet or "",
                        url=article.url,
                    )
                    if ai_result.summary or ai_result.tags:
                        article.ai_summary = ai_result.summary
                        article.ai_tags    = ai_result.tags
                        article.ai_score   = ai_result.score   # 0.0–1.0; None if LLM skipped
                    else:
                        no_content_orphans += 1
                    article.ai_processed_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(
                    f"Catch-up done: "
                    f"{len(orphans) - no_content_orphans} tagged, "
                    f"{no_content_orphans} no-content filtered"
                )
        except Exception as e:
            logger.error(f"Catch-up failed: {e}")
            db.rollback()

    finally:
        db.close()

    logger.info("─── Scheduled fetch job complete ───")


def start_scheduler():
    import threading

    scheduler.add_job(
        run_fetch_job,
        trigger=IntervalTrigger(minutes=settings.FETCH_INTERVAL_MINUTES),
        id="fetch_news",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        f"Scheduler started — interval: every {settings.FETCH_INTERVAL_MINUTES} min"
    )

    # Run the initial fetch in a daemon background thread so the FastAPI event
    # loop is never blocked during app startup.  Railway (and other platforms)
    # send health-check probes shortly after the process starts; if we block the
    # main thread here, the health check times out and the service is restarted
    # in a loop.  Running the job in a thread lets the app bind the port and pass
    # health checks immediately while the first fetch proceeds in the background.
    def _initial_fetch():
        try:
            run_fetch_job()
        except Exception as exc:
            logger.error("Initial background fetch failed: %s", exc)

    thread = threading.Thread(target=_initial_fetch, daemon=True, name="initial-fetch")
    thread.start()
    logger.info("Initial fetch dispatched to background thread")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
