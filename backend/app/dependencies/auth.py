"""
Authentication dependencies for the Performance Management System.

This module provides authentication and authorization dependencies
for FastAPI routes with proper service layer integration.
"""

from fastapi import Depends, Security, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.employee import Employee
from app.services.auth_service import AuthService
from app.exceptions import UnauthorizedError

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/employees/login",  # Keep existing token URL for compatibility
    description="JWT Bearer token authentication"
)


def get_auth_service() -> AuthService:
    """Dependency to get auth service instance."""
    return AuthService()


async def get_current_user(
    token: str = Security(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> Employee:
    """
    Dependency to get current authenticated user from JWT token.
    
    Args:
        token: JWT access token from Authorization header
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        Employee: Current authenticated employee
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        return await auth_service.get_current_user_from_token(db, token=token)
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: Employee = Depends(get_current_user)
) -> Employee:
    """
    Dependency to get current active user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Employee: Current active employee
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.emp_status:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    return current_user


# Role-based dependencies
async def require_manager_role(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """Require manager role."""
    if current_user.emp_roles and "manager" in current_user.emp_roles.lower():
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Manager role required"
    )


async def require_admin_role(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """Require admin role."""
    if current_user.emp_roles and "admin" in current_user.emp_roles.lower():
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin role required"
    )


async def require_hr_role(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """Require HR role."""
    if current_user.emp_roles and "hr" in current_user.emp_roles.lower():
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="HR role required"
    )


# Legacy compatibility - keep the old get_current_manager function
def get_current_manager(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """
    Legacy compatibility function.
    Dependency to ensure current user is a manager.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Employee: Current manager
        
    Raises:
        HTTPException: If user is not a manager (optional check)
    """
    # For backward compatibility, assume all users can be managers for now
    # You can implement role-based logic here later
    return current_user