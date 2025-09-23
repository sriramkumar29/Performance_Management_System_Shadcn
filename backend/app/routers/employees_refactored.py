"""Refactored employee router using service layer and dependency injection."""

from fastapi import APIRouter, status, HTTPException, Query
from typing import List, Optional

from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeWithSubordinates
)
from app.dependencies import (
    DatabaseSession,
    EmployeeServiceDep,
    AuthServiceDep,
    CurrentActiveUser
)
from app.middleware.validation import validate_pagination, handle_validation_errors
from app.exceptions import ValidationError, NotFoundError
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenResponse)
@handle_validation_errors
async def login(
    data: LoginRequest, 
    db: DatabaseSession,
    auth_service: AuthServiceDep
):
    """Authenticate user and return tokens."""
    employee = await auth_service.authenticate_user(db, data.email, data.password)
    access_token, refresh_token = auth_service.create_tokens(employee)
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
@handle_validation_errors
async def refresh_token(
    data: RefreshRequest, 
    db: DatabaseSession,
    auth_service: AuthServiceDep
):
    """Refresh access token using refresh token."""
    access_token, refresh_token = await auth_service.refresh_tokens(db, data.refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
@handle_validation_errors
async def create_employee(
    employee: EmployeeCreate,
    db: DatabaseSession,
    employee_service: EmployeeServiceDep
):
    """Create a new employee."""
    try:
        db_employee = await employee_service.create_employee(db, employee)
        return db_employee
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating employee: {str(e)}"
        )


@router.get("/", response_model=List[EmployeeResponse])
@validate_pagination()
@handle_validation_errors
async def get_employees(
    db: DatabaseSession,
    employee_service: EmployeeServiceDep,
    current_user: CurrentActiveUser,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of records to retrieve"),
    include_inactive: bool = Query(False, description="Include inactive employees")
):
    """Get all employees with pagination."""
    employees = await employee_service.get_all_employees(
        db, skip=skip, limit=limit, include_inactive=include_inactive
    )
    return employees


@router.get("/managers", response_model=List[EmployeeResponse])
@handle_validation_errors
async def get_managers(
    db: DatabaseSession,
    employee_service: EmployeeServiceDep,
    current_user: CurrentActiveUser
):
    """Get all employees who can be managers."""
    managers = await employee_service.get_managers(db)
    return managers


@router.get("/{employee_id}", response_model=EmployeeWithSubordinates)
@handle_validation_errors
async def get_employee(
    employee_id: int,
    db: DatabaseSession,
    employee_service: EmployeeServiceDep,
    current_user: CurrentActiveUser
):
    """Get employee by ID."""
    try:
        employee = await employee_service.get_by_id_or_404(db, employee_id)
        return employee
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving employee: {str(e)}"
        )


@router.put("/{employee_id}", response_model=EmployeeResponse)
@handle_validation_errors
async def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: DatabaseSession,
    employee_service: EmployeeServiceDep,
    current_user: CurrentActiveUser
):
    """Update an existing employee."""
    try:
        updated_employee = await employee_service.update_employee(db, employee_id, employee_update)
        return updated_employee
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating employee: {str(e)}"
        )


@router.delete("/{employee_id}")
@handle_validation_errors
async def deactivate_employee(
    employee_id: int,
    db: DatabaseSession,
    employee_service: EmployeeServiceDep,
    current_user: CurrentActiveUser
):
    """Deactivate an employee (soft delete)."""
    try:
        await employee_service.deactivate_employee(db, employee_id)
        return {"message": "Employee deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating employee: {str(e)}"
        )


@router.get("/{employee_id}/subordinates", response_model=List[EmployeeResponse])
@handle_validation_errors
async def get_subordinates(
    employee_id: int,
    db: DatabaseSession,
    employee_service: EmployeeServiceDep,
    current_user: CurrentActiveUser
):
    """Get all subordinates of a manager."""
    try:
        subordinates = await employee_service.get_subordinates(db, employee_id)
        return subordinates
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving subordinates: {str(e)}"
        )