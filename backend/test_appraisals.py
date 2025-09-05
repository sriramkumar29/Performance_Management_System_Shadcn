import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
from types import SimpleNamespace
from datetime import date
from app.models.appraisal import AppraisalStatus
from main import app
from app.db.database import get_db
from app.routers.auth import get_current_user

client = TestClient(app)


def _make_result(all=None, first=None, scalar=None):
    """Helper to create a mock database result that supports result.scalars().all() / .first() and result.scalar()"""
    result = MagicMock()
    scalars = MagicMock()
    if all is not None:
        scalars.all.return_value = all
    if first is not None:
        scalars.first.return_value = first
    result.scalars.return_value = scalars
    if scalar is not None:
        result.scalar.return_value = scalar
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


class TestAppraisalsRouter:
    """Test cases for appraisals endpoints"""

    def _override_user_and_db(self, mock_session):
        """Helper to override FastAPI dependencies for auth and DB."""
        app.dependency_overrides[get_db] = lambda: mock_session
        app.dependency_overrides[get_current_user] = lambda: _create_mock_user()

    def _clear_overrides(self):
        """Helper to clean up dependency overrides."""
        app.dependency_overrides.clear()

    def test_create_appraisal_success(self):
        """Test successful appraisal creation"""
        mock_session = _create_mock_session()
        
        # Build fake DB results
        fake_employee = SimpleNamespace(emp_id=1)
        fake_appraisal_type = SimpleNamespace(id=1)
        fake_appraisal = SimpleNamespace(
            appraisal_id=1,
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            status=AppraisalStatus.DRAFT,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            appraisal_type_id=1,
            appraisal_type_range_id=None,
            appraiser_overall_comments=None,
            appraiser_overall_rating=None,
            reviewer_overall_comments=None,
            reviewer_overall_rating=None,
            created_at=date(2024, 1, 1),
            updated_at=date(2024, 1, 1),
            appraisal_goals=[]
        )

        # Mock the sequence of database calls
        mock_session.execute.side_effect = [
            _make_result(first=fake_employee),      # Check appraisee exists
            _make_result(first=fake_employee),      # Check appraiser exists  
            _make_result(first=fake_employee),      # Check reviewer exists
            _make_result(first=fake_appraisal_type), # Check appraisal type exists
            _make_result(first=fake_appraisal)      # Return created appraisal
        ]

        self._override_user_and_db(mock_session)
        try:
            response = client.post('/api/appraisals/', json={
                "appraisee_id": 1,
                "appraiser_id": 2,
                "reviewer_id": 3,
                "appraisal_type_id": 1,
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "status": "Draft"  # Use the actual enum value
            })

            assert response.status_code == 201
            body = response.json()
            assert body["appraisal_id"] == 1
            assert body["status"] == "Draft"  # AppraisalStatus.DRAFT = "Draft"
        finally:
            self._clear_overrides()

    def test_get_appraisals_success(self):
        """Test successful retrieval of appraisals"""
        mock_session = _create_mock_session()
        
        fake_appraisal = SimpleNamespace(
            appraisal_id=1,
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            status=AppraisalStatus.DRAFT,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            appraisal_type_id=1,
            appraisal_type_range_id=None,
            appraiser_overall_comments=None,
            appraiser_overall_rating=None,
            reviewer_overall_comments=None,
            reviewer_overall_rating=None,
            created_at=date(2024, 1, 1),
            updated_at=date(2024, 1, 1)
        )

        mock_session.execute.return_value = _make_result(all=[fake_appraisal])

        self._override_user_and_db(mock_session)
        try:
            response = client.get('/api/appraisals/')
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["status"] == "Draft"  # AppraisalStatus.DRAFT = "Draft"
        finally:
            self._clear_overrides()

    def test_get_appraisal_by_id_success(self):
        """Test successful retrieval of appraisal by ID"""
        mock_session = _create_mock_session()
        
        fake_appraisal = SimpleNamespace(
            appraisal_id=1,
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            status=AppraisalStatus.DRAFT,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            appraisal_type_id=1,
            appraisal_type_range_id=None,
            appraiser_overall_comments=None,
            appraiser_overall_rating=None,
            reviewer_overall_comments=None,
            reviewer_overall_rating=None,
            created_at=date(2024, 1, 1),
            updated_at=date(2024, 1, 1),
            appraisal_goals=[]
        )

        mock_session.execute.return_value = _make_result(first=fake_appraisal)

        self._override_user_and_db(mock_session)
        try:
            response = client.get('/api/appraisals/1')
            assert response.status_code == 200
            data = response.json()
            assert data["appraisal_id"] == 1
            assert data["status"] == "Draft"  # AppraisalStatus.DRAFT = "Draft"
        finally:
            self._clear_overrides()

    def test_get_appraisal_by_id_not_found(self):
        """Test appraisal not found by ID"""
        mock_session = _create_mock_session()
        
        # Create explicit mock setup for None result
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.first.return_value = None
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        self._override_user_and_db(mock_session)
        try:
            response = client.get('/api/appraisals/999')
            assert response.status_code == 404
            data = response.json()
            assert "Appraisal not found" in data["detail"]
        finally:
            self._clear_overrides()

    def test_update_appraisal_status_success(self):
        """Test successful appraisal status update to SUBMITTED"""
        mock_session = _create_mock_session()
        
        fake_appraisal = SimpleNamespace(
            appraisal_id=1,
            status=AppraisalStatus.DRAFT,
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            appraisal_type_id=1,
            appraisal_type_range_id=None,
            appraiser_overall_comments=None,
            appraiser_overall_rating=None,
            reviewer_overall_comments=None,
            reviewer_overall_rating=None,
            created_at=date(2024, 1, 1),
            updated_at=date(2024, 1, 1)
        )

        # Mock the sequence of database calls for status update
        mock_session.execute.side_effect = [
            _make_result(first=fake_appraisal),  # Find appraisal
            _make_result(scalar=100),           # Total weightage
            _make_result(scalar=2)              # Goal count
        ]

        self._override_user_and_db(mock_session)
        try:
            response = client.put('/api/appraisals/1/status', json={"status": "Submitted"})
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "Submitted"  # AppraisalStatus.SUBMITTED = "Submitted"
        finally:
            self._clear_overrides()

    def test_update_appraisal_status_invalid_transition(self):
        """Test invalid status transition"""
        mock_session = _create_mock_session()
        
        fake_appraisal = SimpleNamespace(
            appraisal_id=1,
            status=AppraisalStatus.DRAFT,
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            appraisal_type_id=1
        )

        mock_session.execute.return_value = _make_result(first=fake_appraisal)

        self._override_user_and_db(mock_session)
        try:
            response = client.put('/api/appraisals/1/status', json={"status": "Complete"})
            assert response.status_code == 400
            data = response.json()
            assert "Invalid status transition" in data["detail"]
        finally:
            self._clear_overrides()

    def test_update_appraisal_status_submitted_without_goals(self):
        """Test submitting appraisal without proper goals should fail"""
        mock_session = _create_mock_session()
        
        fake_appraisal = SimpleNamespace(
            appraisal_id=1,
            status=AppraisalStatus.DRAFT,
            appraisee_id=1,
            appraiser_id=2,
            reviewer_id=3,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            appraisal_type_id=1
        )

        # Mock insufficient goals (80% weightage, 1 goal)
        mock_session.execute.side_effect = [
            _make_result(first=fake_appraisal),  # Find appraisal
            _make_result(scalar=80),            # Total weightage (insufficient)
            _make_result(scalar=1)              # Goal count
        ]

        self._override_user_and_db(mock_session)
        try:
            response = client.put('/api/appraisals/1/status', json={"status": "Submitted"})
            assert response.status_code == 400
            data = response.json()
            assert "must have goals totalling 100% weightage" in data["detail"]
        finally:
            self._clear_overrides()

    def test_create_appraisal_invalid_data(self):
        """Test appraisal creation with invalid data"""
        mock_session = _create_mock_session()

        self._override_user_and_db(mock_session)
        try:
            response = client.post('/api/appraisals/', json={
                "appraisee_id": "invalid",  # Should be integer
                "appraiser_id": 2,
                "reviewer_id": 3
            })

            assert response.status_code == 422
            data = response.json()
            assert isinstance(data.get("detail"), list)
        finally:
            self._clear_overrides()