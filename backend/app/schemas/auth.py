"""
Authentication schemas for the Performance Management System.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from app.schemas.role import RoleResponse


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Request a password reset for the given email."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token and new password."""
    token: str
    new_password: str


class UserInfo(BaseModel):
    """User information schema."""
    emp_id: int
    emp_name: str
    emp_email: str
    role_id: int
    role: RoleResponse
    emp_department: Optional[str] = None
    emp_status: bool

    class Config:
        from_attributes = True