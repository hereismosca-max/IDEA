from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from soccer_predictor.db import init_db
from soccer_predictor.model import get_available_model_families, predict_by_date, train_model
from soccer_predictor.pipeline import sync_range, sync_recent

app = FastAPI(title="Soccer Predictor API", version="0.1.0")


class SyncRangeIn(BaseModel):
    start: str
    end: str


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/models")
def models_api() -> dict:
    return {"available": get_available_model_families()}


@app.post("/sync/recent")
def sync_recent_api(days_back: int = 7, days_forward: int = 2, auto_train: bool = True) -> dict:
    count = sync_recent(days_back=days_back, days_forward=days_forward)
    out: dict = {"upserted": count}
    if auto_train:
        try:
            out["trained"] = train_model(min_samples=300)
        except Exception as exc:
            out["train_error"] = str(exc)
    return out


@app.post("/sync/range")
def sync_range_api(body: SyncRangeIn, auto_train: bool = True) -> dict:
    count = sync_range(body.start, body.end)
    out: dict = {"upserted": count}
    if auto_train:
        try:
            out["trained"] = train_model(min_samples=300)
        except Exception as exc:
            out["train_error"] = str(exc)
    return out


@app.post("/train")
def train_api() -> dict:
    try:
        return train_model()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/predict")
def predict_api(date: str, ticket_type: str = "ALL") -> dict:
    try:
        rows = predict_by_date(target_date=date, ticket_type=ticket_type)
        return {"count": len(rows), "items": rows}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
