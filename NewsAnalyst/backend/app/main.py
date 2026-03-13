from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.routes import auth, articles, sources, categories, votes, saves, market
from app.services.scheduler import start_scheduler, stop_scheduler
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    logger.info("Starting NewsAnalyst API...")
    start_scheduler()
    yield
    logger.info("Shutting down NewsAnalyst API...")
    stop_scheduler()


app = FastAPI(
    title="NewsAnalyst API",
    description="Economic & Financial News Aggregator and Analyst",
    version="0.1.0",
    lifespan=lifespan,
)

# Attach limiter to app state so slowapi decorators can find it
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://finlens.io",
        "https://www.finlens.io",
        "https://idea-brown.vercel.app",  # legacy, keep during DNS cutover
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["auth"])
app.include_router(articles.router,   prefix="/api/v1/articles",   tags=["articles"])
app.include_router(votes.router,      prefix="/api/v1/articles",   tags=["votes"])
app.include_router(saves.router,      prefix="/api/v1/articles",   tags=["saves"])
app.include_router(sources.router,    prefix="/api/v1/sources",    tags=["sources"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(market.router,     prefix="/api/v1/market",     tags=["market"])


# ── Health checks ─────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "NewsAnalyst API is running"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy", "env": settings.APP_ENV}


