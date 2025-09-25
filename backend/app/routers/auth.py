"""
Authentication dependencies for the Performance Management System.

This module provides authentication and authorization dependencies
for FastAPI routes with proper service layer integration.
"""

from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.employee import Employee
from app.services.auth_service import AuthService
from app.exceptions import UnauthorizedError

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/employees/login",
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
        UnauthorizedError: If token is invalid or user not found
    """
    return await auth_service.get_current_user_from_token(db, token=token)


def get_current_active_user(
    current_user: Employee = Depends(get_current_user)
) -> Employee:
    """
    Dependency to get current active user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Employee: Current active employee
        
    Raises:
        UnauthorizedError: If user is inactive
    """
    if not current_user.emp_status:
        raise UnauthorizedError("Inactive user")
    
    return current_user


# Optional dependencies for role-based access
def get_current_manager(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """
    Dependency to ensure current user is a manager.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Employee: Current manager
        
    Raises:
        UnauthorizedError: If user is not a manager
    """
    # You can implement role-based logic here
    # For now, assume all users can be managers
    return current_user
