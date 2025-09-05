#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
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
    
    # Add async context manager support
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)
    
    # Mock all common session methods
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

def test_update_template():
    client = TestClient(app)
    
    # Create a mock template with all required fields using attribute-style objects
    mock_template = SimpleNamespace(
        temp_id=1,
        temp_title="Old Title",
        temp_description="Old description",
        temp_performance_factor="Old factor",
        temp_importance="High",
        temp_weightage=30,
        categories=[SimpleNamespace(id=1, name="Technical")],
    )
    
    # Create a mock category
    mock_category = SimpleNamespace(id=1, name="Technical")
    
    # Mock the session and its methods
    mock_session = _create_mock_session()
    # The update endpoint makes multiple database calls:
    # 1. Query for existing template
    # 2. Query for categories (one per category name)
    mock_session.execute.side_effect = [
        _make_result(first=mock_template),  # Find existing template
        _make_result(first=mock_category),  # Find category "Technical"
    ]
    mock_session.refresh.side_effect = lambda x: setattr(mock_template, "temp_title", "Updated Title")

    # Override dependencies
    app.dependency_overrides[get_db] = lambda: mock_session
    app.dependency_overrides[get_current_user] = lambda: _create_mock_user()
    
    try:
        response = client.put(
            "/api/goals/templates/1",
            json={
                "temp_title": "Updated Title",
                "temp_description": "Updated description",
                "temp_performance_factor": "Updated factor",
                "categories": ["Technical"],  # Should be list of strings, not objects
                "temp_importance": "Medium",
                "temp_weightage": 35
            })
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            data = response.json()
            print(f"Data: {data}")
        return response.status_code == 200
    finally:
        app.dependency_overrides.clear()

if __name__ == "__main__":
    success = test_update_template()
    print(f"Test passed: {success}")