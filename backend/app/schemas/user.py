from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import UserRole
import uuid


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.DOCTOR
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
