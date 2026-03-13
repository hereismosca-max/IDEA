import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.email import send_password_reset_email, send_verification_email
from app.core.email_guard import validate_email_for_registration
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserResponse, UpdateProfileRequest
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Token expiry
_VERIFICATION_EXPIRE_HOURS = 24
_RESET_EXPIRE_HOURS = 1


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and send an email verification link."""
    err = validate_email_for_registration(payload.email)
    if err:
        raise HTTPException(status_code=400, detail=err)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = secrets.token_urlsafe(32)

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        email_verification_token=verification_token,
        email_verification_expires_at=_utcnow() + timedelta(hours=_VERIFICATION_EXPIRE_HOURS),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("New user registered: %s", user.email)

    # Non-blocking — registration succeeds even if email service is down
    try:
        send_verification_email(user.email, verification_token)
    except Exception as exc:
        logger.warning("Failed to send verification email to %s: %s", user.email, exc)

    return user


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT access token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(data={"sub": str(user.id)})
    logger.info("User logged in: %s", user.email)
    return TokenResponse(access_token=token)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile (display_name, bio, pronouns, preferred_lang)."""
    _ALLOWED_LANGS = {"default", "en", "zh"}

    if payload.display_name is not None:
        name = payload.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        current_user.display_name = name

    if payload.bio is not None:
        current_user.bio = payload.bio.strip() or None  # empty string → NULL

    if payload.pronouns is not None:
        current_user.pronouns = payload.pronouns.strip() or None

    if payload.preferred_lang is not None:
        if payload.preferred_lang not in _ALLOWED_LANGS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid language preference. Allowed: {', '.join(_ALLOWED_LANGS)}",
            )
        current_user.preferred_lang = payload.preferred_lang

    db.commit()
    db.refresh(current_user)
    logger.info("Profile updated for user: %s", current_user.email)
    return current_user


# ── Email verification ────────────────────────────────────────────────────────

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email address using the token from the verification email."""
    now = _utcnow()
    user = (
        db.query(User)
        .filter(
            User.email_verification_token == payload.token,
            User.email_verified == False,  # noqa: E712
            User.email_verification_expires_at > now,
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=400, detail="Invalid or expired verification link"
        )

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    db.commit()
    logger.info("Email verified: %s", user.email)
    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resend the email verification link (requires login)."""
    if current_user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    new_token = secrets.token_urlsafe(32)
    current_user.email_verification_token = new_token
    current_user.email_verification_expires_at = _utcnow() + timedelta(
        hours=_VERIFICATION_EXPIRE_HOURS
    )
    db.commit()

    try:
        send_verification_email(current_user.email, new_token)
    except Exception as exc:
        logger.warning(
            "Failed to resend verification email to %s: %s", current_user.email, exc
        )

    return MessageResponse(message="Verification email sent")


# ── Password reset ────────────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/hour")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request a password reset link.
    Always returns 200 — never reveals whether the email is registered.
    """
    _SAFE = MessageResponse(
        message="If that email is registered, a reset link has been sent"
    )

    user = (
        db.query(User)
        .filter(User.email == payload.email, User.is_active == True)  # noqa: E712
        .first()
    )
    if not user:
        return _SAFE

    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires_at = _utcnow() + timedelta(hours=_RESET_EXPIRE_HOURS)
    db.commit()

    try:
        send_password_reset_email(user.email, reset_token)
    except Exception as exc:
        logger.warning(
            "Failed to send password reset email to %s: %s", user.email, exc
        )

    return _SAFE


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset the user's password using a valid reset token."""
    now = _utcnow()
    user = (
        db.query(User)
        .filter(
            User.password_reset_token == payload.token,
            User.password_reset_expires_at > now,
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.password_hash = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    db.commit()
    logger.info("Password reset for user: %s", user.email)
    return MessageResponse(message="Password reset successfully")
