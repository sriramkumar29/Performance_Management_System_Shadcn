import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import date
from main import app

client = TestClient(app)

class TestAppraisalsRouter:
    """Test cases for appraisals endpoints"""
    
    def test_create_appraisal_success(self):
        """Test successful appraisal creation"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock the created appraisal
            mock_appraisal = MagicMock()
            mock_appraisal.appraisal_id = 1
            mock_appraisal.appraisee_id = 1
            mock_appraisal.appraiser_id = 2
            mock_appraisal.reviewer_id = 3
            mock_appraisal.status = "Draft"
            
            mock_session.add.return_value = None
            mock_session.commit.return_value = None
            mock_session.refresh.return_value = None
            
            response = client.post("/api/appraisals", json={
                "appraisee_id": 1,
                "appraiser_id": 2,
                "reviewer_id": 3,
                "appraisal_type_id": 1,
                "start_date": "2024-01-01",
                "end_date": "2024-12-31"
            })
            
            assert response.status_code == 201
    
    def test_get_appraisals_success(self):
        """Test successful retrieval of appraisals"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_appraisals = [
                MagicMock(
                    appraisal_id=1,
                    appraisee_id=1,
                    appraiser_id=2,
                    reviewer_id=3,
                    status="Draft",
                    start_date=date(2024, 1, 1),
                    end_date=date(2024, 12, 31)
                )
            ]
            mock_session.query().all.return_value = mock_appraisals
            
            response = client.get("/api/appraisals")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["status"] == "Draft"
    
    def test_get_appraisal_by_id_success(self):
        """Test successful retrieval of appraisal by ID"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_appraisal = MagicMock(
                appraisal_id=1,
                appraisee_id=1,
                appraiser_id=2,
                reviewer_id=3,
                status="Draft"
            )
            mock_session.query().filter().first.return_value = mock_appraisal
            
            response = client.get("/api/appraisals/1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["appraisal_id"] == 1
            assert data["status"] == "Draft"
    
    def test_get_appraisal_by_id_not_found(self):
        """Test appraisal not found by ID"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().first.return_value = None
            
            response = client.get("/api/appraisals/999")
            
            assert response.status_code == 404
            assert "Appraisal not found" in response.json()["detail"]
    
    def test_update_appraisal_status_success(self):
        """Test successful appraisal status update"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_appraisal = MagicMock()
            mock_appraisal.status = "Draft"
            mock_session.query().filter().first.return_value = mock_appraisal
            
            response = client.patch("/api/appraisals/1/status", json={
                "status": "Submitted"
            })
            
            assert response.status_code == 200
            assert mock_appraisal.status == "Submitted"
    
    def test_update_appraisal_status_not_found(self):
        """Test status update for non-existent appraisal"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().first.return_value = None
            
            response = client.patch("/api/appraisals/999/status", json={
                "status": "Submitted"
            })
            
            assert response.status_code == 404
    
    def test_get_appraisals_by_employee_success(self):
        """Test successful retrieval of appraisals by employee"""
        with patch('app.routers.appraisals.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_appraisals = [
                MagicMock(
                    appraisal_id=1,
                    appraisee_id=1,
                    status="Draft"
                )
            ]
            mock_session.query().filter().all.return_value = mock_appraisals
            
            response = client.get("/api/appraisals/employee/1")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["appraisee_id"] == 1
    
    def test_create_appraisal_invalid_data(self):
        """Test appraisal creation with invalid data"""
        response = client.post("/api/appraisals", json={
            "appraisee_id": "invalid",  # Should be integer
            "appraiser_id": 2,
            "reviewer_id": 3
        })
        
        assert response.status_code == 422
