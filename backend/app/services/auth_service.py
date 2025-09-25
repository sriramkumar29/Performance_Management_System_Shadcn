"""
Authentication service for the Performance Management System.

This module provides authentication and authorization logic
with proper JWT handling and security.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import jwt
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.repositories.user_repository import UserRepository
from app.services.employee_service import EmployeeService
from app.core.config import settings
from app.exceptions import UnauthorizedError, EntityNotFoundError
from app.constants import (
    INVALID_EMAIL_OR_PASSWORD,
    INVALID_REFRESH_TOKEN,
    REFRESH_TOKEN_EXPIRED,
    EMPLOYEE_NOT_FOUND,
    ACCOUNT_DISABLED,
    INVALID_ACCESS_TOKEN,
    ACCESS_TOKEN_EXPIRED
)


class AuthService:
    """Service class for authentication operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        self.employee_service = EmployeeService()
    
    async def authenticate_user(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str
    ) -> Employee:
        """Authenticate user with email and password."""
        employee = await self.user_repository.get_active_user_by_email(db, email)
        
        if not employee:
            raise UnauthorizedError(INVALID_EMAIL_OR_PASSWORD)
        
        if not self.employee_service.verify_password(password, employee.emp_password):
            raise UnauthorizedError(INVALID_EMAIL_OR_PASSWORD)
        
        return employee
    
    def create_access_token(
        self,
        *,
        employee: Employee,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token."""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        payload = {
            "sub": employee.emp_email,
            "emp_id": employee.emp_id,
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc)
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    def create_refresh_token(
        self,
        *,
        employee: Employee,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT refresh token."""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRE_DAYS
            )
        
        payload = {
            "sub": employee.emp_email,
            "emp_id": employee.emp_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(timezone.utc)
        }
        
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    def verify_token(
        self,
        token: str,
        token_type: str = "access"
    ) -> Dict[str, Any]:
        """Verify JWT token and return payload."""
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)
            
            # Verify required fields
            if not payload.get("sub") or not payload.get("emp_id"):
                raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise UnauthorizedError(REFRESH_TOKEN_EXPIRED if token_type == "refresh" else ACCESS_TOKEN_EXPIRED)
        except InvalidTokenError:
            raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)
    
    async def get_current_user_from_token(
        self,
        db: AsyncSession,
        *,
        token: str
    ) -> Employee:
        """Get current user from access token."""
        payload = self.verify_token(token, "access")
        email = payload.get("sub")
        
        employee = await self.employee_service.get_employee_by_email(db, email=email)
        
        if not employee:
            raise EntityNotFoundError("Employee")
        
        if not employee.emp_status:
            raise UnauthorizedError(ACCOUNT_DISABLED)
        
        return employee
    
    async def refresh_access_token(
        self,
        db: AsyncSession,
        *,
        refresh_token: str
    ) -> Dict[str, str]:
        """Refresh access token using refresh token."""
        payload = self.verify_token(refresh_token, "refresh")
        email = payload.get("sub")
        
        # Verify employee still exists and is active
        employee = await self.user_repository.get_active_user_by_email(db, email)
        
        if not employee:
            raise UnauthorizedError(ACCOUNT_DISABLED)
        
        # Create new tokens
        new_access_token = self.create_access_token(employee=employee)
        new_refresh_token = self.create_refresh_token(employee=employee)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    async def login(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str
    ) -> Dict[str, str]:
        """Complete login process with token generation."""
        employee = await self.authenticate_user(db, email=email, password=password)
        
        access_token = self.create_access_token(employee=employee)
        refresh_token = self.create_refresh_token(employee=employee)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }