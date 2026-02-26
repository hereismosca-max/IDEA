from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from datetime import datetime
from zoneinfo import ZoneInfo

from soccer_predictor.config import SETTINGS
from soccer_predictor.db import init_db, reset_db
from soccer_predictor.model import (
    FEATURE_GROUPS,
    get_available_model_families,
    optimize_model,
    predict_by_date,
    train_model,
)
from soccer_predictor.pipeline import sync_date, sync_range, sync_recent


def _parse_feature_groups(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    groups = [x.strip() for x in raw.split(",") if x.strip()]
    if not groups:
        return None
    valid = set(FEATURE_GROUPS.keys())
    out = [g for g in groups if g in valid]
    if not out:
        return None
    return out


def _parse_float_list(raw: str | None) -> list[float] | None:
    if not raw:
        return None
    out: list[float] = []
    for x in raw.split(","):
        s = x.strip()
        if not s:
            continue
        try:
            out.append(float(s))
        except Exception:
            pass
    return out or None


def _parse_capacities(raw: str | None) -> list[int | None] | None:
    if not raw:
        return None
    out: list[int | None] = []
    for x in raw.split(","):
        s = x.strip().lower()
        if not s:
            continue
        if s in {"all", "none", "full"}:
            out.append(None)
            continue
        try:
            out.append(int(s))
        except Exception:
            pass
    return out or None


def _parse_model_list(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    out = [x.strip() for x in raw.split(",") if x.strip()]
    return out or None


def main() -> None:
    china_today = datetime.now(ZoneInfo(SETTINGS.market_timezone)).date()
    parser = argparse.ArgumentParser(description="Soccer predictor CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init-db")

    p_date = sub.add_parser("sync-date")
    p_date.add_argument("--date", required=True, help="YYYY-MM-DD")
    p_date.add_argument("--train", action="store_true")
    p_date.add_argument("--no-train", action="store_true")
    p_date.add_argument("--min-samples", type=int, default=300)
    p_date.add_argument("--feature-groups", default=None, help="comma separated feature groups")
    p_date.add_argument("--model-family", default="auto")

    p_range = sub.add_parser("sync-range")
    p_range.add_argument("--start", required=True, help="YYYY-MM-DD")
    p_range.add_argument("--end", required=True, help="YYYY-MM-DD")
    p_range.add_argument("--workers", type=int, default=1)
    p_range.add_argument("--train", action="store_true")
    p_range.add_argument("--no-train", action="store_true")
    p_range.add_argument("--min-samples", type=int, default=300)
    p_range.add_argument("--feature-groups", default=None, help="comma separated feature groups")
    p_range.add_argument("--model-family", default="auto")

    p_recent = sub.add_parser("sync-recent")
    p_recent.add_argument("--days-back", type=int, default=7)
    p_recent.add_argument("--days-forward", type=int, default=2)
    p_recent.add_argument("--workers", type=int, default=1)
    p_recent.add_argument("--train", action="store_true")
    p_recent.add_argument("--no-train", action="store_true")
    p_recent.add_argument("--min-samples", type=int, default=300)
    p_recent.add_argument("--feature-groups", default=None, help="comma separated feature groups")
    p_recent.add_argument("--model-family", default="auto")

    p_train = sub.add_parser("train")
    p_train.add_argument("--min-samples", type=int, default=300)
    p_train.add_argument("--start-date", default=None, help="YYYY-MM-DD, default from config")
    p_train.add_argument("--feature-groups", default=None, help="comma separated feature groups")
    p_train.add_argument("--model-family", default="auto")

    p_reset = sub.add_parser("reset-db")

    p_rebuild = sub.add_parser("rebuild-from-date")
    p_rebuild.add_argument("--start", default="2022-01-01", help="YYYY-MM-DD")
    p_rebuild.add_argument(
        "--end",
        default=(china_today + timedelta(days=2)).isoformat(),
        help="YYYY-MM-DD",
    )
    p_rebuild.add_argument("--workers", type=int, default=8)
    p_rebuild.add_argument("--min-samples", type=int, default=300)
    p_rebuild.add_argument("--feature-groups", default=None, help="comma separated feature groups")
    p_rebuild.add_argument("--model-family", default="auto")

    p_predict = sub.add_parser("predict")
    p_predict.add_argument("--date", required=True, help="YYYY-MM-DD")
    p_predict.add_argument("--ticket-type", default="ALL", choices=["ALL", "JCZQ", "BJDC"])

    sub.add_parser("models")

    p_opt = sub.add_parser("optimize")
    p_opt.add_argument("--min-samples", type=int, default=300)
    p_opt.add_argument("--start-date", default=None, help="YYYY-MM-DD, default from config")
    p_opt.add_argument("--feature-groups", default=None, help="comma separated feature groups")
    p_opt.add_argument("--capacities", default=None, help="e.g. 1500,3000,5000,all")
    p_opt.add_argument("--split-ratios", default=None, help="e.g. 0.75,0.8")
    p_opt.add_argument("--validation-size", type=int, default=3000)
    p_opt.add_argument("--model-candidates", default=None, help="e.g. logreg,hgbt,lightgbm")
    p_opt.add_argument("--search-mode", default="standard", choices=["fast", "standard", "full"])
    p_opt.add_argument("--weighted", action="store_true")
    p_opt.add_argument("--no-weighted", action="store_true")
    p_opt.add_argument("--auto-weighted", action="store_true")

    args = parser.parse_args()

    if args.cmd == "init-db":
        init_db()
        print(json.dumps({"ok": True, "msg": "db initialized"}, ensure_ascii=False))
        return

    if args.cmd == "models":
        print(json.dumps({"ok": True, "available": get_available_model_families()}, ensure_ascii=False))
        return

    if args.cmd == "optimize":
        weighted: bool | None = True
        if args.auto_weighted:
            weighted = None
        elif args.no_weighted:
            weighted = False
        elif args.weighted:
            weighted = True

        out = optimize_model(
            min_samples=args.min_samples,
            train_start_date=args.start_date,
            feature_group_candidates=_parse_feature_groups(args.feature_groups),
            capacities=_parse_capacities(args.capacities),
            split_ratio_candidates=_parse_float_list(args.split_ratios),
            validation_size=args.validation_size,
            model_candidates=_parse_model_list(args.model_candidates),
            weighted=weighted,
            search_mode=args.search_mode,
        )
        print(json.dumps({"ok": True, "result": out}, ensure_ascii=False))
        return

    if args.cmd == "sync-date":
        n = sync_date(args.date)
        out = {"ok": True, "upserted": n}
        should_train = args.train and not args.no_train
        feature_groups = _parse_feature_groups(args.feature_groups)
        if should_train:
            try:
                out["trained"] = train_model(
                    min_samples=args.min_samples,
                    feature_groups=feature_groups,
                    model_family=args.model_family,
                )
            except Exception as e:
                out["train_error"] = str(e)
        print(json.dumps(out, ensure_ascii=False))
        return

    if args.cmd == "sync-range":
        n = sync_range(args.start, args.end, workers=args.workers)
        out = {"ok": True, "upserted": n}
        should_train = args.train and not args.no_train
        feature_groups = _parse_feature_groups(args.feature_groups)
        if should_train:
            try:
                out["trained"] = train_model(
                    min_samples=args.min_samples,
                    feature_groups=feature_groups,
                    model_family=args.model_family,
                )
            except Exception as e:
                out["train_error"] = str(e)
        print(json.dumps(out, ensure_ascii=False))
        return

    if args.cmd == "sync-recent":
        n = sync_recent(
            days_back=args.days_back,
            days_forward=args.days_forward,
            workers=args.workers,
        )
        out = {"ok": True, "upserted": n}
        should_train = args.train and not args.no_train
        feature_groups = _parse_feature_groups(args.feature_groups)
        if should_train:
            try:
                out["trained"] = train_model(
                    min_samples=args.min_samples,
                    feature_groups=feature_groups,
                    model_family=args.model_family,
                )
            except Exception as e:
                out["train_error"] = str(e)
        print(json.dumps(out, ensure_ascii=False))
        return

    if args.cmd == "train":
        metrics = train_model(
            min_samples=args.min_samples,
            train_start_date=args.start_date,
            feature_groups=_parse_feature_groups(args.feature_groups),
            model_family=args.model_family,
        )
        print(json.dumps({"ok": True, "metrics": metrics}, ensure_ascii=False))
        return

    if args.cmd == "reset-db":
        deleted = reset_db()
        print(json.dumps({"ok": True, "deleted": deleted}, ensure_ascii=False))
        return

    if args.cmd == "rebuild-from-date":
        deleted = reset_db()
        upserted = sync_range(args.start, args.end, workers=args.workers)
        trained: dict | None = None
        train_error: str | None = None
        try:
            trained = train_model(
                min_samples=args.min_samples,
                train_start_date=args.start,
                feature_groups=_parse_feature_groups(args.feature_groups),
                model_family=args.model_family,
            )
        except Exception as e:
            train_error = str(e)
        print(
            json.dumps(
                {
                    "ok": True,
                    "deleted": deleted,
                    "upserted": upserted,
                    "trained": trained,
                    "train_error": train_error,
                    "start": args.start,
                    "end": args.end,
                },
                ensure_ascii=False,
            )
        )
        return

    if args.cmd == "predict":
        rows = predict_by_date(args.date, ticket_type=args.ticket_type)
        print(json.dumps({"ok": True, "count": len(rows), "items": rows}, ensure_ascii=False))
        return


if __name__ == "__main__":
    main()
