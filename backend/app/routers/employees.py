"""
Employee router for the Performance Management System.

This module provides REST API endpoints for employee management
with proper validation, error handling, and service layer integration.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.database import get_db
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeWithSubordinates,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    EmployeeProfile
)
from app.services.employee_service import EmployeeService
from app.services.auth_service import AuthService
from app.routers.auth import get_current_user, get_current_active_user
from app.dependencies import (
    get_pagination_params,
    get_search_params,
    get_employee_by_id,
    PaginationParams
)

router = APIRouter()


def get_employee_service() -> EmployeeService:
    """Dependency to get employee service instance."""
    return EmployeeService()


def get_auth_service() -> AuthService:
    """Dependency to get auth service instance."""
    return AuthService()


# Authentication endpoints
@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Employee login endpoint.
    
    Args:
        data: Login credentials (email and password)
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: Access and refresh tokens
        
    Raises:
        UnauthorizedError: If credentials are invalid
    """
    tokens = await auth_service.login(
        db, 
        email=data.email, 
        password=data.password
    )
    
    return TokenResponse(**tokens)


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Refresh access token using refresh token.
    
    Args:
        data: Refresh token request
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: New access and refresh tokens
        
    Raises:
        UnauthorizedError: If refresh token is invalid or expired
    """
    tokens = await auth_service.refresh_access_token(
        db, 
        refresh_token=data.refresh_token
    )
    
    return TokenResponse(**tokens)


# Employee profile endpoints
@router.get("/profile", response_model=EmployeeProfile, dependencies=[Depends(get_current_user)])
async def get_current_employee_profile(
    current_user: Employee = Depends(get_current_active_user)
) -> EmployeeProfile:
    """
    Get current employee's profile.
    
    Args:
        current_user: Current authenticated employee
        
    Returns:
        EmployeeProfile: Current employee's profile data
    """
    return EmployeeProfile.model_validate(current_user)


# Employee management endpoints (require authentication)
@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeResponse:
    """
    Create a new employee.
    
    Args:
        employee_data: Employee creation data
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        EmployeeResponse: Created employee data
        
    Raises:
        DuplicateEntityError: If email already exists
        EntityNotFoundError: If reporting manager not found
        ValidationError: If validation fails
    """
    db_employee = await employee_service.create_employee(
        db, 
        employee_data=employee_data
    )
    
    return EmployeeResponse.model_validate(db_employee)


@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    search_params: dict = Depends(get_search_params),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> List[EmployeeResponse]:
    """
    Get employees with filtering and search.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        search_params: Search and filter parameters
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        List[EmployeeResponse]: List of employees
    """
    employees = await employee_service.get_employees_with_filters(
        db,
        skip=pagination.skip,
        limit=pagination.limit,
        search=search_params.get("search"),
        status=search_params.get("status")
    )
    
    return [EmployeeResponse.model_validate(emp) for emp in employees]


@router.get("/managers", response_model=List[EmployeeResponse])
async def get_managers(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> List[EmployeeResponse]:
    """
    Get employees who can be managers.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        List[EmployeeResponse]: List of potential managers
    """
    managers = await employee_service.get_managers(
        db,
        skip=pagination.skip,
        limit=pagination.limit
    )
    
    return [EmployeeResponse.model_validate(mgr) for mgr in managers]


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee_by_id_endpoint(
    employee: Employee = Depends(get_employee_by_id),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeResponse:
    """
    Get employee by ID.
    
    Args:
        employee: Employee found by ID (from dependency)
        current_user: Current authenticated user
        
    Returns:
        EmployeeResponse: Employee data
    """
    return EmployeeResponse.model_validate(employee)


@router.get("/{employee_id}/subordinates", response_model=EmployeeWithSubordinates)
async def get_employee_with_subordinates(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeWithSubordinates:
    """
    Get employee with their subordinates.
    
    Args:
        employee_id: Employee ID
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        EmployeeWithSubordinates: Employee with subordinates
    """
    employee = await employee_service.get_employee_with_subordinates(
        db, 
        employee_id=employee_id
    )
    
    return EmployeeWithSubordinates.model_validate(employee)


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeResponse:
    """
    Update an employee.
    
    Args:
        employee_id: Employee ID to update
        employee_data: Employee update data
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        EmployeeResponse: Updated employee data
        
    Raises:
        EntityNotFoundError: If employee not found
        DuplicateEntityError: If email already exists
        ValidationError: If validation fails
    """
    db_employee = await employee_service.update_employee(
        db,
        employee_id=employee_id,
        employee_data=employee_data
    )
    
    return EmployeeResponse.model_validate(db_employee)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> None:
    """
    Soft delete an employee (set status to inactive).
    
    Args:
        employee_id: Employee ID to delete
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Raises:
        EntityNotFoundError: If employee not found
    """
    await employee_service.soft_delete(db, entity_id=employee_id)
    await db.commit()