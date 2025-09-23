"""Unit tests for refactored employee router endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status
import json

from app.routers.employees_refactored import router
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.exceptions import ValidationError, NotFoundError

# Create test client
from fastapi import FastAPI
test_app = FastAPI()
test_app.include_router(router)
client = TestClient(test_app)


class TestEmployeeRouterRefactored:
    """Test cases for refactored employee router."""
    
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.test_employee = Employee(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@example.com",
            emp_department="IT",
            emp_roles="Developer",
            emp_roles_level=3,
            emp_status=True,
            emp_password="hashed_password"
        )
        
        self.manager_employee = Employee(
            emp_id=2,
            emp_name="Jane Manager",
            emp_email="jane@example.com",
            emp_department="IT",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_status=True,
            emp_password="hashed_password"
        )
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_auth_service')
    def test_login_success(self, mock_auth_service, mock_db):
        """Test successful login."""
        # Mock auth service
        mock_auth_instance = AsyncMock()
        mock_auth_instance.authenticate_user.return_value = self.test_employee
        mock_auth_instance.create_tokens.return_value = ("access_token", "refresh_token")
        mock_auth_service.return_value = mock_auth_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        login_data = {
            "email": "john@example.com",
            "password": "password123"
        }
        
        response = client.post("/login", json=login_data)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["access_token"] == "access_token"
        assert response_data["refresh_token"] == "refresh_token"
        assert response_data["token_type"] == "bearer"
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_auth_service')
    def test_login_invalid_credentials(self, mock_auth_service, mock_db):
        """Test login with invalid credentials."""
        # Mock auth service to raise HTTPException
        mock_auth_instance = AsyncMock()
        mock_auth_instance.authenticate_user.side_effect = ValidationError("Invalid credentials")
        mock_auth_service.return_value = mock_auth_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        login_data = {
            "email": "john@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/login", json=login_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_auth_service')
    def test_refresh_token_success(self, mock_auth_service, mock_db):
        """Test successful token refresh."""
        # Mock auth service
        mock_auth_instance = AsyncMock()
        mock_auth_instance.refresh_tokens.return_value = ("new_access_token", "new_refresh_token")
        mock_auth_service.return_value = mock_auth_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        refresh_data = {
            "refresh_token": "valid_refresh_token"
        }
        
        response = client.post("/refresh", json=refresh_data)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["access_token"] == "new_access_token"
        assert response_data["refresh_token"] == "new_refresh_token"
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    def test_create_employee_success(self, mock_employee_service, mock_db):
        """Test successful employee creation."""
        # Mock employee service
        mock_service_instance = AsyncMock()
        mock_service_instance.create_employee.return_value = self.test_employee
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        employee_data = {
            "emp_name": "John Doe",
            "emp_email": "john@example.com",
            "emp_department": "IT",
            "emp_roles": "Developer",
            "emp_roles_level": 3,
            "emp_reporting_manager_id": None,
            "password": "password123"
        }
        
        response = client.post("/", json=employee_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        assert response_data["emp_name"] == "John Doe"
        assert response_data["emp_email"] == "john@example.com"
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')
    def test_get_employees_success(self, mock_current_user, mock_employee_service, mock_db):
        """Test successful employee list retrieval."""
        # Mock current user
        mock_current_user.return_value = self.test_employee
        
        # Mock employee service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_all_employees.return_value = [self.test_employee, self.manager_employee]
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        response = client.get("/?skip=0&limit=20", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data) == 2
        assert response_data[0]["emp_name"] == "John Doe"
        assert response_data[1]["emp_name"] == "Jane Manager"
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')
    def test_get_employee_by_id_success(self, mock_current_user, mock_employee_service, mock_db):
        """Test successful employee retrieval by ID."""
        # Mock current user
        mock_current_user.return_value = self.test_employee
        
        # Mock employee service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_by_id_or_404.return_value = self.test_employee
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        response = client.get("/1", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["emp_id"] == 1
        assert response_data["emp_name"] == "John Doe"
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')
    def test_get_employee_by_id_not_found(self, mock_current_user, mock_employee_service, mock_db):
        """Test employee retrieval when employee doesn't exist."""
        # Mock current user
        mock_current_user.return_value = self.test_employee
        
        # Mock employee service to raise NotFoundError
        mock_service_instance = AsyncMock()
        mock_service_instance.get_by_id_or_404.side_effect = NotFoundError("Employee not found")
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        response = client.get("/999", headers=headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')
    def test_update_employee_success(self, mock_current_user, mock_employee_service, mock_db):
        """Test successful employee update."""
        # Mock current user
        mock_current_user.return_value = self.test_employee
        
        # Mock employee service
        updated_employee = Employee(
            emp_id=1,
            emp_name="John Updated",
            emp_email="john@example.com",
            emp_department="IT",
            emp_roles="Senior Developer",
            emp_roles_level=4,
            emp_status=True,
            emp_password="hashed_password"
        )
        
        mock_service_instance = AsyncMock()
        mock_service_instance.update_employee.return_value = updated_employee
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        update_data = {
            "emp_name": "John Updated",
            "emp_roles": "Senior Developer",
            "emp_roles_level": 4
        }
        
        response = client.put("/1", json=update_data, headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["emp_name"] == "John Updated"
        assert response_data["emp_roles"] == "Senior Developer"
        assert response_data["emp_roles_level"] == 4
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')  
    def test_deactivate_employee_success(self, mock_current_user, mock_employee_service, mock_db):
        """Test successful employee deactivation."""
        # Mock current user
        mock_current_user.return_value = self.test_employee
        
        # Mock employee service
        mock_service_instance = AsyncMock()
        mock_service_instance.deactivate_employee.return_value = True
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        response = client.delete("/1", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "deactivated successfully" in response_data["message"]
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')
    def test_get_managers_success(self, mock_current_user, mock_employee_service, mock_db):
        """Test successful managers list retrieval."""
        # Mock current user
        mock_current_user.return_value = self.test_employee
        
        # Mock employee service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_managers.return_value = [self.manager_employee]
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        response = client.get("/managers", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data) == 1
        assert response_data[0]["emp_name"] == "Jane Manager"
        assert response_data[0]["emp_roles_level"] >= 4
    
    @patch('app.routers.employees_refactored.get_db')
    @patch('app.routers.employees_refactored.get_employee_service')
    @patch('app.routers.employees_refactored.get_current_active_user')
    def test_get_subordinates_success(self, mock_current_user, mock_employee_service, mock_db):
        """Test successful subordinates list retrieval."""
        # Mock current user
        mock_current_user.return_value = self.manager_employee
        
        # Mock employee service
        mock_service_instance = AsyncMock()
        mock_service_instance.get_subordinates.return_value = [self.test_employee]
        mock_employee_service.return_value = mock_service_instance
        
        # Mock database
        mock_db.return_value = AsyncMock()
        
        # Mock authentication header
        headers = {"Authorization": "Bearer valid_token"}
        
        response = client.get("/2/subordinates", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert len(response_data) == 1
        assert response_data[0]["emp_name"] == "John Doe"
    
    def test_pagination_validation(self):
        """Test pagination parameter validation."""
        # Test negative skip
        response = client.get("/?skip=-1&limit=20")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test zero limit
        response = client.get("/?skip=0&limit=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test limit exceeding maximum
        response = client.get("/?skip=0&limit=200")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_request_validation_missing_fields(self):
        """Test request validation with missing required fields."""
        # Missing required fields in employee creation
        incomplete_data = {
            "emp_name": "John Doe"
            # Missing required fields: emp_email, emp_department, etc.
        }
        
        response = client.post("/", json=incomplete_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_request_validation_invalid_email(self):
        """Test request validation with invalid email format."""
        invalid_employee_data = {
            "emp_name": "John Doe",
            "emp_email": "invalid-email",  # Invalid email format
            "emp_department": "IT",
            "emp_roles": "Developer",
            "emp_roles_level": 3,
            "password": "password123"
        }
        
        response = client.post("/", json=invalid_employee_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY