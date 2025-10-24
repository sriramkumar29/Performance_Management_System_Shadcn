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
from app.utils.logger import get_logger, build_log_context, sanitize_log_data
from app.exceptions.domain_exceptions import (
    BaseDomainException, map_domain_exception_to_http_status,
    EmployeeNotFoundError, EmployeeServiceError
)
from app.exceptions.custom_exceptions import UnauthorizedError
from fastapi import HTTPException

router = APIRouter()
logger = get_logger(__name__)


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
    Employee login endpoint with proper error handling and logging.
    
    Args:
        data: Login credentials (email and password)
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: Access and refresh tokens
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    context = build_log_context()
    
    logger.info(f"{context}API_REQUEST: POST /login - Email: {sanitize_log_data(data.email)}")
    
    try:
        tokens = await auth_service.login(
            db, 
            email=data.email, 
            password=data.password
        )
        
        logger.info(f"{context}API_SUCCESS: User login successful - Email: {sanitize_log_data(data.email)}")
        return TokenResponse(**tokens)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except HTTPException as e:
        # Already a proper HTTPException (e.g., Duplicate/Conflict), re-raise so FastAPI will use its status
        logger.warning(f"{context}HTTP_EXCEPTION: {e.status_code} - {getattr(e, 'detail', '')}")
        raise e
        
    except UnauthorizedError as e:
        # Handle authentication errors specifically
        logger.warning(f"{context}AUTH_ERROR: Login failed - {e.detail}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.detail  # This will be extracted directly as the error message
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Login failed - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred during login"
            }
        )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Refresh access token using refresh token with proper error handling and logging.
    
    Args:
        data: Refresh token request
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: New access and refresh tokens
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    context = build_log_context()
    
    logger.info(f"{context}API_REQUEST: POST /refresh - Refresh token request")
    
    try:
        tokens = await auth_service.refresh_access_token(
            db, 
            refresh_token=data.refresh_token
        )
        
        logger.info(f"{context}API_SUCCESS: Token refresh successful")
        return TokenResponse(**tokens)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except UnauthorizedError as e:
        # Handle authentication errors specifically
        logger.warning(f"{context}AUTH_ERROR: Token refresh failed - {e.detail}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.detail
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Token refresh failed - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred during token refresh"
            }
        )


# Employee profile endpoints
@router.get("/profile", response_model=EmployeeProfile, dependencies=[Depends(get_current_user)])
async def get_current_employee_profile(
    current_user: Employee = Depends(get_current_active_user)
) -> EmployeeProfile:
    """
    Get current employee's profile with proper error handling and logging.
    
    Args:
        current_user: Current authenticated employee
        
    Returns:
        EmployeeProfile: Current employee's profile data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /profile - User ID: {user_id}")
    
    try:
        profile = EmployeeProfile.model_validate(current_user)
        
        logger.info(f"{context}API_SUCCESS: Retrieved employee profile - User ID: {user_id}")
        return profile
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get employee profile - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving profile"
            }
        )


# Employee management endpoints (require authentication)
@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeResponse:
    """
    Create a new employee with proper error handling and logging.
    
    Args:
        employee_data: Employee creation data
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        EmployeeResponse: Created employee data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST / - Create employee - Email: {sanitize_log_data(employee_data.emp_email)}")
    
    try:
        db_employee = await employee_service.create_employee(
            db, 
            employee_data=employee_data
        )

        # Re-fetch with relationships loaded to avoid lazy-loading during Pydantic validation
        db_employee_with_rels = await employee_service.get_by_id_or_404(
            db, getattr(db_employee, 'emp_id'), load_relationships=["role"]
        )

        logger.info(f"{context}API_SUCCESS: Created employee with ID: {db_employee.emp_id}")
        return EmployeeResponse.model_validate(db_employee_with_rels)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except HTTPException as e:
        # Re-raise HTTP exceptions coming from service layer (e.g., conflicts)
        logger.warning(f"{context}HTTP_EXCEPTION: {e.status_code} - {getattr(e, 'detail', '')}")
        raise e
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create employee - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating employee"
            }
        )


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
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET / - Get employees - skip: {pagination.skip}, limit: {pagination.limit}")
    
    try:
        employees = await employee_service.get_employees_with_filters(
            db,
            skip=pagination.skip,
            limit=pagination.limit,
            search=search_params.get("search"),
            status=search_params.get("status")
        )
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(employees)} employees")
        return [EmployeeResponse.model_validate(emp) for emp in employees]
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve employees - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving employees"
            }
        )


@router.get("/managers", response_model=List[EmployeeResponse])
async def get_managers(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> List[EmployeeResponse]:
    """
    Get employees who can be managers with proper error handling and logging.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        List[EmployeeResponse]: List of potential managers
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /managers - skip: {pagination.skip}, limit: {pagination.limit}")
    
    try:
        managers = await employee_service.get_managers(
            db,
            skip=pagination.skip,
            limit=pagination.limit
        )
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(managers)} potential managers")
        return [EmployeeResponse.model_validate(mgr) for mgr in managers]
        
    except (EmployeeNotFoundError, EmployeeServiceError) as e:
        # Handle domain exceptions
        logger.error(f"{context}DOMAIN_ERROR: {type(e).__name__} in get_managers - {str(e)}")
        raise e.to_http_exception()
    except HTTPException as e:
        # Re-raise HTTP exceptions coming from service layer (e.g., conflict)
        logger.warning(f"{context}HTTP_EXCEPTION: {e.status_code} - {getattr(e, 'detail', '')}")
        raise e
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve managers - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving managers"
            }
        )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee_by_id_endpoint(
    employee: Employee = Depends(get_employee_by_id),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeResponse:
    """
    Get employee by ID with proper error handling and logging.
    
    Args:
        employee: Employee found by ID (from dependency)
        current_user: Current authenticated user
        
    Returns:
        EmployeeResponse: Employee data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    employee_id = employee.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /{employee_id} - Get employee by ID")
    
    try:
        response = EmployeeResponse.model_validate(employee)
        
        logger.info(f"{context}API_SUCCESS: Retrieved employee with ID: {employee_id}")
        return response
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get employee by ID {employee_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving employee"
            }
        )


@router.get("/{employee_id}/subordinates", response_model=EmployeeWithSubordinates)
async def get_employee_with_subordinates(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeWithSubordinates:
    """
    Get employee with their subordinates with proper error handling and logging.
    
    Args:
        employee_id: Employee ID
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        EmployeeWithSubordinates: Employee with subordinates
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /{employee_id}/subordinates - Get employee with subordinates")
    
    try:
        employee = await employee_service.get_employee_with_subordinates(
            db, 
            employee_id=employee_id
        )
        
        response = EmployeeWithSubordinates.model_validate(employee)
        subordinate_count = len(employee.subordinates) if employee.subordinates else 0
        logger.info(f"{context}API_SUCCESS: Retrieved employee {employee_id} with {subordinate_count} subordinates")
        
        return response
        
    except (EmployeeNotFoundError, EmployeeServiceError) as e:
        # Handle domain exceptions
        logger.error(f"{context}DOMAIN_ERROR: {type(e).__name__} in get_employee_with_subordinates - {str(e)}")
        raise e.to_http_exception()
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get employee with subordinates for ID {employee_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving employee with subordinates"
            }
        )


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> EmployeeResponse:
    """
    Update an employee with proper error handling and logging.
    
    Args:
        employee_id: Employee ID to update
        employee_data: Employee update data
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Returns:
        EmployeeResponse: Updated employee data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    # Sanitize employee data for logging
    safe_data = sanitize_log_data(employee_data.model_dump())
    logger.info(f"{context}API_REQUEST: PUT /{employee_id} - Update employee with data: {safe_data}")
    
    try:
        updated = await employee_service.update_employee(
            db,
            employee_id=employee_id,
            employee_data=employee_data
        )

        # Re-fetch with relationships to ensure response model has role populated without async IO during validation
        db_employee_with_rels = await employee_service.get_by_id_or_404(
            db, employee_id, load_relationships=["role"]
        )

        response = EmployeeResponse.model_validate(db_employee_with_rels)
        logger.info(f"{context}API_SUCCESS: Updated employee with ID: {employee_id}")

        return response
        
    except (EmployeeNotFoundError, EmployeeServiceError) as e:
        # Handle domain exceptions
        logger.error(f"{context}DOMAIN_ERROR: {type(e).__name__} in update_employee - {str(e)}")
        raise e.to_http_exception()
    except HTTPException as e:
        # Re-raise HTTP exceptions coming from service layer
        logger.warning(f"{context}HTTP_EXCEPTION: {e.status_code} - {getattr(e, 'detail', '')}")
        raise e
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update employee {employee_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating employee"
            }
        )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    employee_service: EmployeeService = Depends(get_employee_service),
    current_user: Employee = Depends(get_current_user)
) -> None:
    """
    Soft delete an employee (set status to inactive) with proper error handling and logging.
    
    Args:
        employee_id: Employee ID to delete
        db: Database session
        employee_service: Employee service instance
        current_user: Current authenticated user
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /{employee_id} - Soft delete employee")
    
    try:
        await employee_service.soft_delete(db, entity_id=employee_id)
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Soft deleted employee with ID: {employee_id}")
        
    except (EmployeeNotFoundError, EmployeeServiceError) as e:
        # Rollback transaction on domain errors
        await db.rollback()
        logger.error(f"{context}DOMAIN_ERROR: {type(e).__name__} in soft_delete_employee - {str(e)}")
        raise e.to_http_exception()
        
    except Exception as e:
        # Rollback transaction on unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to soft delete employee {employee_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while deleting employee"
            }
        )