"""Authentication service for handling auth-related business logic."""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from passlib.context import CryptContext
import jwt

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate
from app.core.config import settings
from app.constants import (
    INVALID_EMAIL_OR_PASSWORD, 
    EMPLOYEE_NOT_FOUND,
    INVALID_REFRESH_TOKEN,
    REFRESH_TOKEN_EXPIRED,
    EMAIL_ALREADY_REGISTERED
)


class AuthService:
    """Service for authentication and authorization operations."""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def hash_password(self, password: str) -> str:
        """Hash a plain text password."""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def create_tokens(self, employee: Employee) -> Tuple[str, str]:
        """Create access and refresh tokens for an employee."""
        # Create access token
        access_payload = {
            "sub": employee.emp_email,
            "emp_id": employee.emp_id,
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        # Create refresh token
        refresh_payload = {
            "sub": employee.emp_email,
            "emp_id": employee.emp_id,
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        }
        refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        return access_token, refresh_token
    
    def decode_token(self, token: str) -> dict:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=REFRESH_TOKEN_EXPIRED
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=INVALID_REFRESH_TOKEN
            )
    
    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Employee:
        """Authenticate user with email and password."""
        result = await db.execute(select(Employee).where(Employee.emp_email == email))
        employee = result.scalars().first()
        
        if not employee or not self.verify_password(password, employee.emp_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=INVALID_EMAIL_OR_PASSWORD
            )
        
        return employee
    
    async def get_current_user(self, db: AsyncSession, token: str) -> Employee:
        """Get current user from access token."""
        payload = self.decode_token(token)
        email = payload.get("sub")
        token_type = payload.get("type")
        
        if not email or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=INVALID_REFRESH_TOKEN
            )
        
        result = await db.execute(select(Employee).where(Employee.emp_email == email))
        employee = result.scalars().first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=EMPLOYEE_NOT_FOUND
            )
        
        return employee
    
    async def refresh_tokens(self, db: AsyncSession, refresh_token: str) -> Tuple[str, str]:
        """Refresh access and refresh tokens."""
        payload = self.decode_token(refresh_token)
        email = payload.get("sub")
        emp_id = payload.get("emp_id")
        token_type = payload.get("type")
        
        if not email or not emp_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=INVALID_REFRESH_TOKEN
            )
        
        # Verify employee still exists
        result = await db.execute(select(Employee).where(Employee.emp_email == email))
        employee = result.scalars().first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=EMPLOYEE_NOT_FOUND
            )
        
        return self.create_tokens(employee)
    
    async def validate_email_unique(self, db: AsyncSession, email: str) -> None:
        """Validate that email is unique."""
        result = await db.execute(select(Employee).where(Employee.emp_email == email))
        existing_employee = result.scalars().first()
        
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=EMAIL_ALREADY_REGISTERED
            )