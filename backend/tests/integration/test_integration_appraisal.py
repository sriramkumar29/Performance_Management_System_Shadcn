"""
Integration tests for appraisal endpoints with real database operations.
Tests the full flow: API request -> business logic -> database persistence.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import date, timedelta

from app.models.appraisal import Appraisal
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType
from app.constants import APPRAISAL_NOT_FOUND


@pytest.mark.integration
class TestAppraisalIntegration:
    """Integration tests for appraisal CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_appraisal_full_flow(
        self, 
        async_client: AsyncClient, 
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test creating an appraisal and verify DB record is created."""
        appraisal_data = {
            "appraisee_id": test_employee.emp_id,
            "appraiser_id": test_employee.emp_id,
            "reviewer_id": test_employee.emp_id,
            "appraisal_type_id": test_appraisal_type.id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365))
        }

        # Make API request
        response = await async_client.post(
            "/api/appraisals/",
            json=appraisal_data,
            headers=auth_headers
        )

        # Assert API response
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["appraisee_id"] == test_employee.emp_id
        assert response_data["status"] == "Draft"
        appraisal_id = response_data["appraisal_id"]

        # Verify database record was created
        result = await db_session.execute(
            select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
        )
        db_appraisal = result.scalars().first()
        assert db_appraisal is not None
        assert db_appraisal.appraisee_id == test_employee.emp_id
        assert db_appraisal.status == "Draft"

    @pytest.mark.asyncio
    async def test_get_appraisals_with_filters(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType
    ):
        """Test retrieving appraisals with filters."""
        # Create test appraisal first
        appraisal_data = {
            "appraisee_id": test_employee.emp_id,
            "appraiser_id": test_employee.emp_id,
            "reviewer_id": test_employee.emp_id,
            "appraisal_type_id": test_appraisal_type.id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365))
        }
        
        create_response = await async_client.post(
            "/api/appraisals/",
            json=appraisal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201

        # Test GET with filters
        response = await async_client.get(
            f"/api/appraisals/?appraisee_id={test_employee.emp_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        appraisals = response.json()
        assert len(appraisals) >= 1
        assert appraisals[0]["appraisee_id"] == test_employee.emp_id

    @pytest.mark.asyncio
    async def test_login_and_get_employee_profile(
        self,
        async_client: AsyncClient,
        test_employee: Employee
    ):
        """Test login flow and profile retrieval."""
        # Test login
        login_data = {
            "email": test_employee.emp_email,
            "password": "password123"
        }
        
        login_response = await async_client.post("/api/employees/login", json=login_data)
        assert login_response.status_code == 200
        
        token_data = login_response.json()
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        
        # Test profile retrieval with token
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        profile_response = await async_client.get(
            f"/api/employees/by-email?email={test_employee.emp_email}",
            headers=headers
        )
        
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["emp_email"] == test_employee.emp_email
        assert profile_data["emp_name"] == test_employee.emp_name

    # -----------------------------
    # Additional edge case tests
    # -----------------------------

    @pytest.mark.asyncio
    async def test_create_appraisal_with_nonexistent_appraisee_returns_400(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
    ):
        """Creating with an unknown appraisee should return 400 with clear message."""
        appraisal_data = {
            "appraisee_id": 999999,  # non-existent
            "appraiser_id": test_employee.emp_id,
            "reviewer_id": test_employee.emp_id,
            "appraisal_type_id": test_appraisal_type.id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365)),
        }

        response = await async_client.post(
            "/api/appraisals/",
            json=appraisal_data,
            headers=auth_headers,
        )

        assert response.status_code == 400
        data = response.json()
        assert "Appraisee not found" in data.get("detail", "")

    @pytest.mark.asyncio
    async def test_update_status_to_submitted_without_goals_returns_400(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
    ):
        """Submitting a draft appraisal without goals/100% weightage should fail."""
        # Create a draft appraisal first
        create_resp = await async_client.post(
            "/api/appraisals/",
            json={
                "appraisee_id": test_employee.emp_id,
                "appraiser_id": test_employee.emp_id,
                "reviewer_id": test_employee.emp_id,
                "appraisal_type_id": test_appraisal_type.id,
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=365)),
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        appraisal_id = create_resp.json()["appraisal_id"]

        # Attempt to submit without goals / 100% weightage
        submit_resp = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json={"status": "Submitted"},
            headers=auth_headers,
        )

        assert submit_resp.status_code == 400
        detail = submit_resp.json().get("detail", "")
        assert "must have goals" in detail.lower()
        assert "100%" in detail

    @pytest.mark.asyncio
    async def test_read_appraisal_not_found_returns_404(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        response = await async_client.get("/api/appraisals/999999", headers=auth_headers)
        assert response.status_code == 404
        assert APPRAISAL_NOT_FOUND in response.json().get("detail", "")

    @pytest.mark.asyncio
    async def test_delete_appraisal_not_found_returns_404(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        response = await async_client.delete("/api/appraisals/999999", headers=auth_headers)
        assert response.status_code == 404
        assert APPRAISAL_NOT_FOUND in response.json().get("detail", "")

    @pytest.mark.asyncio
    async def test_self_assessment_wrong_status_returns_400(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
    ):
        """Self assessment can only be updated in APPRAISEE_SELF_ASSESSMENT status."""
        # Create a draft appraisal first
        create_resp = await async_client.post(
            "/api/appraisals/",
            json={
                "appraisee_id": test_employee.emp_id,
                "appraiser_id": test_employee.emp_id,
                "reviewer_id": test_employee.emp_id,
                "appraisal_type_id": test_appraisal_type.id,
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=365)),
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        appraisal_id = create_resp.json()["appraisal_id"]

        # Try to update self assessment while in Draft
        sa_resp = await async_client.put(
            f"/api/appraisals/{appraisal_id}/self-assessment",
            json={"goals": {}},
            headers=auth_headers,
        )

        assert sa_resp.status_code == 400
        assert "Cannot update self assessment" in sa_resp.json().get("detail", "")

    @pytest.mark.asyncio
    async def test_update_appraisal_with_invalid_type_returns_400(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
    ):
        """Updating appraisal_type_id to a non-existent type should return 400."""
        # Create a draft appraisal first
        create_resp = await async_client.post(
            "/api/appraisals/",
            json={
                "appraisee_id": test_employee.emp_id,
                "appraiser_id": test_employee.emp_id,
                "reviewer_id": test_employee.emp_id,
                "appraisal_type_id": test_appraisal_type.id,
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=365)),
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        appraisal_id = create_resp.json()["appraisal_id"]

        # Update to an invalid type id
        upd_resp = await async_client.put(
            f"/api/appraisals/{appraisal_id}",
            json={"appraisal_type_id": 999999},
            headers=auth_headers,
        )

        assert upd_resp.status_code == 400
        assert "Appraisal type not found" in upd_resp.json().get("detail", "")
