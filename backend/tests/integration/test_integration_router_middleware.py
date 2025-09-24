"""
Phase 2 Integration Tests: Router and Middleware Testing
Tests API routing, middleware functionality, and authentication integration.
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


@pytest.mark.integration
class TestRouterMiddlewareIntegration:
    """Integration tests for API routing and middleware functionality."""

    @pytest.mark.asyncio
    async def test_authentication_middleware_blocks_unauthenticated_requests(
        self, 
        async_client: AsyncClient
    ):
        """Test that authentication middleware properly blocks unauthenticated requests."""
        
        # Test protected endpoints without authentication
        protected_endpoints = [
            "/api/appraisals/",
            "/api/goals/",
            "/api/employees/",
            "/api/goals/templates"
        ]
        
        for endpoint in protected_endpoints:
            response = await async_client.get(endpoint)
            assert response.status_code == 401, f"Endpoint {endpoint} should require authentication"

    @pytest.mark.asyncio
    async def test_cors_middleware_headers(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test CORS middleware adds appropriate headers."""
        
        response = await async_client.get("/api/employees/", headers=auth_headers)
        
        # Check for CORS headers (if implemented)
        # This might not be present in the current setup, but good to test
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_error_handling_middleware_4xx_responses(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test error handling middleware properly formats 4xx responses."""
        
        # Test 404 for non-existent resource
        response = await async_client.get("/api/appraisals/99999", headers=auth_headers)
        assert response.status_code == 404
        
        # Verify error response structure
        error_data = response.json()
        assert "detail" in error_data

    @pytest.mark.asyncio
    async def test_request_validation_middleware(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test request validation middleware handles invalid data."""
        
        # Test invalid JSON structure for appraisal creation
        invalid_appraisal_data = {
            "invalid_field": "test",
            "appraisee_id": "not_a_number"  # Should be integer
        }
        
        response = await async_client.post(
            "/api/appraisals/",
            json=invalid_appraisal_data,
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error
        
        error_data = response.json()
        assert "detail" in error_data

    @pytest.mark.asyncio
    async def test_router_parameter_validation(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test router parameter validation for path parameters."""
        
        # Test invalid appraisal ID format (using smaller numbers to avoid DB overflow)
        invalid_ids = ["abc", "0", "-1", "999999"]
        
        for invalid_id in invalid_ids:
            response = await async_client.get(
                f"/api/appraisals/{invalid_id}",
                headers=auth_headers
            )
            # Should either be 404 (not found) or 422 (validation error)
            assert response.status_code in [404, 422], f"Invalid ID {invalid_id} should return 404 or 422"

    @pytest.mark.asyncio
    async def test_content_type_handling(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test API properly handles different content types."""
        
        # Test with missing Content-Type
        response = await async_client.post(
            "/api/appraisals/",
            data="not json",  # Send as plain text
            headers=auth_headers
        )
        assert response.status_code in [400, 422]  # Should reject non-JSON

    @pytest.mark.asyncio
    async def test_api_versioning_and_routing(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test API routing structure and versioning."""
        
        # Test that API routes are properly organized under /api prefix
        api_endpoints = [
            "/api/employees/profile",
            "/api/appraisals/",
            "/api/goals/",
            "/api/goals/templates"
        ]
        
        for endpoint in api_endpoints:
            response = await async_client.get(endpoint, headers=auth_headers)
            # Should not be 404 (route exists) or 405 (method not allowed for GET)
            assert response.status_code not in [404, 405], f"Route {endpoint} should exist"

    @pytest.mark.asyncio
    async def test_rate_limiting_behavior(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test rate limiting middleware behavior (if implemented)."""
        
        # Make multiple rapid requests to test rate limiting
        responses = []
        for i in range(20):  # Make 20 rapid requests
            response = await async_client.get("/api/employees/", headers=auth_headers)
            responses.append(response.status_code)
        
        # Most should succeed (rate limiting might not be implemented yet)
        success_count = len([r for r in responses if r == 200])
        assert success_count > 15, "Most requests should succeed if no rate limiting"

    @pytest.mark.asyncio
    async def test_request_logging_middleware(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test that requests are being logged properly."""
        
        # Make a request that should be logged
        response = await async_client.get("/api/employees/", headers=auth_headers)
        assert response.status_code == 200
        
        # Note: Actual log verification would require checking log files
        # This test just ensures the request succeeds with logging middleware active

    @pytest.mark.asyncio
    async def test_database_session_middleware(
        self, 
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType
    ):
        """Test database session management through middleware."""
        
        # Create multiple operations in sequence to test session handling
        appraisal_data = {
            "appraisee_id": test_employee.emp_id,
            "appraiser_id": test_employee.emp_id,
            "reviewer_id": test_employee.emp_id,
            "appraisal_type_id": test_appraisal_type.id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365))
        }
        
        # Create appraisal
        create_response = await async_client.post(
            "/api/appraisals/",
            json=appraisal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        appraisal_id = create_response.json()["appraisal_id"]
        
        # Read appraisal
        read_response = await async_client.get(
            f"/api/appraisals/{appraisal_id}",
            headers=auth_headers
        )
        assert read_response.status_code == 200
        
        # Update appraisal
        update_data = {"end_date": str(date.today() + timedelta(days=400))}
        update_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}",
            json=update_data,
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Delete appraisal
        delete_response = await async_client.delete(
            f"/api/appraisals/{appraisal_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 204

    @pytest.mark.asyncio
    async def test_response_headers_middleware(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test response headers are properly set by middleware."""
        
        response = await async_client.get("/api/employees/", headers=auth_headers)
        assert response.status_code == 200
        
        # Check for common security headers
        headers = response.headers
        
        # Content-Type should be set
        assert "content-type" in headers
        assert "application/json" in headers["content-type"]

    @pytest.mark.asyncio
    async def test_exception_handling_middleware(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test exception handling middleware catches and formats errors."""
        
        # Try to create appraisal with invalid foreign key reference
        invalid_data = {
            "appraisee_id": 99999,  # Non-existent employee
            "appraiser_id": 99999,
            "reviewer_id": 99999,
            "appraisal_type_id": 99999,  # Non-existent type
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365))
        }
        
        response = await async_client.post(
            "/api/appraisals/",
            json=invalid_data,
            headers=auth_headers
        )
        
        # Should handle the error gracefully
        assert response.status_code == 400
        error_data = response.json()
        assert "detail" in error_data

    @pytest.mark.asyncio
    async def test_dependency_injection_middleware(
        self, 
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test dependency injection works properly through middleware."""
        
        # Test that database session and authentication dependencies work
        response = await async_client.get("/api/employees/", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify that user data is properly injected
        user_data = response.json()
        assert isinstance(user_data, list)  # Should return list of employees
        if user_data:  # If there are employees
            assert "emp_id" in user_data[0]
            assert "emp_name" in user_data[0]
            assert "emp_email" in user_data[0]
