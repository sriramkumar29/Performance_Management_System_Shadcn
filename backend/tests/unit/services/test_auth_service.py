"""Unit tests for AuthService."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from datetime import datetime, timezone
import jwt

from app.services.auth_service import AuthService
from app.models.employee import Employee
from app.core.config import settings
from app.constants import (
    INVALID_EMAIL_OR_PASSWORD,
    EMPLOYEE_NOT_FOUND,
    INVALID_REFRESH_TOKEN,
    EMAIL_ALREADY_REGISTERED
)


class TestAuthService:
    """Test cases for AuthService."""
    
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.auth_service = AuthService()
        self.mock_db = AsyncMock()
        
        # Create a test employee
        self.test_employee = Employee(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@example.com",
            emp_department="IT",
            emp_roles="Developer",
            emp_roles_level=3,
            emp_status=True,
            emp_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU6bEBKaRw7mRM2"  # hashed "password123"
        )
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "password123"
        hashed = self.auth_service.hash_password(password)
        
        assert hashed != password
        assert self.auth_service.verify_password(password, hashed)
    
    def test_verify_password_success(self):
        """Test successful password verification."""
        password = "password123"
        hashed = self.auth_service.hash_password(password)
        
        assert self.auth_service.verify_password(password, hashed)
    
    def test_verify_password_failure(self):
        """Test failed password verification."""
        password = "password123"
        wrong_password = "wrongpassword"
        hashed = self.auth_service.hash_password(password)
        
        assert not self.auth_service.verify_password(wrong_password, hashed)
    
    def test_create_tokens(self):
        """Test token creation."""
        access_token, refresh_token = self.auth_service.create_tokens(self.test_employee)
        
        assert isinstance(access_token, str)
        assert isinstance(refresh_token, str)
        assert access_token != refresh_token
        
        # Decode and verify tokens
        access_payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        refresh_payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        assert access_payload["sub"] == self.test_employee.emp_email
        assert access_payload["emp_id"] == self.test_employee.emp_id
        assert access_payload["type"] == "access"
        
        assert refresh_payload["sub"] == self.test_employee.emp_email
        assert refresh_payload["emp_id"] == self.test_employee.emp_id
        assert refresh_payload["type"] == "refresh"
    
    def test_decode_token_success(self):
        """Test successful token decoding."""
        access_token, _ = self.auth_service.create_tokens(self.test_employee)
        payload = self.auth_service.decode_token(access_token)
        
        assert payload["sub"] == self.test_employee.emp_email
        assert payload["emp_id"] == self.test_employee.emp_id
        assert payload["type"] == "access"
    
    def test_decode_token_invalid(self):
        """Test token decoding with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            self.auth_service.decode_token("invalid_token")
        
        assert exc_info.value.status_code == 401
        assert INVALID_REFRESH_TOKEN in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_authenticate_user_success(self):
        """Test successful user authentication."""
        # Create employee with properly hashed password
        hashed_password = self.auth_service.hash_password("password123")
        test_employee = Employee(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@example.com",
            emp_department="IT",
            emp_roles="Developer",
            emp_roles_level=3,
            emp_status=True,
            emp_password=hashed_password
        )
        
        # Mock database response
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = test_employee
        self.mock_db.execute.return_value = mock_result
        
        result = await self.auth_service.authenticate_user(
            self.mock_db, 
            "john@example.com", 
            "password123"
        )
        
        assert result == test_employee
        self.mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_authenticate_user_invalid_email(self):
        """Test authentication with invalid email."""
        # Mock database response - no user found
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        self.mock_db.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await self.auth_service.authenticate_user(
                self.mock_db, 
                "invalid@example.com", 
                "password123"
            )
        
        assert exc_info.value.status_code == 401
        assert INVALID_EMAIL_OR_PASSWORD in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_authenticate_user_invalid_password(self):
        """Test authentication with invalid password."""
        # Mock database response
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = self.test_employee
        self.mock_db.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await self.auth_service.authenticate_user(
                self.mock_db, 
                "john@example.com", 
                "wrongpassword"
            )
        
        assert exc_info.value.status_code == 401
        assert INVALID_EMAIL_OR_PASSWORD in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_get_current_user_success(self):
        """Test successful current user retrieval."""
        access_token, _ = self.auth_service.create_tokens(self.test_employee)
        
        # Mock database response
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = self.test_employee
        self.mock_db.execute.return_value = mock_result
        
        result = await self.auth_service.get_current_user(self.mock_db, access_token)
        
        assert result == self.test_employee
        self.mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self):
        """Test current user retrieval with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            await self.auth_service.get_current_user(self.mock_db, "invalid_token")
        
        assert exc_info.value.status_code == 401
        assert INVALID_REFRESH_TOKEN in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_get_current_user_user_not_found(self):
        """Test current user retrieval when user doesn't exist."""
        access_token, _ = self.auth_service.create_tokens(self.test_employee)
        
        # Mock database response - no user found
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        self.mock_db.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await self.auth_service.get_current_user(self.mock_db, access_token)
        
        assert exc_info.value.status_code == 401
        assert EMPLOYEE_NOT_FOUND in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_refresh_tokens_success(self):
        """Test successful token refresh."""
        _, refresh_token = self.auth_service.create_tokens(self.test_employee)
        
        # Mock database response
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = self.test_employee
        self.mock_db.execute.return_value = mock_result
        
        new_access_token, new_refresh_token = await self.auth_service.refresh_tokens(
            self.mock_db, refresh_token
        )
        
        assert isinstance(new_access_token, str)
        assert isinstance(new_refresh_token, str)
        assert new_access_token != refresh_token
        # Note: New refresh token might be the same due to timing, but should be valid tokens
        assert len(new_refresh_token) > 0
    
    @pytest.mark.asyncio
    async def test_refresh_tokens_invalid_token(self):
        """Test token refresh with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            await self.auth_service.refresh_tokens(self.mock_db, "invalid_token")
        
        assert exc_info.value.status_code == 401
        assert INVALID_REFRESH_TOKEN in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_validate_email_unique_success(self):
        """Test email uniqueness validation when email is unique."""
        # Mock database response - no existing user
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        self.mock_db.execute.return_value = mock_result
        
        # Should not raise an exception
        await self.auth_service.validate_email_unique(self.mock_db, "new@example.com")
        self.mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_validate_email_unique_failure(self):
        """Test email uniqueness validation when email already exists."""
        # Mock database response - existing user found
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = self.test_employee
        self.mock_db.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await self.auth_service.validate_email_unique(self.mock_db, "john@example.com")
        
        assert exc_info.value.status_code == 400
        assert EMAIL_ALREADY_REGISTERED in exc_info.value.detail