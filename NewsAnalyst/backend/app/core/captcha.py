"""
captcha.py — Cloudflare Turnstile server-side token verification.

If TURNSTILE_SECRET_KEY is not set (e.g. local dev without .env),
verification is skipped so development is not blocked.
"""

from __future__ import annotations

import httpx

from app.core.config import settings

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile_token(token: str, remote_ip: str | None = None) -> bool:
    """
    Call Cloudflare's siteverify API and return True if the token is valid.
    Fails open on network errors to avoid blocking legitimate users.
    """
    if not settings.TURNSTILE_SECRET_KEY:
        # Not configured — skip (dev/test mode)
        return True

    payload: dict[str, str] = {
        "secret": settings.TURNSTILE_SECRET_KEY,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(_VERIFY_URL, json=payload)
            return bool(resp.json().get("success", False))
    except Exception:
        # Network error, timeout, etc. — fail open
        return True
