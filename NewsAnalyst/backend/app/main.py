from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.routes import auth, articles, sources, categories, votes
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

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://idea-brown.vercel.app",
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
app.include_router(sources.router,    prefix="/api/v1/sources",    tags=["sources"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])


# ── Health checks ─────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "NewsAnalyst API is running"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy", "env": settings.APP_ENV}
