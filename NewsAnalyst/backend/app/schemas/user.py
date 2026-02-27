import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    preferred_lang: str
    is_active: bool
    email_verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
