"""
Dependency injection module for the Performance Management System.

This module provides reusable dependency functions for FastAPI routes.
"""

from fastapi import Depends, Query, Path, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from pydantic import BaseModel

# Import auth dependencies for easy access
from .auth import (
    oauth2_scheme,
    get_auth_service,
    get_current_user,
    get_current_active_user,
    get_current_manager,
    require_manager_role,
    require_admin_role,
    require_hr_role
)

from app.db.database import get_db
from app.models.employee import Employee
from app.exceptions import EntityNotFoundError, ValidationError


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""
    
    skip: int = 0
    limit: int = 100
    
    class Config:
        validate_assignment = True


class SortParams(BaseModel):
    """Sorting parameters for list endpoints."""
    
    sort_by: Optional[str] = None
    sort_order: str = "asc"
    
    class Config:
        validate_assignment = True


def get_pagination_params(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return")
) -> PaginationParams:
    """Get pagination parameters from query string."""
    return PaginationParams(skip=skip, limit=limit)


def get_sort_params(
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order: asc or desc")
) -> SortParams:
    """Get sorting parameters from query string."""
    return SortParams(sort_by=sort_by, sort_order=sort_order)


async def get_employee_by_id(
    employee_id: int = Path(..., gt=0, description="Employee ID", example=1),
    db: AsyncSession = Depends(get_db)
) -> Employee:
    """
    Get employee by ID or raise 404.
    
    Args:
        employee_id: Employee ID (must be a positive integer)
        db: Database session
        
    Returns:
        Employee: The employee object
        
    Raises:
        ValidationError: If employee_id is not a positive integer
        EntityNotFoundError: If employee is not found
    """
    from sqlalchemy.future import select
    import logging
    
    logger = logging.getLogger(__name__)
    logger.info(f"get_employee_by_id called with employee_id: {employee_id} (type: {type(employee_id)})")
    
    # Additional validation with better error message
    if employee_id <= 0:
        logger.warning(f"Invalid employee_id: {employee_id} - must be positive")
        raise ValidationError("Employee ID must be a positive integer greater than 0")
    
    result = await db.execute(select(Employee).where(Employee.emp_id == employee_id))
    employee = result.scalars().first()
    
    if not employee:
        logger.warning(f"Employee not found with ID: {employee_id}")
        raise EntityNotFoundError("Employee", employee_id)
    
    logger.info(f"Employee found: {employee.emp_id} - {employee.emp_name}")
    return employee


def validate_positive_integer(
    value: int = Path(..., gt=0)
) -> int:
    """Validate that path parameter is a positive integer."""
    return value


def validate_employee_id(
    employee_id: int = Path(
        ..., 
        gt=0, 
        description="Employee ID (must be a positive integer)",
        example=1,
        alias="employee_id"
    )
) -> int:
    """
    Validate employee ID path parameter.
    
    Args:
        employee_id: Employee ID from path
        
    Returns:
        int: Validated employee ID
        
    Raises:
        ValidationError: If employee_id is not a positive integer
    """
    if employee_id <= 0:
        raise ValidationError("Employee ID must be a positive integer greater than 0")
    
    return employee_id


def validate_appraisal_id(
    appraisal_id: int = Path(
        ..., 
        gt=0, 
        description="Appraisal ID (must be a positive integer)",
        example=1,
        alias="appraisal_id"
    )
) -> int:
    """
    Validate appraisal ID path parameter.
    
    Args:
        appraisal_id: Appraisal ID from path
        
    Returns:
        int: Validated appraisal ID
        
    Raises:
        ValidationError: If appraisal_id is not a positive integer
    """
    if appraisal_id <= 0:
        raise ValidationError("Appraisal ID must be a positive integer greater than 0")
    
    return appraisal_id


def validate_ids_list(
    ids: List[int],
    field_name: str = "IDs"
) -> List[int]:
    """Validate a list of IDs."""
    if not ids:
        raise ValidationError(f"{field_name} list cannot be empty")
    
    if len(ids) != len(set(ids)):
        raise ValidationError(f"Duplicate {field_name.lower()} are not allowed")
    
    if any(id_val <= 0 for id_val in ids):
        raise ValidationError(f"All {field_name.lower()} must be positive integers")
    
    return ids


async def validate_employee_exists(
    employee_id: int,
    db: AsyncSession,
    role_name: str = "Employee"
) -> Employee:
    """Validate that an employee exists and return it."""
    from sqlalchemy.future import select
    
    result = await db.execute(select(Employee).where(Employee.emp_id == employee_id))
    employee = result.scalars().first()
    
    if not employee:
        raise EntityNotFoundError(role_name, employee_id)
    
    return employee


def get_search_params(
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Search term"),
    status: Optional[bool] = Query(None, description="Filter by status")
) -> dict:
    """Get search and filter parameters."""
    return {
        "search": search.strip() if search else None,
        "status": status
    }