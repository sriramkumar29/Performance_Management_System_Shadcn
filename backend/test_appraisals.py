import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import date
from app.models.appraisal import AppraisalStatus
from main import app

client = TestClient(app)


class TestAppraisalsRouter:
    """Test cases for appraisals endpoints"""

    @pytest.fixture
    def mock_db(self):
        """Provide a mocked DB session where execute is awaitable and returns configurable results."""
        with patch('app.routers.appraisals.get_db') as mock_get_db:
            mock_session = MagicMock()
            # The router awaits db.execute(...), so execute must be an AsyncMock
            mock_session.execute = AsyncMock()
            mock_get_db.return_value = mock_session
            yield mock_session

    def test_create_appraisal_success(self, mock_db):
        """Test successful appraisal creation"""
        # Build fake DB results
        fake_employee = MagicMock()
        fake_employee.emp_id = 1

        fake_appraisal_type = MagicMock()
        fake_appraisal_type.id = 1

        fake_appraisal = MagicMock()
        fake_appraisal.appraisal_id = 1
        fake_appraisal.appraisee_id = 1
        fake_appraisal.appraiser_id = 2
        fake_appraisal.reviewer_id = 3
        fake_appraisal.status = AppraisalStatus.DRAFT
        fake_appraisal.appraisal_goals = []

        res_emp = MagicMock()
        res_emp.scalars.return_value.first.return_value = fake_employee
        res_type = MagicMock()
        res_type.scalars.return_value.first.return_value = fake_appraisal_type
        res_created = MagicMock()
        res_created.scalars.return_value.first.return_value = fake_appraisal

        mock_db.execute.side_effect = [res_emp, res_emp, res_emp, res_type, res_created]

        response = client.post('/api/appraisals/', json={
            "appraisee_id": 1,
            "appraiser_id": 2,
            "reviewer_id": 3,
            "appraisal_type_id": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "status": "DRAFT"
        })

        assert response.status_code == 201
        body = response.json()
        assert body["appraisal_id"] == 1
        assert body["status"] == "DRAFT"

    def test_get_appraisals_success(self, mock_db):
        """Test successful retrieval of appraisals"""
        fake_appraisal = MagicMock()
        fake_appraisal.appraisal_id = 1
        fake_appraisal.appraisee_id = 1
        fake_appraisal.appraiser_id = 2
        fake_appraisal.reviewer_id = 3
        fake_appraisal.status = AppraisalStatus.DRAFT
        fake_appraisal.start_date = date(2024, 1, 1)
        fake_appraisal.end_date = date(2024, 12, 31)

        res = MagicMock()
        res.scalars.return_value.all.return_value = [fake_appraisal]
        mock_db.execute.return_value = res

        response = client.get('/api/appraisals/')
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["status"] == "DRAFT"

    def test_get_appraisal_by_id_success(self, mock_db):
        """Test successful retrieval of appraisal by ID"""
        fake_appraisal = MagicMock()
        fake_appraisal.appraisal_id = 1
        fake_appraisal.appraisee_id = 1
        fake_appraisal.appraiser_id = 2
        fake_appraisal.reviewer_id = 3
        fake_appraisal.status = AppraisalStatus.DRAFT
        fake_appraisal.appraisal_goals = []

        res = MagicMock()
        res.scalars.return_value.first.return_value = fake_appraisal
        mock_db.execute.return_value = res

        response = client.get('/api/appraisals/1')
        assert response.status_code == 200
        data = response.json()
        assert data["appraisal_id"] == 1
        assert data["status"] == "DRAFT"

    def test_get_appraisal_by_id_not_found(self, mock_db):
        """Test appraisal not found by ID"""
        res = MagicMock()
        res.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = res

        response = client.get('/api/appraisals/999')
        assert response.status_code == 404
        assert "Appraisal not found" in response.json()["detail"]

    def test_update_appraisal_status_success(self, mock_db):
        """Test successful appraisal status update to SUBMITTED"""
        fake_appraisal = MagicMock()
        fake_appraisal.status = AppraisalStatus.DRAFT

        res_app = MagicMock()
        res_app.scalars.return_value.first.return_value = fake_appraisal

        res_total = MagicMock()
        res_total.scalar.return_value = 100
        res_count = MagicMock()
        res_count.scalar.return_value = 2

        mock_db.execute.side_effect = [res_app, res_total, res_count]

        response = client.put('/api/appraisals/1/status', json={"status": "SUBMITTED"})
        assert response.status_code == 200
        assert response.json()["status"] == "SUBMITTED"

    def test_update_appraisal_status_invalid_transition(self, mock_db):
        """Test invalid status transition"""
        fake_appraisal = MagicMock()
        fake_appraisal.status = AppraisalStatus.DRAFT

        res_app = MagicMock()
        res_app.scalars.return_value.first.return_value = fake_appraisal
        mock_db.execute.return_value = res_app

        response = client.put('/api/appraisals/1/status', json={"status": "COMPLETE"})
        assert response.status_code == 400
        assert "Invalid status transition" in response.json()["detail"]

    def test_update_appraisal_status_submitted_without_goals(self, mock_db):
        """Test submitting appraisal without proper goals should fail"""
        fake_appraisal = MagicMock()
        fake_appraisal.status = AppraisalStatus.DRAFT

        res_app = MagicMock()
        res_app.scalars.return_value.first.return_value = fake_appraisal

        res_total = MagicMock()
        res_total.scalar.return_value = 80
        res_count = MagicMock()
        res_count.scalar.return_value = 1

        mock_db.execute.side_effect = [res_app, res_total, res_count]

        response = client.put('/api/appraisals/1/status', json={"status": "SUBMITTED"})
        assert response.status_code == 400
        assert "must have goals totalling 100% weightage" in response.json()["detail"]

    def test_create_appraisal_invalid_data(self, mock_db):
        """Test appraisal creation with invalid data"""
        response = client.post('/api/appraisals/', json={
            "appraisee_id": "invalid",  # Should be integer
            "appraiser_id": 2,
            "reviewer_id": 3
        })

        assert response.status_code == 422
        data = response.json()
        assert isinstance(data.get("detail"), list)
