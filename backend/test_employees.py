import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestEmployeesRouter:
    """Test cases for employees endpoints"""
    
    def test_get_employees_success(self):
        """Test successful retrieval of employees list"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock employees data
            mock_employees = [
                MagicMock(
                    emp_id=1,
                    emp_name="John Doe",
                    emp_email="john@company.com",
                    emp_department="Engineering",
                    emp_roles="Manager",
                    emp_roles_level=5,
                    emp_status=True
                ),
                MagicMock(
                    emp_id=2,
                    emp_name="Jane Smith",
                    emp_email="jane@company.com",
                    emp_department="HR",
                    emp_roles="Team Lead",
                    emp_roles_level=4,
                    emp_status=True
                )
            ]
            mock_session.query().all.return_value = mock_employees
            
            response = client.get("/api/employees")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["emp_name"] == "John Doe"
            assert data[1]["emp_name"] == "Jane Smith"
    
    def test_get_employee_by_id_success(self):
        """Test successful retrieval of employee by ID"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_employee = MagicMock(
                emp_id=1,
                emp_name="John Doe",
                emp_email="john@company.com",
                emp_department="Engineering",
                emp_roles="Manager",
                emp_roles_level=5,
                emp_status=True
            )
            mock_session.query().filter().first.return_value = mock_employee
            
            response = client.get("/api/employees/1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["emp_name"] == "John Doe"
            assert data["emp_id"] == 1
    
    def test_get_employee_by_id_not_found(self):
        """Test employee not found by ID"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().first.return_value = None
            
            response = client.get("/api/employees/999")
            
            assert response.status_code == 404
            assert "Employee not found" in response.json()["detail"]
    
    def test_get_managers_success(self):
        """Test successful retrieval of managers list"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_managers = [
                MagicMock(
                    emp_id=1,
                    emp_name="John Manager",
                    emp_email="john.manager@company.com",
                    emp_roles="Manager",
                    emp_roles_level=5
                ),
                MagicMock(
                    emp_id=2,
                    emp_name="Jane VP",
                    emp_email="jane.vp@company.com",
                    emp_roles="VP",
                    emp_roles_level=6
                )
            ]
            mock_session.query().filter().all.return_value = mock_managers
            
            response = client.get("/api/employees/managers")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert all(emp["emp_roles_level"] >= 5 for emp in data)
    
    def test_get_employees_empty_list(self):
        """Test retrieval when no employees exist"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().all.return_value = []
            
            response = client.get("/api/employees")
            
            assert response.status_code == 200
            assert response.json() == []
    
    def test_get_managers_empty_list(self):
        """Test retrieval when no managers exist"""
        with patch('app.routers.employees.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().all.return_value = []
            
            response = client.get("/api/employees/managers")
            
            assert response.status_code == 200
            assert response.json() == []
