from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    captcha_token: str = ""  # Cloudflare Turnstile token; empty = skip (dev only)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Email verification ─────────────────────────────────────────────────────────

class VerifyEmailRequest(BaseModel):
    token: str


# ── Password reset ─────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


# ── Generic success response ───────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
