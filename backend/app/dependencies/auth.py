"""
Authentication dependencies for the Performance Management System.

This module provides authentication and authorization dependencies
for FastAPI routes with proper service layer integration and
comprehensive logging.
"""

from fastapi import Depends, Security, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.employee import Employee
from app.services.auth_service import AuthService
from app.exceptions import UnauthorizedError
from app.constants import ROLE_ADMIN, ROLE_MANAGER_LOWER
from app.utils.logger import get_logger, build_log_context, sanitize_log_data

logger = get_logger(__name__)

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
    context = build_log_context()
    
    try:
        # Sanitize token for logging (show only first/last few chars)
        token_preview = f"{token[:10]}...{token[-4:]}" if len(token) > 14 else "***"
        logger.debug(f"{context}AUTH_REQUEST: Validating JWT token - {token_preview}")
        
        user = await auth_service.get_current_user_from_token(db, token=token)
        
        logger.info(f"{context}AUTH_SUCCESS: Authenticated user - ID: {user.emp_id}, Email: {sanitize_log_data(user.emp_email)}")
        return user
        
    except UnauthorizedError as e:
        logger.warning(f"{context}AUTH_FAILED: Token validation failed - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"{context}AUTH_ERROR: Unexpected error during authentication - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


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
        HTTPException: If user is inactive
    """
    context = build_log_context(user_id=current_user.emp_id)
    
    try:
        logger.debug(f"{context}USER_STATUS_CHECK: Verifying user active status - ID: {current_user.emp_id}")
        
        if not current_user.emp_status:
            logger.warning(f"{context}USER_INACTIVE: User account is disabled - ID: {current_user.emp_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user"
            )
        
        logger.info(f"{context}USER_ACTIVE: Active user verified - ID: {current_user.emp_id}")
        return current_user
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"{context}USER_CHECK_ERROR: Unexpected error during user status check - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User validation failed"
        )
    
    return current_user


# Role-based dependencies
def require_manager_role(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """Require manager role or higher."""
    context = build_log_context(user_id=current_user.emp_id)

    try:
        logger.debug(f"{context}ROLE_CHECK: Verifying manager role - User: {current_user.emp_id}, Role: {current_user.role.role_name if current_user.role else 'None'}")

        if current_user.role and current_user.role.role_name.lower() in [ROLE_MANAGER_LOWER, "ceo", ROLE_ADMIN]:
            logger.info(f"{context}ROLE_APPROVED: Manager role verified - User: {current_user.emp_id}")
            return current_user

        logger.warning(f"{context}ROLE_DENIED: Manager role required but not found - User: {current_user.emp_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager role required"
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"{context}ROLE_ERROR: Unexpected error during manager role check - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role validation failed"
        )


def require_admin_role(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """Require admin role."""
    context = build_log_context(user_id=current_user.emp_id)

    try:
        logger.debug(f"{context}ROLE_CHECK: Verifying admin role - User: {current_user.emp_id}, Role: {current_user.role.role_name if current_user.role else 'None'}")

        if current_user.role and current_user.role.role_name.lower() == ROLE_ADMIN:
            logger.info(f"{context}ROLE_APPROVED: Admin role verified - User: {current_user.emp_id}")
            return current_user

        logger.warning(f"{context}ROLE_DENIED: Admin role required but not found - User: {current_user.emp_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"{context}ROLE_ERROR: Unexpected error during admin role check - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role validation failed"
        )


def require_hr_role(
    current_user: Employee = Depends(get_current_active_user)
) -> Employee:
    """Require HR role (deprecated - HR is not in new role system)."""
    context = build_log_context(user_id=current_user.emp_id)

    try:
        logger.debug(f"{context}ROLE_CHECK: Verifying HR role - User: {current_user.emp_id}, Role: {current_user.role.role_name if current_user.role else 'None'}")

        # Note: HR role doesn't exist in new role system, map to Admin for now
        if current_user.role and current_user.role.role_name.lower() == ROLE_ADMIN:
            logger.info(f"{context}ROLE_APPROVED: HR role verified (via Admin) - User: {current_user.emp_id}")
            return current_user

        logger.warning(f"{context}ROLE_DENIED: HR role required but not found - User: {current_user.emp_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR role required"
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"{context}ROLE_ERROR: Unexpected error during HR role check - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role validation failed"
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
    context = build_log_context(user_id=current_user.emp_id)
    
    try:
        logger.debug(f"{context}LEGACY_MANAGER_CHECK: Validating manager access (legacy compatibility) - User: {current_user.emp_id}")
        
        # For backward compatibility, assume all users can be managers for now
        # You can implement role-based logic here later
        logger.info(f"{context}LEGACY_MANAGER_APPROVED: Manager access granted (legacy mode) - User: {current_user.emp_id}")
        return current_user
        
    except Exception as e:
        logger.error(f"{context}LEGACY_MANAGER_ERROR: Unexpected error during legacy manager check - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager validation failed"
        )