from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    tty_base_url: str = os.getenv("TTY_BASE_URL", "https://sport.ttyingqiu.com/sportdata/f")
    tty_agent_id: str = os.getenv("TTY_AGENT_ID", "jcob")
    tty_platform: str = os.getenv("TTY_PLATFORM", "web")
    tty_app_version: str = os.getenv("TTY_APP_VERSION", "1.0.0")
    tty_from: str = os.getenv("TTY_FROM", "web")

    tty_jczq_static_url: str = os.getenv(
        "TTY_JCZQ_STATIC_URL",
        "https://www.ttyingqiu.com/static/no_cache/league/zc/jsbf/ttyq2020/jczq/jsbf_{date}.json",
    )
    tty_bd_static_url: str = os.getenv(
        "TTY_BD_STATIC_URL",
        "https://www.ttyingqiu.com/static/no_cache/league/zc/jsbf/ttyq2020/bd/jsbf_{date}.json",
    )

    db_path: str = os.getenv("SOCCER_DB_PATH", "./data/soccer.sqlite")
    model_path: str = os.getenv("SOCCER_MODEL_PATH", "./models/latest.joblib")
    news_feature_path: str = os.getenv("SOCCER_NEWS_FEATURE_PATH", "./data/news_features.csv")
    train_start_date: str = os.getenv("SOCCER_TRAIN_START_DATE", "2022-01-01")
    market_timezone: str = os.getenv("SOCCER_MARKET_TIMEZONE", "Asia/Shanghai")
    retrain_min_new_samples: int = int(os.getenv("SOCCER_RETRAIN_MIN_NEW_SAMPLES", "200"))
    retrain_hour_cn: int = int(os.getenv("SOCCER_RETRAIN_HOUR_CN", "6"))
    retrain_minute_cn: int = int(os.getenv("SOCCER_RETRAIN_MINUTE_CN", "15"))

    api_host: str = os.getenv("SOCCER_API_HOST", "127.0.0.1")
    api_port: int = int(os.getenv("SOCCER_API_PORT", "8000"))


SETTINGS = Settings()
