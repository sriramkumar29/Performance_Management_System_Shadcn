"""
Integration tests for appraisal endpoints with real database operations.
Tests the full flow: API request -> business logic -> database persistence.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import date, timedelta

from app.models.appraisal import Appraisal
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType

@pytest.mark.integration
class TestAppraisalIntegration:
    """Integration tests for appraisal CRUD operations."""

    def test_create_appraisal_full_flow(
        self, 
        client: TestClient, 
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
        response = client.post(
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
        async def verify_db_record():
            result = await db_session.execute(
                select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
            )
            db_appraisal = result.scalars().first()
            assert db_appraisal is not None
            assert db_appraisal.appraisee_id == test_employee.emp_id
            assert db_appraisal.status == "Draft"
            return db_appraisal

        # Run async verification
        import asyncio
        asyncio.run(verify_db_record())

    def test_get_appraisals_with_filters(
        self,
        client: TestClient,
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
        
        create_response = client.post(
            "/api/appraisals/",
            json=appraisal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201

        # Test GET with filters
        response = client.get(
            f"/api/appraisals/?appraisee_id={test_employee.emp_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        appraisals = response.json()
        assert len(appraisals) >= 1
        assert appraisals[0]["appraisee_id"] == test_employee.emp_id

    def test_login_and_get_employee_profile(
        self,
        client: TestClient,
        test_employee: Employee
    ):
        """Test login flow and profile retrieval."""
        # Test login
        login_data = {
            "email": test_employee.emp_email,
            "password": "password123"
        }
        
        login_response = client.post("/api/employees/login", json=login_data)
        assert login_response.status_code == 200
        
        token_data = login_response.json()
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        
        # Test profile retrieval with token
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        profile_response = client.get(
            f"/api/employees/by-email?email={test_employee.emp_email}",
            headers=headers
        )
        
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["emp_email"] == test_employee.emp_email
        assert profile_data["emp_name"] == test_employee.emp_name
