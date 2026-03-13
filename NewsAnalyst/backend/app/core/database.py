from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Verify connections before using (handles stale connections)
    pool_size=10,            # 10 persistent connections to the Transaction Pooler.
                             # PgBouncer (Transaction mode) multiplexes these across many
                             # concurrent requests, so 10 handles 100+ simultaneous users.
                             # NOTE: Session Pooler (port 5432) allows ~15 total; by switching
                             # to Transaction Pooler (port 6543) we removed that hard cap.
    max_overflow=15,         # Up to 25 total SQLAlchemy connections under burst load.
    pool_timeout=30,         # Raise error after 30 s waiting for a connection slot.
    pool_recycle=1800,       # Recycle connections every 30 min to avoid server-side timeouts.
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db():
    """
    FastAPI dependency.
    Yields a database session per request, closes it when done.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
