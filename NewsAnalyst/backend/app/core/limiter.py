"""
Shared slowapi rate-limiter instance.

Defined here (not in main.py) to avoid circular imports:
  main.py → routes/auth.py → main.py  (would cause ImportError)
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
