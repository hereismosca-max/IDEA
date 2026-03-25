# NewsAnalyst

Economic & Financial News Aggregator and Analyst

**Live:** https://www.finlens.io | **API:** https://idea-production.up.railway.app/docs

## Overview

NewsAnalyst aggregates financial news from top English-language sources (Financial Times, CNBC, BBC Business, Yahoo Finance, MarketWatch), filters relevant content, and presents objective summaries — cutting through clickbait to deliver real economic intelligence.

## Project Structure

```
NewsAnalyst/
├── frontend/     # Next.js 14 + TypeScript + Tailwind CSS
├── backend/      # Python FastAPI + SQLAlchemy + APScheduler
└── *.md          # Project documentation
```

## Documentation

| File | Description |
|------|-------------|
| [ProductContent.md](ProductContent.md) | What this is and why |
| [ProjectArchitecture.md](ProjectArchitecture.md) | System design and roadmap |
| [DatabaseStructure.md](DatabaseStructure.md) | Table schemas |
| [CODEBASE.md](CODEBASE.md) | Code guide for developers |
| [TODO.md](TODO.md) | Current tasks |
| [DevLog.md](DevLog.md) | Development journal |
| [EditionLog.md](EditionLog.md) | Version history |

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your values
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # Fill in your values
npm run dev
```

API docs available at: `http://localhost:8000/docs`

## Deployment

| Service | Provider | URL | Cost |
|---------|----------|-----|------|
| Frontend | Vercel | https://www.finlens.io | Free |
| Backend | Railway | https://idea-production.up.railway.app | ~$10/mo |
| Database | Supabase Pro | — | $25/mo |

## Current Status

**v0.1.0** — Phase 1 complete (2026-02-27)
- 5 news sources fetching every 6 hours (164+ articles)
- REST API with pagination
- Basic frontend with news card grid
- Full deployment live
