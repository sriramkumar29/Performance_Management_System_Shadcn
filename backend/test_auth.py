import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestAuthRouter:
    """Test cases for authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock employee query result
            mock_employee = MagicMock()
            mock_employee.emp_id = 1
            mock_employee.emp_name = "John Doe"
            mock_employee.emp_email = "john@company.com"
            mock_employee.emp_roles = "Manager"
            mock_employee.emp_roles_level = 5
            mock_employee.emp_department = "Engineering"
            mock_employee.emp_status = True
            
            # Mock async session execute and scalars
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = mock_employee
            mock_session.execute.return_value = mock_result
            
            # Mock password verification
            with patch('app.routers.employees.pwd_context.verify', return_value=True):
                response = client.post("/api/employees/login", json={
                    "email": "john@company.com",
                    "password": "password123"
                })
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            mock_session.execute.return_value = mock_result
            
            response = client.post("/api/employees/login", json={
                "email": "invalid@company.com",
                "password": "wrongpassword"
            })
            
            assert response.status_code == 401
            assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_inactive_employee(self):
        """Test login with inactive employee account"""
        with patch('app.routers.auth.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_employee = MagicMock()
            mock_employee.emp_status = False
            mock_session.query().filter().first.return_value = mock_employee
            
            response = client.post("/api/employees/login", json={
                "emp_email": "inactive@company.com",
                "emp_password": "password123"
            })
            
            assert response.status_code == 401
            assert "Account is inactive" in response.json()["detail"]
    
    def test_login_missing_fields(self):
        """Test login with missing required fields"""
        response = client.post("/api/employees/login", json={
            "emp_email": "test@company.com"
            # Missing emp_password
        })
        
        assert response.status_code == 422
    
    def test_login_invalid_email_format(self):
        """Test login with invalid email format"""
        response = client.post("/api/employees/login", json={
            "emp_email": "invalid-email",
            "emp_password": "password123"
        })
        
        assert response.status_code == 422
