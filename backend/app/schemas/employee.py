from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class EmployeeBase(BaseModel):
    """Base schema for Employee."""
    
    emp_name: str
    emp_email: EmailStr
    emp_department: str
    emp_roles: str
    emp_roles_level: int
    emp_reporting_manager_id: Optional[int] = None
    emp_status: bool = True


class EmployeeCreate(EmployeeBase):
    """Schema for creating an Employee."""
    pass


class EmployeeUpdate(BaseModel):
    """Schema for updating an Employee."""
    
    emp_name: Optional[str] = None
    emp_email: Optional[EmailStr] = None
    emp_department: Optional[str] = None
    emp_roles: Optional[str] = None
    emp_roles_level: Optional[int] = None
    emp_reporting_manager_id: Optional[int] = None
    emp_status: Optional[bool] = None


class EmployeeResponse(EmployeeBase):
    """Schema for Employee response."""
    
    emp_id: int
    
    class Config:
        from_attributes = True


class EmployeeWithSubordinates(EmployeeResponse):
    """Schema for Employee with subordinates."""
    
    subordinates: List["EmployeeResponse"] = []
    
    class Config:
        from_attributes = True
