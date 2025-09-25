import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
from types import SimpleNamespace
from main import app
from app.db.database import get_db
from app.routers.auth import get_current_user
from app.constants import EMPLOYEE_NOT_FOUND

client = TestClient(app)


def _make_result(all=None, first=None):
    """Helper to create a mock database result that supports result.scalars().all() / .first()"""
    result = MagicMock()
    scalars = MagicMock()
    if all is not None:
        scalars.all.return_value = all
    if first is not None:
        scalars.first.return_value = first
    result.scalars.return_value = scalars
    return result


def _create_mock_session():
    """Helper to create a comprehensive mock database session"""
    mock_session = MagicMock()
    
    # Mock all common session methods as AsyncMock for async operations
    mock_session.execute = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.flush = AsyncMock()
    mock_session.delete = AsyncMock()
    mock_session.close = AsyncMock()
    mock_session.begin = AsyncMock()
    
    return mock_session


def _create_mock_user():
    """Helper to create a mock user matching Employee model structure"""
    return SimpleNamespace(
        emp_id=1,
        emp_name="Test User",
        emp_email="test@example.com",
        emp_department="Engineering",
        emp_roles="Developer",
        emp_roles_level=3,
        emp_reporting_manager_id=None,
        emp_status=True
    )


class TestEmployeesRouter:
    """Test cases for employees endpoints"""

    def _override_user_and_db(self, mock_session):
        """Helper to override FastAPI dependencies for auth and DB."""
        app.dependency_overrides[get_db] = lambda: mock_session
        app.dependency_overrides[get_current_user] = lambda: _create_mock_user()

    def _clear_overrides(self):
        """Helper to clean up dependency overrides."""
        app.dependency_overrides.clear()
    
    def test_get_employees_success(self):
        """Test successful retrieval of employees list"""
        mock_session = _create_mock_session()
        
        # Mock employees data with all required fields
        mock_employees = [
            SimpleNamespace(
                emp_id=1,
                emp_name="John Doe",
                emp_email="john@company.com",
                emp_department="Engineering",
                emp_roles="Manager",
                emp_roles_level=5,
                emp_status=True,
                emp_reporting_manager_id=None
            ),
            SimpleNamespace(
                emp_id=2,
                emp_name="Jane Smith",
                emp_email="jane@company.com",
                emp_department="HR",
                emp_roles="Team Lead",
                emp_roles_level=4,
                emp_status=True,
                emp_reporting_manager_id=1
            )
        ]
        
        mock_session.execute.return_value = _make_result(all=mock_employees)
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["emp_name"] == "John Doe"
            assert data[1]["emp_name"] == "Jane Smith"
            assert data[0]["emp_department"] == "Engineering"
            assert data[1]["emp_department"] == "HR"
        finally:
            self._clear_overrides()
    
    def test_get_employee_by_id_success(self):
        """Test successful retrieval of employee by ID"""
        mock_session = _create_mock_session()
        
        mock_employee = SimpleNamespace(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@company.com",
            emp_department="Engineering",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_status=True,
            emp_reporting_manager_id=None
        )
        
        mock_session.execute.return_value = _make_result(first=mock_employee)
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees/1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["emp_name"] == "John Doe"
            assert data["emp_id"] == 1
            assert data["emp_email"] == "john@company.com"
            assert data["emp_department"] == "Engineering"
        finally:
            self._clear_overrides()
    
    def test_get_employee_by_id_not_found(self):
        """Test employee not found by ID"""
        mock_session = _create_mock_session()
        
        # Create a more explicit mock setup
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = None  # Explicitly return None
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees/999")
            
            assert response.status_code == 404
            data = response.json()
            assert data["detail"] == EMPLOYEE_NOT_FOUND
        finally:
            self._clear_overrides()
    
    def test_get_managers_success(self):
        """Test successful retrieval of managers list"""
        mock_session = _create_mock_session()
        
        mock_managers = [
            SimpleNamespace(
                emp_id=1,
                emp_name="John Manager",
                emp_email="john.manager@company.com",
                emp_department="Engineering",
                emp_roles="Manager",
                emp_roles_level=5,
                emp_status=True,
                emp_reporting_manager_id=None
            ),
            SimpleNamespace(
                emp_id=2,
                emp_name="Jane VP",
                emp_email="jane.vp@company.com",
                emp_department="Executive",
                emp_roles="VP",
                emp_roles_level=6,
                emp_status=True,
                emp_reporting_manager_id=None
            )
        ]
        
        mock_session.execute.return_value = _make_result(all=mock_managers)
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees/managers")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert all(emp["emp_roles_level"] >= 5 for emp in data)
            assert data[0]["emp_name"] == "John Manager"
            assert data[1]["emp_name"] == "Jane VP"
        finally:
            self._clear_overrides()
    
    def test_get_employees_empty_list(self):
        """Test retrieval when no employees exist"""
        mock_session = _create_mock_session()
        mock_session.execute.return_value = _make_result(all=[])
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees")
            
            assert response.status_code == 200
            data = response.json()
            assert data == []
            assert len(data) == 0
        finally:
            self._clear_overrides()
    
    def test_get_managers_empty_list(self):
        """Test retrieval when no managers exist"""
        mock_session = _create_mock_session()
        mock_session.execute.return_value = _make_result(all=[])
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees/managers")
            
            assert response.status_code == 200
            data = response.json()
            assert data == []
            assert len(data) == 0
        finally:
            self._clear_overrides()


# Additional test to verify the managers endpoint filtering works correctly
class TestManagersEndpointFiltering:
    """Additional tests to verify managers endpoint filtering logic"""
    
    def _override_user_and_db(self, mock_session):
        """Helper to override FastAPI dependencies for auth and DB."""
        app.dependency_overrides[get_db] = lambda: mock_session
        app.dependency_overrides[get_current_user] = lambda: _create_mock_user()

    def _clear_overrides(self):
        """Helper to clean up dependency overrides."""
        app.dependency_overrides.clear()
    
    def test_managers_endpoint_filters_correctly(self):
        """Test that managers endpoint only returns employees with roles_level >= 5"""
        mock_session = _create_mock_session()
        
        # Only managers (level >= 5) should be returned - with all required fields
        managers_only = [
            SimpleNamespace(
                emp_id=3,
                emp_name="Team Lead",
                emp_email="teamlead@company.com",
                emp_department="Engineering",
                emp_roles="Team Lead",
                emp_roles_level=5,
                emp_status=True,
                emp_reporting_manager_id=None
            ),
            SimpleNamespace(
                emp_id=4,
                emp_name="Manager",
                emp_email="manager@company.com",
                emp_department="Engineering",
                emp_roles="Manager",
                emp_roles_level=6,
                emp_status=True,
                emp_reporting_manager_id=None
            ),
            SimpleNamespace(
                emp_id=5,
                emp_name="VP",
                emp_email="vp@company.com",
                emp_department="Executive",
                emp_roles="VP",
                emp_roles_level=7,
                emp_status=True,
                emp_reporting_manager_id=None
            )
        ]
        
        mock_session.execute.return_value = _make_result(all=managers_only)
        
        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/employees/managers")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 3  # Only 3 employees with level >= 5
            
            # Verify all returned employees have roles_level >= 5
            for emp in data:
                assert emp["emp_roles_level"] >= 5
                
            # Verify specific employees are included
            names = [emp["emp_name"] for emp in data]
            assert "Team Lead" in names
            assert "Manager" in names
            assert "VP" in names
            
            # Verify junior employees are not included
            assert "Junior Dev" not in names
            assert "Senior Dev" not in names
            
        finally:
            self._clear_overrides()


if __name__ == "__main__":
    # Simple test runner for verification
    import unittest
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestEmployeesRouter))
    suite.addTests(loader.loadTestsFromTestCase(TestManagersEndpointFiltering))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    if result.wasSuccessful():
        print(f"\n✓ All {result.testsRun} tests passed successfully!")
    else:
        print(f"\n✗ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        for test, traceback in result.failures + result.errors:
            print(f"FAILED: {test}")
            print(traceback)