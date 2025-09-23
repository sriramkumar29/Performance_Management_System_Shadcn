"""Dependency injection module for services and authentication."""

from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.auth_service import AuthService
from app.services.employee_service import EmployeeService
from app.services.appraisal_service import AppraisalService
from app.services.goal_service import GoalService
from app.models.employee import Employee

# Security scheme
security = HTTPBearer()


# Service dependencies
def get_auth_service() -> AuthService:
    """Get authentication service instance."""
    return AuthService()


def get_employee_service() -> EmployeeService:
    """Get employee service instance."""
    return EmployeeService()


def get_appraisal_service() -> AppraisalService:
    """Get appraisal service instance."""
    return AppraisalService()


def get_goal_service() -> GoalService:
    """Get goal service instance."""
    return GoalService()


# Authentication dependencies
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)]
) -> Employee:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    return await auth_service.get_current_user(db, token)


def get_current_active_user(
    current_user: Annotated[Employee, Depends(get_current_user)]
) -> Employee:
    """Get current active user (must be enabled)."""
    if not current_user.emp_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


# Type aliases for easier use in route handlers
CurrentUser = Annotated[Employee, Depends(get_current_user)]
CurrentActiveUser = Annotated[Employee, Depends(get_current_active_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
EmployeeServiceDep = Annotated[EmployeeService, Depends(get_employee_service)]
AppraisalServiceDep = Annotated[AppraisalService, Depends(get_appraisal_service)]
GoalServiceDep = Annotated[GoalService, Depends(get_goal_service)]