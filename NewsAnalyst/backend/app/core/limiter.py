"""
Shared slowapi rate-limiter instance.

Defined here (not in main.py) to avoid circular imports:
  main.py → routes/auth.py → main.py  (would cause ImportError)

IP extraction note (Railway deployment):
  Railway sits behind a reverse proxy; request.client.host is always an
  internal 100.64.x.x Carrier-Grade NAT address.  The real client IP is
  in the X-Forwarded-For header (first value).  We extract it here so
  per-IP rate limiting is applied to actual callers, not the load balancer.
"""

from fastapi import Request
from slowapi import Limiter


def _get_real_ip(request: Request) -> str:
    """
    Extract the caller's real IP from Railway / Cloudflare proxy headers.
    Priority: CF-Connecting-IP > X-Forwarded-For (first hop) > client.host
    """
    # Cloudflare sets this when proxying traffic
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    # Railway / standard proxy sets X-Forwarded-For
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Fallback (Railway internal; all looks like 100.64.x.x)
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_get_real_ip)
