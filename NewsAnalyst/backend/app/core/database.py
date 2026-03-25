from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"prepare_threshold": None},  # Disable psycopg3 prepared statements (required for PgBouncer transaction mode)
    pool_pre_ping=True,      # Verify connections before using (handles stale connections)
    pool_size=5,             # 5 persistent connections to the Transaction Pooler.
                             # PgBouncer (Transaction mode) multiplexes these efficiently;
                             # smaller pool means less memory pressure and faster checkout.
                             # NOTE: Session Pooler (port 5432) allows ~15 total; by switching
                             # to Transaction Pooler (port 6543) we removed that hard cap.
    max_overflow=10,         # Up to 15 total SQLAlchemy connections under burst load.
                             # Reduced from 25 to prevent connection pool avalanche under attack.
    pool_timeout=5,          # Fail fast: raise error after 5 s waiting for a connection slot.
                             # Previously 30 s — long waits cascade into full pool exhaustion.
    pool_recycle=600,        # Recycle connections every 10 min (was 30 min) to flush stale ones.
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
