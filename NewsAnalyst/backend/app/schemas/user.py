import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    preferred_lang: str
    is_active: bool
    email_verified: bool = False
    created_at: datetime
    bio: Optional[str] = None
    pronouns: Optional[str] = None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    """PATCH /auth/me — all fields optional, only provided fields are updated."""
    display_name: Optional[str] = None
    bio: Optional[str] = None
    pronouns: Optional[str] = None
    preferred_lang: Optional[str] = None  # 'default' | 'en' | 'zh'
