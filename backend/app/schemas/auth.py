"""
Authentication schemas for the Performance Management System.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


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


class UserInfo(BaseModel):
    """User information schema."""
    emp_id: int
    emp_name: str
    emp_email: str
    emp_roles: Optional[str] = None
    emp_department: Optional[str] = None
    emp_status: bool

    class Config:
        from_attributes = True