"""
Pydantic schemas for application roles.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ApplicationRoleBase(BaseModel):
    """Base schema for ApplicationRole."""

    app_role_name: str = Field(..., min_length=2, max_length=100, description="Job position name")

    @field_validator('app_role_name')
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Application role name cannot be empty')
        return v.strip()


class ApplicationRoleCreate(ApplicationRoleBase):
    """Schema for creating an ApplicationRole."""
    pass


class ApplicationRoleUpdate(BaseModel):
    """Schema for updating an ApplicationRole."""

    app_role_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Job position name")

    @field_validator('app_role_name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Application role name cannot be empty')
        return v.strip() if v else v


class ApplicationRoleResponse(ApplicationRoleBase):
    """Schema for ApplicationRole response."""

    app_role_id: int = Field(..., description="Application role ID")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationRoleWithStats(ApplicationRoleResponse):
    """Schema for ApplicationRole with usage statistics."""

    employee_count: int = Field(0, description="Number of employees with this role")
    template_header_count: int = Field(0, description="Number of template headers for this role")

    class Config:
        from_attributes = True
