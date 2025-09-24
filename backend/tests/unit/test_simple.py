#!/usr/bin/env python3
"""
Simple test to verify the employee test fixes work
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from types import SimpleNamespace
from main import app
from app.db.database import get_db
from app.routers.auth import get_current_user

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
    mock_session.execute = MagicMock()
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

def test_employees_endpoint():
    """Test the employees endpoint with proper mocking"""
    # Set up mocks
    mock_session = _create_mock_session()
    mock_employees = [
        SimpleNamespace(
            emp_id=1,
            emp_name="John Doe",
            emp_email="john@company.com",
            emp_department="Engineering",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_status=True
        ),
        SimpleNamespace(
            emp_id=2,
            emp_name="Jane Smith",
            emp_email="jane@company.com",
            emp_department="HR",
            emp_roles="Team Lead",
            emp_roles_level=4,
            emp_status=True
        )
    ]
    
    mock_session.execute.return_value = _make_result(all=mock_employees)
    
    # Override dependencies
    app.dependency_overrides[get_db] = lambda: mock_session
    app.dependency_overrides[get_current_user] = lambda: _create_mock_user()
    
    try:
        client = TestClient(app)
        response = client.get("/api/employees")
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {data}")
            print(f"Number of employees: {len(data)}")
            if len(data) >= 2:
                print("✓ Test PASSED: Got expected number of employees")
                return True
            else:
                print("✗ Test FAILED: Unexpected number of employees")
                return False
        else:
            print(f"✗ Test FAILED: Status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Test FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        app.dependency_overrides.clear()

if __name__ == "__main__":
    success = test_employees_endpoint()
    if success:
        print("\n✓ Employee tests should now work correctly!")
    else:
        print("\n✗ There are still issues with the employee tests.")