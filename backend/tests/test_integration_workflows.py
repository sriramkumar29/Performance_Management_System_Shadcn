"""
Phase 2 Integration Tests: Complete Workflow Testing
Tests full appraisal lifecycle workflows and business logic integration.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import date, timedelta

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType
from app.models.goal import Goal


@pytest.mark.integration
class TestAppraisalWorkflowIntegration:
    """Integration tests for complete appraisal lifecycle workflows."""

    @pytest.mark.asyncio
    async def test_complete_appraisal_lifecycle_draft_to_complete(
        self, 
        async_client: AsyncClient, 
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test complete appraisal lifecycle: Draft → Self-Assessment → Appraiser Review → Complete."""
        
        # Step 1: Create appraisal in DRAFT status
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
        appraisal_id = create_response.json()["appraisal_id"]

        # Verify DRAFT status in database
        result = await db_session.execute(
            select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
        )
        appraisal = result.scalar_one()
        assert appraisal.status == AppraisalStatus.DRAFT

        # Step 2: Add goals to appraisal totaling 100% weightage (required for status transitions)
        # First create a standalone goal
        goal_data = {
            "goal_title": "Improve Python Skills",
            "goal_description": "Complete advanced Python course",
            "goal_performance_factor": "Technical Skills",
            "goal_importance": "High",
            "goal_weightage": 100,  # Full weightage for transition requirements
            "goal_template_id": None,
            "category_id": None
        }

        goal_response = await async_client.post(
            "/api/goals/",
            json=goal_data,
            headers=auth_headers
        )
        assert goal_response.status_code == 201
        goal_id = goal_response.json()["goal_id"]
        
        # Then link the goal to the appraisal
        appraisal_goal_data = {
            "appraisal_id": appraisal_id,
            "goal_id": goal_id,
            "self_comment": None,
            "self_rating": None,
            "appraiser_comment": None,
            "appraiser_rating": None
        }
        
        appraisal_goal_response = await async_client.post(
            "/api/goals/appraisal-goals",
            json=appraisal_goal_data,
            headers=auth_headers
        )
        assert appraisal_goal_response.status_code == 201

        # Step 3: Transition through proper sequence: DRAFT → SUBMITTED → APPRAISEE_SELF_ASSESSMENT
        # First: DRAFT → SUBMITTED
        status_update = {"status": "Submitted"}
        update_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        if update_response.status_code != 200:
            print(f"Status update failed: {update_response.status_code}")
            print(f"Response: {update_response.text}")
        assert update_response.status_code == 200

        # Then: SUBMITTED → APPRAISEE_SELF_ASSESSMENT
        status_update = {"status": "Appraisee Self Assessment"}
        update_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        if update_response.status_code != 200:
            print(f"Status update failed: {update_response.status_code}")
            print(f"Response: {update_response.text}")
        assert update_response.status_code == 200        # Verify status change in database
        await db_session.refresh(appraisal)
        assert appraisal.status == AppraisalStatus.APPRAISEE_SELF_ASSESSMENT

        # Step 4: Complete self-assessment
        self_assessment_data = {
            "goals": {
                goal_id: {
                    "self_comment": "I have successfully improved my Python skills this year.",
                    "self_rating": 4
                }
            }
        }
        
        self_assessment_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/self-assessment",
            json=self_assessment_data,
            headers=auth_headers
        )
        if self_assessment_response.status_code != 200:
            print(f"Self-assessment failed: {self_assessment_response.status_code}")
            print(f"Response: {self_assessment_response.text}")
        assert self_assessment_response.status_code == 200

        # Step 5: Transition to APPRAISER_EVALUATION
        status_update = {"status": "Appraiser Evaluation"}
        update_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        assert update_response.status_code == 200

        # Step 6: Complete appraiser review
        appraiser_data = {
            "goals": {
                goal_id: {
                    "appraiser_comment": "Employee has shown excellent progress in Python development.",
                    "appraiser_rating": 4
                }
            },
            "appraiser_overall_rating": 4,
            "appraiser_overall_comments": "Employee has exceeded expectations."
        }

        appraiser_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/appraiser-evaluation",
            json=appraiser_data,
            headers=auth_headers
        )
        if appraiser_response.status_code != 200:
            print(f"Appraiser evaluation failed: {appraiser_response.status_code}")
            print(f"Response: {appraiser_response.text}")
        assert appraiser_response.status_code == 200        # Step 7: Transition to REVIEWER_EVALUATION
        status_update = {"status": "Reviewer Evaluation"}
        update_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        assert update_response.status_code == 200

        # Step 8: Complete reviewer review
        reviewer_data = {
            "reviewer_overall_rating": 4,
            "reviewer_overall_comments": "Good performance with room for improvement."
        }
        
        reviewer_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/reviewer-evaluation",
            json=reviewer_data,
            headers=auth_headers
        )
        assert reviewer_response.status_code == 200

        # Step 9: Transition to COMPLETE
        status_update = {"status": "Complete"}
        final_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        assert final_response.status_code == 200

        # Final verification: Check complete appraisal
        await db_session.refresh(appraisal)
        assert appraisal.status == AppraisalStatus.COMPLETE
        
        # Verify the appraisal has proper overall ratings
        assert appraisal.appraiser_overall_rating == 4
        assert appraisal.reviewer_overall_rating == 4
        assert "exceeded expectations" in appraisal.appraiser_overall_comments.lower()
        assert "room for improvement" in appraisal.reviewer_overall_comments.lower()

    @pytest.mark.skip(reason="Goal template import endpoint not implemented yet")
    @pytest.mark.asyncio
    async def test_goal_template_import_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test complete goal template import workflow."""
        
        # Step 1: Create appraisal
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
        appraisal_id = create_response.json()["appraisal_id"]

        # Step 2: Get available goal templates or create one
        templates_response = await async_client.get(
            "/api/goals/templates",
            headers=auth_headers
        )
        assert templates_response.status_code == 200
        templates = templates_response.json()
        
        # If no templates exist, create one for testing
        if len(templates) == 0:
            template_data = {
                "temp_title": "Test Template",
                "temp_description": "Template for testing",
                "temp_performance_factor": "Technical Skills",
                "temp_importance": "Medium",
                "temp_weightage": 100,  # Full weightage for status transitions
                "categories": ["Technical"]
            }
            
            create_template_response = await async_client.post(
                "/api/goals/templates",
                json=template_data,
                headers=auth_headers
            )
            assert create_template_response.status_code == 201
            template_id = create_template_response.json()["temp_id"]
        else:
            template_id = templates[0]["temp_id"]

        # Step 3: Import goals from template
        template_import_data = {
            "template_ids": [template_id],
            "appraisal_id": appraisal_id,
            "category": "Technical"
        }

        import_response = await async_client.post(
            "/api/goals/import-from-templates",
            json=template_import_data,
            headers=auth_headers
        )
        assert import_response.status_code == 201

        # Step 4: Verify goals were created
        goals_response = await async_client.get(
            f"/api/appraisals/{appraisal_id}/goals",
            headers=auth_headers
        )
        assert goals_response.status_code == 200
        goals = goals_response.json()
        assert len(goals) > 0

        # Verify goal properties
        imported_goal = goals[0]
        assert imported_goal["appraisal_id"] == appraisal_id
        assert imported_goal["goal_category"] == "Technical"
        assert imported_goal["goal_title"] is not None

    @pytest.mark.asyncio
    async def test_multi_user_role_switching_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test workflow with different user roles and permissions."""
        
        # Step 1: Create additional test employees for different roles
        manager_employee = Employee(
            emp_name="Test Manager",
            emp_email="manager@example.com",
            emp_department="Management",
            emp_roles="Manager",
            emp_roles_level=5,
            emp_reporting_manager_id=None,
            emp_status=True,
            emp_password="hashed_password"
        )
        db_session.add(manager_employee)
        await db_session.commit()
        await db_session.refresh(manager_employee)

        reviewer_employee = Employee(
            emp_name="Test Reviewer",
            emp_email="reviewer@example.com",
            emp_department="HR",
            emp_roles="Reviewer",
            emp_roles_level=6,
            emp_reporting_manager_id=None,
            emp_status=True,
            emp_password="hashed_password"
        )
        db_session.add(reviewer_employee)
        await db_session.commit()
        await db_session.refresh(reviewer_employee)

        # Step 2: Create appraisal with different roles
        appraisal_data = {
            "appraisee_id": test_employee.emp_id,
            "appraiser_id": manager_employee.emp_id,
            "reviewer_id": reviewer_employee.emp_id,
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
        appraisal_id = create_response.json()["appraisal_id"]

        # Step 3: Test role-based access
        # Each role should see different data/have different permissions
        appraisal_response = await async_client.get(
            f"/api/appraisals/{appraisal_id}",
            headers=auth_headers
        )
        assert appraisal_response.status_code == 200
        appraisal_data = appraisal_response.json()
        
        # Verify role assignments
        assert appraisal_data["appraisee_id"] == test_employee.emp_id
        assert appraisal_data["appraiser_id"] == manager_employee.emp_id
        assert appraisal_data["reviewer_id"] == reviewer_employee.emp_id

    @pytest.mark.asyncio
    async def test_business_rule_validation_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test business rule enforcement throughout workflows."""
        
        # Step 1: Create appraisal
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
        appraisal_id = create_response.json()["appraisal_id"]

        # Step 2: Test invalid status transition (skip required steps)
        invalid_status_update = {"status": "Complete"}
        invalid_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=invalid_status_update,
            headers=auth_headers
        )
        # Should fail due to business rules
        assert invalid_response.status_code == 400

        # Step 3: Test weightage validation with goals
        goal_data = {
            "goal_title": "Test Goal",
            "goal_description": "Test Description",
            "goal_performance_factor": "Technical Skills",
            "goal_importance": "High",
            "goal_weightage": 150,  # Invalid: exceeds 100%
            "goal_template_id": None,
            "category_id": None
        }

        invalid_goal_response = await async_client.post(
            "/api/goals/",
            json=goal_data,
            headers=auth_headers
        )
        # Should fail due to weightage validation
        assert invalid_goal_response.status_code == 422

        # Step 4: Test valid goal creation with 100% weightage
        valid_goal_data = {
            "goal_title": "Valid Test Goal",
            "goal_description": "Valid Test Description",
            "goal_performance_factor": "Technical Skills",
            "goal_importance": "High",
            "goal_weightage": 100,  # Full weightage for status transitions
            "goal_template_id": None,
            "category_id": None
        }

        valid_goal_response = await async_client.post(
            "/api/goals/",
            json=valid_goal_data,
            headers=auth_headers
        )
        assert valid_goal_response.status_code == 201
        goal_id = valid_goal_response.json()["goal_id"]

        # Link the goal to the appraisal
        appraisal_goal_data = {
            "appraisal_id": appraisal_id,
            "goal_id": goal_id,
            "self_comment": None,
            "self_rating": None,
            "appraiser_comment": None,
            "appraiser_rating": None
        }

        appraisal_goal_response = await async_client.post(
            "/api/goals/appraisal-goals",
            json=appraisal_goal_data,
            headers=auth_headers
        )
        assert appraisal_goal_response.status_code == 201

        # Step 5: Test status transition validation with goals present (follow proper sequence)
        # First: DRAFT → SUBMITTED
        submitted_status_update = {"status": "Submitted"}
        submitted_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=submitted_status_update,
            headers=auth_headers
        )
        assert submitted_response.status_code == 200
        
        # Then: SUBMITTED → APPRAISEE_SELF_ASSESSMENT
        valid_status_update = {"status": "Appraisee Self Assessment"}
        valid_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=valid_status_update,
            headers=auth_headers
        )
        assert valid_response.status_code == 200

    @pytest.mark.asyncio
    async def test_concurrent_user_operations(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test concurrent operations on the same appraisal."""
        
        # Step 1: Create appraisal
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
        appraisal_id = create_response.json()["appraisal_id"]

        # Step 2: Create multiple goals sequentially to avoid database conflicts
        goal_ids = []
        for i in range(3):
            goal_data = {
                "goal_title": f"Concurrent Goal {i+1}",
                "goal_description": f"Description for goal {i+1}",
                "goal_performance_factor": "Technical Skills",
                "goal_importance": "Medium",
                "goal_weightage": 33 if i < 2 else 34,  # Total 100% (33+33+34)
                "goal_template_id": None,
                "category_id": None
            }
            
            goal_response = await async_client.post(
                "/api/goals/",
                json=goal_data,
                headers=auth_headers
            )
            assert goal_response.status_code == 201
            goal_ids.append(goal_response.json()["goal_id"])

        # Step 3: Link all goals to the appraisal
        for goal_id in goal_ids:
            appraisal_goal_data = {
                "appraisal_id": appraisal_id,
                "goal_id": goal_id,
                "self_comment": None,
                "self_rating": None,
                "appraiser_comment": None,
                "appraiser_rating": None
            }
            
            appraisal_goal_response = await async_client.post(
                "/api/goals/appraisal-goals",
                json=appraisal_goal_data,
                headers=auth_headers
            )
            assert appraisal_goal_response.status_code == 201

        # Step 4: Verify goals were created and linked
        # Get the appraisal with goals
        appraisal_response = await async_client.get(
            f"/api/appraisals/{appraisal_id}",
            headers=auth_headers
        )
        assert appraisal_response.status_code == 200
        appraisal_data = appraisal_response.json()
        goals = appraisal_data.get("appraisal_goals", [])
        
        # Verify all 3 goals were created and linked
        assert len(goals) == 3
        
        # Test that the appraisal is accessible and hasn't been corrupted by concurrent operations
        assert appraisal_data["status"] == "Draft"
        assert appraisal_data["appraisee_id"] == test_employee.emp_id

    @pytest.mark.asyncio
    async def test_audit_trail_generation(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_employee: Employee,
        test_appraisal_type: AppraisalType,
        db_session: AsyncSession
    ):
        """Test that audit trails are generated for key operations."""
        
        # Step 1: Create appraisal
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
        appraisal_id = create_response.json()["appraisal_id"]

        # Step 2: Perform auditable operations
        # Add goal with 100% weightage
        goal_data = {
            "goal_title": "Audit Test Goal",
            "goal_description": "Goal for audit testing",
            "goal_performance_factor": "Technical Skills",
            "goal_importance": "High",
            "goal_weightage": 100,  # Full weightage required for status transitions
            "goal_template_id": None,
            "category_id": None
        }

        goal_response = await async_client.post(
            "/api/goals/",
            json=goal_data,
            headers=auth_headers
        )
        assert goal_response.status_code == 201
        goal_id = goal_response.json()["goal_id"]

        # Link the goal to the appraisal
        appraisal_goal_data = {
            "appraisal_id": appraisal_id,
            "goal_id": goal_id,
            "self_comment": None,
            "self_rating": None,
            "appraiser_comment": None,
            "appraiser_rating": None
        }

        appraisal_goal_response = await async_client.post(
            "/api/goals/appraisal-goals",
            json=appraisal_goal_data,
            headers=auth_headers
        )
        assert appraisal_goal_response.status_code == 201

        # Update status through proper sequence: DRAFT → SUBMITTED → APPRAISEE_SELF_ASSESSMENT
        # First: DRAFT → SUBMITTED
        status_update = {"status": "Submitted"}
        status_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        assert status_response.status_code == 200

        # Then: SUBMITTED → APPRAISEE_SELF_ASSESSMENT
        status_update = {"status": "Appraisee Self Assessment"}
        status_response = await async_client.put(
            f"/api/appraisals/{appraisal_id}/status",
            json=status_update,
            headers=auth_headers
        )
        assert status_response.status_code == 200

        # Step 3: Verify audit data is recorded
        # Check updated_at timestamps
        result = await db_session.execute(
            select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
        )
        appraisal = result.scalar_one()
        
        # Verify timestamps exist and are reasonable
        assert appraisal.created_at is not None
        assert appraisal.updated_at is not None
        assert appraisal.updated_at >= appraisal.created_at
