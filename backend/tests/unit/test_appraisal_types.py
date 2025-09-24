import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
from main import app
from app.routers import appraisal_types as appraisal_types_module

client = TestClient(app)


class TestAppraisalTypesRouter:
    """Test cases for appraisal types endpoints"""

    def test_get_appraisal_types_success(self):
        """Test successful retrieval of appraisal types"""
        mock_session = MagicMock()
        try:
            client.app.dependency_overrides[appraisal_types_module.get_current_user] = lambda: MagicMock()
            client.app.dependency_overrides[appraisal_types_module.get_db] = lambda: mock_session

            mock_types = [
                {"id": 1, "name": "Annual", "has_range": False},
                {"id": 2, "name": "Half-yearly", "has_range": True},
            ]

            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = mock_types
            mock_session.execute = AsyncMock(return_value=mock_result)

            response = client.get("/api/appraisal-types")

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "Annual"
            assert data[1]["name"] == "Half-yearly"
        finally:
            client.app.dependency_overrides.clear()

    def test_get_appraisal_ranges_success(self):
        """Test successful retrieval of appraisal ranges"""
        mock_session = MagicMock()
        try:
            client.app.dependency_overrides[appraisal_types_module.get_current_user] = lambda: MagicMock()
            client.app.dependency_overrides[appraisal_types_module.get_db] = lambda: mock_session

            mock_ranges = [
                {"id": 1, "appraisal_type_id": 2, "name": "1st", "start_month_offset": 1, "end_month_offset": 6},
                {"id": 2, "appraisal_type_id": 2, "name": "2nd", "start_month_offset": 7, "end_month_offset": 12},
            ]

            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = mock_ranges
            mock_session.execute = AsyncMock(return_value=mock_result)

            response = client.get("/api/appraisal-types/ranges", params={"appraisal_type_id": 2})

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "1st"
            assert data[1]["name"] == "2nd"
        finally:
            client.app.dependency_overrides.clear()

    def test_get_appraisal_ranges_empty(self):
        """Test retrieval of ranges for type with no ranges"""
        mock_session = MagicMock()
        try:
            client.app.dependency_overrides[appraisal_types_module.get_current_user] = lambda: MagicMock()
            client.app.dependency_overrides[appraisal_types_module.get_db] = lambda: mock_session

            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = []
            mock_session.execute = AsyncMock(return_value=mock_result)

            response = client.get("/api/appraisal-types/ranges", params={"appraisal_type_id": 1})

            assert response.status_code == 200
            assert response.json() == []
        finally:
            client.app.dependency_overrides.clear()

    def test_get_appraisal_types_empty(self):
        """Test retrieval when no appraisal types exist"""
        mock_session = MagicMock()
        try:
            client.app.dependency_overrides[appraisal_types_module.get_current_user] = lambda: MagicMock()
            client.app.dependency_overrides[appraisal_types_module.get_db] = lambda: mock_session

            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = []
            mock_session.execute = AsyncMock(return_value=mock_result)

            response = client.get("/api/appraisal-types")

            assert response.status_code == 200
            assert response.json() == []
        finally:
            client.app.dependency_overrides.clear()
