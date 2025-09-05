import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
from types import SimpleNamespace
from main import app
from app.db.database import get_db
from app.routers.auth import get_current_user

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

class TestGoalsRouter:
    """Test cases for goals endpoints"""

    def _override_user_and_db(self, mock_session):
        """Helper to override FastAPI dependencies for auth and DB."""
        app.dependency_overrides[get_db] = lambda: mock_session
        app.dependency_overrides[get_current_user] = lambda: _create_mock_user()

    def _clear_overrides(self):
        """Helper to clean up dependency overrides."""
        app.dependency_overrides.clear()

    def test_get_goal_templates_success(self):
        """Test successful retrieval of goal templates"""
        mock_session = _create_mock_session()
        mock_session.execute.return_value = _make_result(all=[
            {
                "temp_id": 1,
                "temp_title": "Technical Skills",
                "temp_description": "Improve technical capabilities",
                "temp_performance_factor": "Quality of work",
                "categories": [{"id": 1, "name": "Technical"}],
                "temp_importance": "High",
                "temp_weightage": 30
            },
            {
                "temp_id": 2,
                "temp_title": "Communication",
                "temp_description": "Enhance communication skills",
                "temp_performance_factor": "Team collaboration",
                "categories": [{"id": 2, "name": "Soft Skills"}],
                "temp_importance": "Medium",
                "temp_weightage": 20
            }
        ])

        self._override_user_and_db(mock_session)
        try:
            response = client.get("/api/goals/templates")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["temp_title"] == "Technical Skills"
            assert data[1]["temp_title"] == "Communication"
        finally:
            self._clear_overrides()
    
    def test_create_goal_template_success(self):
        """Test successful goal template creation"""
        mock_session = _create_mock_session()
        mock_session.execute.side_effect = [
            _make_result(first=None),  # Check if template exists
            _make_result(first={
                "temp_id": 1,
                "temp_title": "Leadership Skills",
                "temp_description": "Develop leadership capabilities",
                "temp_performance_factor": "Team management",
                "categories": [{"id": 3, "name": "Leadership"}],
                "temp_importance": "High",
                "temp_weightage": 25,
            }),
        ]

        self._override_user_and_db(mock_session)
        try:
            response = client.post(
                "/api/goals/templates",
                json={
                    "temp_title": "Leadership Skills",
                    "temp_description": "Develop leadership capabilities",
                    "temp_performance_factor": "Team management",
                    "categories": ["Leadership"],
                    "temp_importance": "High",
                    "temp_weightage": 25
                })
            assert response.status_code == 201
            data = response.json()
            assert data["temp_title"] == "Leadership Skills"
            assert data["temp_weightage"] == 25
        finally:
            self._clear_overrides()
    
    def test_update_goal_template_success(self):
        """Test successful goal template update"""
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

        self._override_user_and_db(mock_session)
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
            if response.status_code != 200:
                print(f"Error response: {response.status_code} - {response.text}")
            assert response.status_code == 200
            data = response.json()
            assert data["temp_id"] == 1
            assert data["temp_title"] == "Updated Title"
            assert data["temp_weightage"] == 35
            assert data["categories"][0]["name"] == "Technical"
            assert data["categories"][0]["id"] == 1
        finally:
            self._clear_overrides()
    
    def test_update_goal_template_not_found(self):
        """Test updating non-existent goal template"""
        # Mock the session to return None for the template query
        mock_session = _create_mock_session()
        mock_session.execute.return_value = _make_result(first=None)

        self._override_user_and_db(mock_session)
        try:
            # Attempt to update a non-existent template
            response = client.put(
                "/api/goals/templates/999",
                json={
                    "temp_title": "Updated Title",
                    "temp_description": "Updated description",
                    "temp_performance_factor": "Updated factor",
                    "categories": ["Technical"],  # Should be list of strings, not objects
                    "temp_importance": "Medium",
                    "temp_weightage": 35
                })
            
            # Verify the response
            assert response.status_code == 404
            data = response.json()
            assert data["detail"] == "Goal template not found"
            
            # Verify the session methods were called as expected
            mock_session.execute.assert_called_once()
            mock_session.refresh.assert_not_called()
            mock_session.commit.assert_not_called()
        finally:
            self._clear_overrides()
    
    def test_delete_goal_template_success(self):
        """Test successful goal template deletion"""
        mock_session = _create_mock_session()
        mock_session.execute.side_effect = [
            _make_result(first={
                "temp_id": 1,
                "temp_title": "Title",
                "temp_description": "Description",
                "temp_performance_factor": "Factor",
                "categories": [{"id": 1, "name": "Technical"}],
                "temp_importance": "High",
                "temp_weightage": 30,
            }),
            _make_result(first=None)  # After deletion
        ]

        self._override_user_and_db(mock_session)
        try:
            response = client.delete("/api/goals/templates/1")
            assert response.status_code == 204
        finally:
            self._clear_overrides()

    def test_delete_goal_template_not_found(self):
        """Test deleting non-existent goal template"""
        mock_session = _create_mock_session()
        mock_session.execute.return_value = _make_result(first=None)
        
        self._override_user_and_db(mock_session)
        try:
            response = client.delete("/api/goals/templates/999")
            assert response.status_code == 404
            data = response.json()
            assert data["detail"] == "Goal template not found"
            mock_session.execute.assert_called_once()  # Verify we looked for the template
            mock_session.delete.assert_not_called()  # Verify delete was not called
        finally:
            self._clear_overrides()
    
    def test_get_goals_by_appraisal_success(self):
        """Test getting all appraisal-goal records for an appraisal"""
        mock_session = _create_mock_session()
        # Build nested objects matching AppraisalGoalResponse with all required fields
        goal1 = SimpleNamespace(
            goal_id=1,
            goal_title="Goal 1",
            goal_description="Description 1",
            goal_performance_factor="Technical",
            goal_importance="High",
            goal_weightage=30,
            goal_template_id=None,
            category_id=1,
            category=SimpleNamespace(id=1, name="Technical")
        )
        goal2 = SimpleNamespace(
            goal_id=2,
            goal_title="Goal 2",
            goal_description="Description 2",
            goal_performance_factor="Management",
            goal_importance="Medium",
            goal_weightage=40,
            goal_template_id=None,
            category_id=2,
            category=SimpleNamespace(id=2, name="Management")
        )
        ag1 = SimpleNamespace(id=11, appraisal_id=1, goal_id=1, self_comment=None, self_rating=None, appraiser_comment=None, appraiser_rating=None, goal=goal1)
        ag2 = SimpleNamespace(id=12, appraisal_id=1, goal_id=2, self_comment=None, self_rating=None, appraiser_comment=None, appraiser_rating=None, goal=goal2)
        mock_session.execute.return_value = _make_result(all=[ag1, ag2])

        self._override_user_and_db(mock_session)
        try:
            # The endpoint expects appraisal_id as a query parameter
            response = client.get("/api/goals/appraisal-goals?appraisal_id=1")
            
            if response.status_code != 200:
                print(f"Error response: {response.status_code} - {response.text}")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            # Verify basic structure - the endpoint may not include nested goal info
            assert data[0]["id"] == 11
            assert data[0]["appraisal_id"] == 1
            assert data[0]["goal_id"] == 1
            assert data[1]["id"] == 12
            assert data[1]["appraisal_id"] == 1
            assert data[1]["goal_id"] == 2
        finally:
            self._clear_overrides()
    
    def test_create_goal_invalid_weightage(self):
        """Test goal creation with invalid weightage"""
        mock_session = _create_mock_session()
        mock_session.execute.return_value = _make_result(first=None)
        
        self._override_user_and_db(mock_session)
        
        try:
            response = client.post(
                "/api/goals/templates",
                json={
                    "temp_title": "Test Goal",
                    "temp_description": "Test description",
                    "temp_performance_factor": "Test factor",
                    "categories": ["Technical"],
                    "temp_importance": "High",
                    "temp_weightage": 150  # Invalid: > 100
                })
            
            assert response.status_code == 422
            data = response.json()
            assert "weightage" in str(data["detail"]).lower()
            assert "100" in str(data["detail"])
        finally:
            self._clear_overrides()
