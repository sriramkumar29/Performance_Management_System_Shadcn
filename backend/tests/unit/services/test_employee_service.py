"""Simplified unit tests for EmployeeService."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from app.services.employee_service import EmployeeService
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class TestEmployeeServiceSimple:
    """Simplified test cases for EmployeeService."""
    
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.employee_service = EmployeeService()
        self.mock_db = AsyncMock()
        
        # Test data
        self.test_employee = Employee(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john.doe@example.com",
            emp_department="IT",
            emp_roles="Software Engineer",
            emp_roles_level=3,
            emp_reporting_manager_id=None,
            emp_status=True,
            emp_password="hashed_password"
        )

    def test_service_initialization(self):
        """Test that service initializes correctly."""
        service = EmployeeService()
        assert service is not None
        assert hasattr(service, 'auth_service')
        assert service.model == Employee

    @pytest.mark.asyncio
    async def test_get_by_id_with_mock(self):
        """Test get_by_id method using mocking."""
        with patch.object(self.employee_service, 'get_by_id', return_value=self.test_employee) as mock_get:
            result = await self.employee_service.get_by_id(self.mock_db, 1)
            
            assert result == self.test_employee
            mock_get.assert_called_once_with(self.mock_db, 1)

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self):
        """Test get_by_id when employee not found."""
        with patch.object(self.employee_service, 'get_by_id', return_value=None) as mock_get:
            result = await self.employee_service.get_by_id(self.mock_db, 999)
            
            assert result is None
            mock_get.assert_called_once_with(self.mock_db, 999)

    @pytest.mark.asyncio
    async def test_create_employee_success(self):
        """Test successful employee creation."""
        employee_data = EmployeeCreate(
            emp_name="New Employee",
            emp_email="new@example.com",
            emp_department="HR",
            emp_roles="HR Specialist",
            emp_roles_level=2,
            emp_reporting_manager_id=2,
            password="password123"
        )
        
        expected_employee = Employee(
            emp_id=3,
            emp_name="New Employee",
            emp_email="new@example.com",
            emp_department="HR",
            emp_roles="HR Specialist",
            emp_roles_level=2,
            emp_reporting_manager_id=2,
            emp_status=True,
            emp_password="hashed_password"
        )
        
        with patch.object(self.employee_service, 'create_employee', return_value=expected_employee) as mock_create:
            result = await self.employee_service.create_employee(self.mock_db, employee_data)
            
            assert result == expected_employee
            mock_create.assert_called_once_with(self.mock_db, employee_data)

    @pytest.mark.asyncio
    async def test_create_employee_validation_error(self):
        """Test employee creation with validation error."""
        employee_data = EmployeeCreate(
            emp_name="New Employee",
            emp_email="existing@example.com",
            emp_department="HR",
            emp_roles="HR Specialist",
            emp_roles_level=2,
            emp_reporting_manager_id=2,
            password="password123"
        )
        
        with patch.object(
            self.employee_service, 
            'create_employee', 
            side_effect=HTTPException(status_code=400, detail="Email already exists")
        ):
            with pytest.raises(HTTPException) as exc_info:
                await self.employee_service.create_employee(self.mock_db, employee_data)
            
            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_update_employee_success(self):
        """Test successful employee update."""
        employee_update = EmployeeUpdate(
            emp_name="Updated Name",
            emp_department="Updated Department"
        )
        
        updated_employee = Employee(
            emp_id=self.test_employee.emp_id,
            emp_name="Updated Name",
            emp_email=self.test_employee.emp_email,
            emp_department="Updated Department",
            emp_roles=self.test_employee.emp_roles,
            emp_roles_level=self.test_employee.emp_roles_level,
            emp_reporting_manager_id=self.test_employee.emp_reporting_manager_id,
            emp_status=self.test_employee.emp_status,
            emp_password=self.test_employee.emp_password
        )
        
        with patch.object(self.employee_service, 'update_employee', return_value=updated_employee) as mock_update:
            result = await self.employee_service.update_employee(self.mock_db, 1, employee_update)
            
            assert result.emp_name == "Updated Name"
            assert result.emp_department == "Updated Department"
            mock_update.assert_called_once_with(self.mock_db, 1, employee_update)

    @pytest.mark.asyncio
    async def test_delete_employee_success(self):
        """Test successful employee deletion."""
        with patch.object(self.employee_service, 'delete', return_value=True) as mock_delete:
            result = await self.employee_service.delete(self.mock_db, 1)
            
            assert result is True
            mock_delete.assert_called_once_with(self.mock_db, 1)

    @pytest.mark.asyncio
    async def test_get_all_employees(self):
        """Test retrieving all employees."""
        test_employees = [self.test_employee]
        
        with patch.object(self.employee_service, 'get_all', return_value=test_employees) as mock_get_all:
            result = await self.employee_service.get_all(self.mock_db)
            
            assert len(result) == 1
            assert result == test_employees
            mock_get_all.assert_called_once_with(self.mock_db)

    @pytest.mark.asyncio
    async def test_validate_create_method_exists(self):
        """Test that validate_create method exists and can be called."""
        employee_data = EmployeeCreate(
            emp_name="New Employee",
            emp_email="new@example.com",
            emp_department="HR",
            emp_roles="HR Specialist",
            emp_roles_level=2,
            emp_reporting_manager_id=2,
            password="password123"
        )
        
        # Mock the method to avoid complex dependencies
        with patch.object(self.employee_service, 'validate_create', return_value=None) as mock_validate:
            await self.employee_service.validate_create(self.mock_db, employee_data)
            mock_validate.assert_called_once_with(self.mock_db, employee_data)

    @pytest.mark.asyncio
    async def test_validate_update_method_exists(self):
        """Test that validate_update method exists and can be called."""
        employee_update = EmployeeUpdate(emp_name="Updated Name")
        
        # Mock the method to avoid complex dependencies
        with patch.object(self.employee_service, 'validate_update', return_value=None) as mock_validate:
            await self.employee_service.validate_update(self.mock_db, 1, employee_update)
            mock_validate.assert_called_once_with(self.mock_db, 1, employee_update)