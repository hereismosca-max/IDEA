"""
email_guard.py — Multi-layer email validation for registration.

Three checks (applied in order, cheapest first):
  1. Domain blocklist  — known disposable / throwaway providers
  2. MX record check   — domain must have real mail servers (DNS lookup, cached)
  3. Local-part check  — reject obviously auto-generated patterns
"""

from __future__ import annotations

import re
from functools import lru_cache

import dns.resolver
import dns.exception

# ── 1. Disposable / throwaway domain blocklist ────────────────────────────────

DISPOSABLE_DOMAINS: frozenset[str] = frozenset(
    {
        # ── Generic / obvious fake domains ────────────────────────────────────
        "test.com", "example.com", "fake.com", "noreply.com", "nomail.com",
        "trash.com", "junk.com", "nobody.com", "null.com", "invalid.com",
        "email.com",          # commonly used as generic placeholder
        "fuck.com",           # clearly fake / abusive
        "jsjs.com",           # no real mail service
        "kmail.com",          # no real mail service
        "localhost.com",
        # ── Mailinator family ─────────────────────────────────────────────────
        "mailinator.com", "mailinator2.com",
        "trashmail.com", "trashmail.me", "trashmail.net", "trashmail.org",
        "trashmail.io", "trashmail.at", "trashmail.xyz",
        # ── Guerrilla / temp-mail ─────────────────────────────────────────────
        "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
        "guerrillamail.de", "guerrillamail.biz", "guerrillamail.info",
        "grr.la", "spam4.me", "sharklasers.com", "guerrillamailblock.com",
        "temp-mail.org", "tempmail.com", "tempmail.net", "tempmail.io",
        "temp-mail.ru", "getairmail.com", "filzmail.com",
        # ── YOPmail family ────────────────────────────────────────────────────
        "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
        "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
        "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf",
        "monmail.fr.nf",
        # ── 10-minute mail ────────────────────────────────────────────────────
        "10minutemail.com", "10minutemail.net", "10minutemail.org",
        "10minutemail.de", "10minemail.com", "minute-mail.net",
        # ── Other disposable providers ────────────────────────────────────────
        "dispostable.com", "throwam.com", "throwam.net",
        "maildrop.cc", "mailnull.com", "mailnesia.com",
        "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
        "getnada.com", "nada.email",
        "fakeinbox.com", "fakemail.net", "fakemail.com", "fake-mail.net",
        "binkmail.com", "bobmail.info", "dayrep.com", "einrot.com",
        "fleckens.hu", "gustr.com", "jourrapide.com", "objectmail.com",
        "obobbo.com", "rhyta.com", "superrito.com", "teleworm.us",
        "discard.email", "discardmail.com", "discardmail.de",
        "spamherelots.com", "spamhereplease.com", "spamtrap.ro",
        "crapmail.org", "throwaway.email", "mytrashmail.com",
        "sogetthis.com", "trashdevil.com", "trashdevil.de",
        "mailslapping.com", "notmailinator.com", "vomoto.com",
        "incognitomail.org", "incognitomail.net", "trashcanmail.com",
        "spam.la", "spam.su",
        "0-mail.com", "027168.com", "0815.ru", "0815.su",
        "0clickemail.com", "0wnd.net", "0wnd.org",
    }
)


# ── 2. MX record check (cached per domain, TTL via lru_cache) ─────────────────

@lru_cache(maxsize=2048)
def _domain_has_mx(domain: str) -> bool:
    """
    Return True if `domain` has at least one MX record.
    Result is cached in-process (survives across requests, resets on restart).
    On DNS error / timeout, returns True to avoid false positives.
    """
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=4.0)
        return len(answers) > 0
    except dns.resolver.NXDOMAIN:
        # Domain does not exist at all
        return False
    except dns.resolver.NoAnswer:
        # Domain exists but has no MX records
        return False
    except dns.exception.DNSException:
        # Timeout, SERVFAIL, etc. — allow through to avoid blocking real users
        return True


# ── 3. Local-part heuristics ─────────────────────────────────────────────────

# QQ numbers are purely numeric 5-11 digits — always legitimate
_QQ_NUMBER = re.compile(r"^\d{5,11}$")

# Hard patterns that indicate an auto-generated local part
_BOT_LOCAL_PATTERNS = [
    # word_123456789 — bot prefix + underscore + long timestamp/number
    re.compile(r"^[a-z]{1,10}_\d{6,}$"),
    # all-numeric and too long to be a QQ number (>11 digits)
    re.compile(r"^\d{12,}$"),
    # same char repeated 4+ times: aaaaaaa, ffffffff
    re.compile(r"(.)\1{3,}"),
    # short repeating unit ×4+: fefefefefe, ababababab, xyzxyzxyz
    re.compile(r"^(.{1,4})\1{3,}"),
]

_VOWELS = set("aeiou")


def _local_part_is_suspicious(local: str) -> bool:
    """Return True if the email local part looks auto-generated."""
    if _QQ_NUMBER.match(local):
        return False  # QQ numbers are always real

    for pat in _BOT_LOCAL_PATTERNS:
        if pat.search(local):
            return True

    # Vowel check — scaled by string length:
    #   4–9 chars  → require ≥ 1 vowel  (catches "sdss", "qwrt", "dkjfh")
    #   ≥ 10 chars → require vowel ratio > 10 %  (catches "dsfdsafdsfsfdsf")
    # Strings ≤ 3 chars ("mr", "xyz") are too short to judge reliably.
    if len(local) >= 4:
        vowels_found = sum(1 for c in local if c in _VOWELS)
        if len(local) <= 9:
            if vowels_found == 0:
                return True
        else:
            if vowels_found / len(local) < 0.10:
                return True

    return False


# ── Public API ────────────────────────────────────────────────────────────────

def validate_email_for_registration(email: str) -> str | None:
    """
    Run all three checks on `email`.
    Returns None if the email passes, or a human-readable error string if it fails.
    """
    try:
        local, domain = email.lower().rsplit("@", 1)
    except ValueError:
        return "Invalid email address"

    # 1. Domain blocklist
    if domain in DISPOSABLE_DOMAINS:
        return "Please use a real email address to register"

    # 2. MX record — domain must be able to receive mail
    if not _domain_has_mx(domain):
        return "That email domain does not appear to be valid"

    # 3. Local-part heuristics
    if _local_part_is_suspicious(local):
        return "Please use a real email address to register"

    return None


# Keep backward-compat alias used in older code paths
def is_disposable_email(email: str) -> bool:
    """Legacy helper — True if domain is on the blocklist."""
    try:
        domain = email.rsplit("@", 1)[1].lower()
    except IndexError:
        return False
    return domain in DISPOSABLE_DOMAINS
