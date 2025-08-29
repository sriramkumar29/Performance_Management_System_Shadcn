import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestGoalsRouter:
    """Test cases for goals endpoints"""
    
    def test_get_goal_templates_success(self):
        """Test successful retrieval of goal templates"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_templates = [
                MagicMock(
                    temp_id=1,
                    temp_title="Technical Skills",
                    temp_description="Improve technical capabilities",
                    temp_performance_factor="Quality of work",
                    temp_category="Technical",
                    temp_importance="High",
                    temp_weightage=30
                ),
                MagicMock(
                    temp_id=2,
                    temp_title="Communication",
                    temp_description="Enhance communication skills",
                    temp_performance_factor="Team collaboration",
                    temp_category="Soft Skills",
                    temp_importance="Medium",
                    temp_weightage=20
                )
            ]
            mock_session.query().all.return_value = mock_templates
            
            response = client.get("/api/goals/templates")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["temp_title"] == "Technical Skills"
            assert data[1]["temp_title"] == "Communication"
    
    def test_create_goal_template_success(self):
        """Test successful goal template creation"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_template = MagicMock()
            mock_template.temp_id = 1
            mock_session.add.return_value = None
            mock_session.commit.return_value = None
            mock_session.refresh.return_value = None
            
            response = client.post("/api/goals/templates", json={
                "temp_title": "Leadership Skills",
                "temp_description": "Develop leadership capabilities",
                "temp_performance_factor": "Team management",
                "temp_category": "Leadership",
                "temp_importance": "High",
                "temp_weightage": 25
            })
            
            assert response.status_code == 201
    
    def test_update_goal_template_success(self):
        """Test successful goal template update"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_template = MagicMock()
            mock_template.temp_title = "Old Title"
            mock_session.query().filter().first.return_value = mock_template
            
            response = client.put("/api/goals/templates/1", json={
                "temp_title": "Updated Title",
                "temp_description": "Updated description",
                "temp_performance_factor": "Updated factor",
                "temp_category": "Updated category",
                "temp_importance": "Medium",
                "temp_weightage": 30
            })
            
            assert response.status_code == 200
            assert mock_template.temp_title == "Updated Title"
    
    def test_update_goal_template_not_found(self):
        """Test update of non-existent goal template"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().first.return_value = None
            
            response = client.put("/api/goals/templates/999", json={
                "temp_title": "Updated Title"
            })
            
            assert response.status_code == 404
    
    def test_delete_goal_template_success(self):
        """Test successful goal template deletion"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_template = MagicMock()
            mock_session.query().filter().first.return_value = mock_template
            
            response = client.delete("/api/goals/templates/1")
            
            assert response.status_code == 204
            mock_session.delete.assert_called_once_with(mock_template)
    
    def test_delete_goal_template_not_found(self):
        """Test deletion of non-existent goal template"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().first.return_value = None
            
            response = client.delete("/api/goals/templates/999")
            
            assert response.status_code == 404
    
    def test_get_goals_by_appraisal_success(self):
        """Test successful retrieval of goals by appraisal"""
        with patch('app.routers.goals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_goals = [
                MagicMock(
                    goal_id=1,
                    goal_title="Technical Excellence",
                    goal_weightage=40,
                    self_rating=4,
                    appraiser_rating=4
                )
            ]
            mock_session.query().join().filter().all.return_value = mock_goals
            
            response = client.get("/api/goals/appraisal/1")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["goal_title"] == "Technical Excellence"
    
    def test_create_goal_invalid_weightage(self):
        """Test goal creation with invalid weightage"""
        response = client.post("/api/goals/templates", json={
            "temp_title": "Test Goal",
            "temp_description": "Test description",
            "temp_performance_factor": "Test factor",
            "temp_category": "Test",
            "temp_importance": "High",
            "temp_weightage": 150  # Invalid: > 100
        })
        
        assert response.status_code == 422
