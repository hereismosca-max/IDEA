"""
Email sending utilities using the Resend service.

Set RESEND_API_KEY in the environment to enable email delivery.
If the key is empty, emails are skipped and a warning is logged
(useful for local development without email setup).
"""
import resend

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_VERIFICATION_HTML = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Verify your email</h2>
  <p style="color: #555; line-height: 1.6; margin-bottom: 28px;">
    Thanks for signing up for FinLens! Click the button below to confirm your email address.
    This link expires in <strong>24 hours</strong>.
  </p>
  <a href="{link}" style="display: inline-block; background: #1d4ed8; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
    Verify Email
  </a>
  <p style="color: #999; font-size: 13px; margin-top: 32px;">
    If you didn't create an account, you can safely ignore this email.
  </p>
</body>
</html>
"""

_RESET_HTML = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Reset your password</h2>
  <p style="color: #555; line-height: 1.6; margin-bottom: 28px;">
    We received a request to reset your FinLens password. Click the button below to choose a new one.
    This link expires in <strong>1 hour</strong>.
  </p>
  <a href="{link}" style="display: inline-block; background: #1d4ed8; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
    Reset Password
  </a>
  <p style="color: #999; font-size: 13px; margin-top: 32px;">
    If you didn't request a password reset, you can safely ignore this email.
  </p>
</body>
</html>
"""


def _send(*, to: str, subject: str, html: str) -> None:
    """Internal helper — sends via Resend. Skips gracefully if no API key."""
    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY not set — skipping email to %s (subject: %s)", to, subject
        )
        return
    resend.api_key = settings.RESEND_API_KEY
    try:
        result = resend.Emails.send(
            {
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        logger.info("Email sent to %s — %s | Resend id: %s", to, subject, getattr(result, "id", result))
    except Exception as exc:
        err_str = str(exc)
        if "429" in err_str or "rate_limit" in err_str.lower() or "too many" in err_str.lower():
            logger.error(
                "⚠️  RESEND QUOTA EXHAUSTED (429) — could not email %s.\n"
                "  → Check usage at https://resend.com/overview\n"
                "  → Free tier: 100/day, 3 000/month. Upgrade or wait for reset.\n"
                "  → The user can retry via the 'Resend email' button on the site.",
                to,
            )
        else:
            logger.error("Resend API error sending to %s: %s", to, exc)
        raise  # re-raise so caller can handle/log


def send_verification_email(to_email: str, token: str) -> None:
    """Send an email-verification link to a newly registered user."""
    link = f"{settings.FRONTEND_BASE_URL}/en/verify-email?token={token}"
    _send(
        to=to_email,
        subject="Verify your email — FinLens",
        html=_VERIFICATION_HTML.format(link=link),
    )


def send_password_reset_email(to_email: str, token: str) -> None:
    """Send a password-reset link to a user who requested it."""
    link = f"{settings.FRONTEND_BASE_URL}/en/reset-password?token={token}"
    _send(
        to=to_email,
        subject="Reset your password — FinLens",
        html=_RESET_HTML.format(link=link),
    )
