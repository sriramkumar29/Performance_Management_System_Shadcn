import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
from types import SimpleNamespace
from main import app
from app.db.database import get_db

client = TestClient(app)


def _make_result(all=None, first=None, scalar=None):
    """Helper to create a mock database result that supports result.scalars().all() / .first() and result.scalar()"""
    result = MagicMock()
    scalars = MagicMock()
    
    # Explicitly set return values
    if all is not None:
        scalars.all.return_value = all
    if first is not None:
        scalars.first.return_value = first
    else:
        # Ensure first() returns None when not specified
        scalars.first.return_value = None
        
    result.scalars.return_value = scalars
    
    if scalar is not None:
        result.scalar.return_value = scalar
    
    return result


def _create_mock_session():
    """Helper to create a comprehensive mock database session"""
    mock_session = MagicMock()
    
    # Mock all common session methods - execute will be set per test
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.flush = AsyncMock()
    mock_session.delete = AsyncMock()
    mock_session.close = AsyncMock()
    mock_session.begin = AsyncMock()
    
    return mock_session


class TestAuthRouter:
    """Test cases for authentication endpoints"""

    def _override_db(self, mock_session):
        """Helper to override FastAPI database dependency."""
        app.dependency_overrides[get_db] = lambda: mock_session

    def _clear_overrides(self):
        """Helper to clean up dependency overrides."""
        app.dependency_overrides.clear()
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        mock_session = _create_mock_session()
        
        # Mock employee with hashed password
        mock_employee = SimpleNamespace(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@company.com",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_department="Engineering",
            emp_status=True,
            emp_password="$2b$12$hashed_password_here"  # Mock hashed password
        )
        
        # Create async mock that returns the result
        def mock_execute(*args, **kwargs):
            return _make_result(first=mock_employee)
        
        mock_session.execute = mock_execute
        
        self._override_db(mock_session)
        try:
            # Mock password verification to return True
            import app.routers.employees
            original_verify = app.routers.employees.pwd_context.verify
            app.routers.employees.pwd_context.verify = lambda plain, hashed: True
            
            response = client.post("/api/employees/login", json={
                "email": "john@company.com",
                "password": "password123"
            })
            
            # Restore original verify function
            app.routers.employees.pwd_context.verify = original_verify
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["token_type"] == "bearer"
        finally:
            self._clear_overrides()
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        mock_session = _create_mock_session()
        
        # Mock no employee found
        async def mock_execute(*args, **kwargs):
            return _make_result(first=None)
        
        mock_session.execute = mock_execute
        
        self._override_db(mock_session)
        try:
            response = client.post("/api/employees/login", json={
                "email": "invalid@company.com",
                "password": "wrongpassword"
            })
            
            assert response.status_code == 401
            data = response.json()
            assert "Invalid email or password" in data["detail"]
        finally:
            self._clear_overrides()
    
    def test_login_wrong_password(self):
        """Test login with correct email but wrong password"""
        mock_session = _create_mock_session()
        
        # Mock employee exists but password verification fails
        mock_employee = SimpleNamespace(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@company.com",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_department="Engineering",
            emp_status=True,
            emp_password="$2b$12$hashed_password_here"
        )
        
        # Create async mock that returns the result
        async def mock_execute(*args, **kwargs):
            return _make_result(first=mock_employee)
        
        mock_session.execute = mock_execute
        
        self._override_db(mock_session)
        try:
            # Mock password verification to return False
            import app.routers.employees
            original_verify = app.routers.employees.pwd_context.verify
            app.routers.employees.pwd_context.verify = lambda plain, hashed: False
            
            response = client.post("/api/employees/login", json={
                "email": "john@company.com",
                "password": "wrongpassword"
            })
            
            # Restore original verify function
            app.routers.employees.pwd_context.verify = original_verify
            
            assert response.status_code == 401
            data = response.json()
            assert "Invalid email or password" in data["detail"]
        finally:
            self._clear_overrides()
    
    def test_login_missing_fields(self):
        """Test login with missing required fields"""
        mock_session = _create_mock_session()
        
        self._override_db(mock_session)
        try:
            response = client.post("/api/employees/login", json={
                "email": "test@company.com"
                # Missing password
            })
            
            assert response.status_code == 422
            data = response.json()
            assert "detail" in data
        finally:
            self._clear_overrides()
    
    def test_login_invalid_email_format(self):
        """Test login with invalid email format"""
        mock_session = _create_mock_session()
        
        # Mock execute method - no employee found for invalid email
        async def mock_execute(*args, **kwargs):
            return _make_result(first=None)
        
        mock_session.execute = mock_execute
        
        self._override_db(mock_session)
        try:
            response = client.post("/api/employees/login", json={
                "email": "invalid-email",
                "password": "password123"
            })
            
            # Since LoginRequest.email is just str (no email validation), 
            # this will be processed and return 401 (user not found) instead of 422
            assert response.status_code == 401
            data = response.json()
            assert "Invalid email or password" in data["detail"]
        finally:
            self._clear_overrides()