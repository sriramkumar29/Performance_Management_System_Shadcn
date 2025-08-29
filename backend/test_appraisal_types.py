import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

class TestAppraisalTypesRouter:
    """Test cases for appraisal types endpoints"""
    
    def test_get_appraisal_types_success(self):
        """Test successful retrieval of appraisal types"""
        with patch('app.routers.appraisal_types.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_types = [
                MagicMock(
                    id=1,
                    name="Annual",
                    has_range=False
                ),
                MagicMock(
                    id=2,
                    name="Half-yearly",
                    has_range=True
                )
            ]
            mock_session.query().all.return_value = mock_types
            
            response = client.get("/api/appraisal-types")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "Annual"
            assert data[1]["name"] == "Half-yearly"
    
    def test_get_appraisal_ranges_success(self):
        """Test successful retrieval of appraisal ranges"""
        with patch('app.routers.appraisal_types.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            mock_ranges = [
                MagicMock(
                    id=1,
                    appraisal_type_id=2,
                    name="1st",
                    start_date=1,
                    end_date=6
                ),
                MagicMock(
                    id=2,
                    appraisal_type_id=2,
                    name="2nd",
                    start_date=7,
                    end_date=12
                )
            ]
            mock_session.query().filter().all.return_value = mock_ranges
            
            response = client.get("/api/appraisal-types/2/ranges")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "1st"
            assert data[1]["name"] == "2nd"
    
    def test_get_appraisal_ranges_empty(self):
        """Test retrieval of ranges for type with no ranges"""
        with patch('app.routers.appraisal_types.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().filter().all.return_value = []
            
            response = client.get("/api/appraisal-types/1/ranges")
            
            assert response.status_code == 200
            assert response.json() == []
    
    def test_get_appraisal_types_empty(self):
        """Test retrieval when no appraisal types exist"""
        with patch('app.routers.appraisal_types.get_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            mock_session.query().all.return_value = []
            
            response = client.get("/api/appraisal-types")
            
            assert response.status_code == 200
            assert response.json() == []
