from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List

from app.constants import EMPLOYEE_EMAIL_ADDRESS_DESC


class EmployeeBase(BaseModel):
    """Base schema for Employee."""
    
    emp_name: str = Field(..., min_length=2, max_length=100, description="Employee full name")
    emp_email: EmailStr = Field(..., description=EMPLOYEE_EMAIL_ADDRESS_DESC)
    emp_department: str = Field(..., min_length=2, max_length=50, description="Employee department")
    emp_roles: str = Field(..., min_length=2, max_length=50, description="Employee role")
    emp_roles_level: int = Field(..., ge=1, le=10, description="Role level (1-10)")
    emp_reporting_manager_id: Optional[int] = Field(None, ge=1, description="Reporting manager ID")
    emp_status: bool = Field(True, description="Employee active status")
    
    @field_validator('emp_name')
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Employee name cannot be empty')
        return v.strip()
    
    @field_validator('emp_department')
    @classmethod
    def validate_department(cls, v):
        if not v.strip():
            raise ValueError('Department cannot be empty')
        return v.strip()
    
    @field_validator('emp_roles')
    @classmethod
    def validate_roles(cls, v):
        if not v.strip():
            raise ValueError('Role cannot be empty')
        return v.strip()


class EmployeeCreate(EmployeeBase):
    """Schema for creating an Employee."""
    
    password: str = Field(..., min_length=8, max_length=100, description="Employee password")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class EmployeeUpdate(BaseModel):
    """Schema for updating an Employee."""
    
    emp_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Employee full name")
    emp_email: Optional[EmailStr] = Field(None, description=EMPLOYEE_EMAIL_ADDRESS_DESC)
    emp_department: Optional[str] = Field(None, min_length=2, max_length=50, description="Employee department")
    emp_roles: Optional[str] = Field(None, min_length=2, max_length=50, description="Employee role")
    emp_roles_level: Optional[int] = Field(None, ge=1, le=10, description="Role level (1-10)")
    emp_reporting_manager_id: Optional[int] = Field(None, ge=1, description="Reporting manager ID")
    emp_status: Optional[bool] = Field(None, description="Employee active status")
    
    @field_validator('emp_name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Employee name cannot be empty')
        return v.strip() if v else v
    
    @field_validator('emp_department')
    @classmethod
    def validate_department(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Department cannot be empty')
        return v.strip() if v else v
    
    @field_validator('emp_roles')
    @classmethod
    def validate_roles(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Role cannot be empty')
        return v.strip() if v else v


class EmployeeResponse(EmployeeBase):
    """Schema for Employee response."""
    
    emp_id: int = Field(..., description="Employee ID")
    
    class Config:
        from_attributes = True


class EmployeeWithSubordinates(EmployeeResponse):
    """Schema for Employee with subordinates."""
    
    subordinates: List["EmployeeResponse"] = Field(default=[], description="List of subordinates")
    
    class Config:
        from_attributes = True


# Schemas for authentication
class LoginRequest(BaseModel):
    """Schema for login request."""
    
    email: EmailStr = Field(..., description=EMPLOYEE_EMAIL_ADDRESS_DESC)
    password: str = Field(..., min_length=1, description="Employee password")


class TokenResponse(BaseModel):
    """Schema for token response."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")


class RefreshRequest(BaseModel):
    """Schema for token refresh request."""
    
    refresh_token: str = Field(..., description="JWT refresh token")


class EmployeeProfile(EmployeeResponse):
    """Schema for employee profile (without sensitive data)."""
    
    class Config:
        from_attributes = True
