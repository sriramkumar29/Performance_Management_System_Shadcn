"""
Appraisal service for the Performance Management System.

This module provides business logic for appraisal-related operations
with proper validation and status transition management.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.goal import AppraisalGoal
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import Goal, AppraisalGoal
from app.schemas.appraisal import AppraisalCreate, AppraisalUpdate
from app.services.base_service import BaseService
from app.repositories.appraisal_repository import AppraisalRepository
from app.exceptions import (
    EntityNotFoundError,
    ValidationError,
    BadRequestError,
    StatusTransitionError,
    WeightageValidationError
)
from app.constants import ENTITY_APPRAISAL_TYPE, ENTITY_APPRAISAL_RANGE
from app.constants import (
    APPRAISAL_TYPE_NOT_FOUND,
    APPRAISAL_RANGE_NOT_FOUND,
    APPRAISAL_RANGE_MISMATCH,
    CANNOT_SUBMIT_WITHOUT_GOALS,
    ROLE_APPRAISEE,
    ROLE_APPRAISER,
    ROLE_REVIEWER
)


class AppraisalService(BaseService):
    """Service class for appraisal operations."""
    
    def __init__(self):
        super().__init__(Appraisal)
        self.repository = AppraisalRepository()
        self.category_repository = CategoryRepository()
        self._valid_transitions = {
            AppraisalStatus.DRAFT: [AppraisalStatus.SUBMITTED],
            AppraisalStatus.SUBMITTED: [AppraisalStatus.APPRAISEE_SELF_ASSESSMENT],
            AppraisalStatus.APPRAISEE_SELF_ASSESSMENT: [AppraisalStatus.APPRAISER_EVALUATION],
            AppraisalStatus.APPRAISER_EVALUATION: [AppraisalStatus.REVIEWER_EVALUATION],
            AppraisalStatus.REVIEWER_EVALUATION: [AppraisalStatus.COMPLETE],
            AppraisalStatus.COMPLETE: []  # No transitions from complete
        }
    
    @property
    def entity_name(self) -> str:
        return "Appraisal"
    
    @property
    def id_field(self) -> str:
        return "appraisal_id"
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Appraisal:
        """Get appraisal by ID or raise 404 error."""
        appraisal = await self.repository.get_by_id(db, entity_id, load_relationships)
        if not appraisal:
            raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
        return appraisal
    
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: Appraisal,
        obj_in: AppraisalUpdate
    ) -> Appraisal:
        """Update an appraisal with the provided data."""
        # Convert Pydantic model to dict, excluding unset values
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Apply business logic hooks
        update_data = await self.before_update(db, db_obj, update_data)
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        # Flush changes
        await db.flush()
        await db.refresh(db_obj)
        
        # Apply after-update hook
        db_obj = await self.after_update(db, db_obj, db_obj, update_data)
        
        return db_obj
    
    async def create_appraisal(
        self,
        db: AsyncSession,
        *,
        appraisal_data: AppraisalCreate
    ) -> Appraisal:
        """Create a new appraisal with comprehensive validation."""
        # Validate all employees exist
        await self._validate_employees(db, appraisal_data)
        
        # Validate appraisal type and range
        await self._validate_appraisal_type_and_range(db, appraisal_data)
        
        # Validate goals exist and belong to appraisee
        await self._validate_and_get_goals(db, appraisal_data)
        
        # Create appraisal
        obj_data = appraisal_data.model_dump()
        goal_ids = obj_data.pop("goal_ids", [])
        
        db_appraisal = Appraisal(**obj_data)
        db_appraisal = await self.repository.create(db, db_appraisal)
        
        # Add goals to appraisal
        if goal_ids:
            await self._add_goals_to_appraisal(db, db_appraisal, goal_ids)
        
        await db.refresh(db_appraisal)
        return db_appraisal
    
    async def update_appraisal_status(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        new_status: AppraisalStatus
    ) -> Appraisal:
        """Update appraisal status with validation."""
        
        # Get appraisal by ID with relationships
        db_appraisal = await self.get_by_id_or_404(
            db, 
            appraisal_id,
            load_relationships=["appraisal_type"]
        )
        
        # Validate status transition
        current_status = db_appraisal.status
        
        # Allow idempotent updates (same status can be set again)
        if current_status == new_status:
            # No change needed, return current appraisal
            return db_appraisal
        
        # Check if transition is valid
        if new_status not in self._valid_transitions.get(current_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {current_status} to {new_status}"
            )
        
        # Special validation for SUBMITTED status
        if new_status == AppraisalStatus.SUBMITTED:
            await self._validate_submission_requirements_direct(db, appraisal_id)
        
        # Update status using repository
        await self.repository.update_appraisal_status(db, db_appraisal, new_status)
        await db.commit()
        await db.refresh(db_appraisal)
        
        return db_appraisal
    
    async def get_appraisals_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AppraisalStatus] = None,
        appraisee_id: Optional[int] = None,
        appraiser_id: Optional[int] = None,
        reviewer_id: Optional[int] = None,
        appraisal_type_id: Optional[int] = None
    ) -> List[Appraisal]:
        """Get appraisals with filtering."""
        filters = []
        
        if status:
            filters.append(Appraisal.status == status)
        
        if appraisee_id:
            filters.append(Appraisal.appraisee_id == appraisee_id)
        
        if appraiser_id:
            filters.append(Appraisal.appraiser_id == appraiser_id)
        
        if reviewer_id:
            filters.append(Appraisal.reviewer_id == reviewer_id)
        
        if appraisal_type_id:
            filters.append(Appraisal.appraisal_type_id == appraisal_type_id)
        
        return await self.repository.get_with_filters(
            db, skip=skip, limit=limit, filters=filters
        )
    
    async def add_goals_to_appraisal(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        goal_ids: List[int]
    ) -> Appraisal:
        """Add goals to an existing appraisal."""
        db_appraisal = await self.get_by_id_or_404(
            db, 
            appraisal_id,
            load_relationships=["appraisal_goals"]
        )
        
        # Validate goals exist and belong to appraisee
        await self._validate_goal_ids(db, goal_ids)
        
        # Add goals to appraisal
        await self._add_goals_to_appraisal(db, db_appraisal, goal_ids)
        
        await db.refresh(db_appraisal)
        return db_appraisal
    
    async def update_self_assessment(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        goals_data: Dict[int, Dict[str, Any]]
    ) -> Appraisal:
        """Update self assessment for appraisal goals."""
        db_appraisal = await self.get_by_id_or_404(
            db, 
            appraisal_id,
            load_relationships=["appraisal_goals"]
        )
        
        # Validate appraisal is in correct status
        if db_appraisal.status != AppraisalStatus.APPRAISEE_SELF_ASSESSMENT:
            raise ValidationError("Appraisal must be in 'Appraisee Self Assessment' status")
        
        # Update goal assessments
        for goal_id, goal_data in goals_data.items():
            appraisal_goal = await self.repository.find_appraisal_goal(db, db_appraisal.appraisal_id, goal_id)
            
            if not appraisal_goal:
                raise EntityNotFoundError("Goal", goal_id)
            
            self_comment = goal_data.get("self_comment")
            self_rating = goal_data.get("self_rating")
            
            if self_rating is not None and not 1 <= self_rating <= 5:
                raise ValidationError("Rating must be between 1 and 5")
            
            await self.repository.update_appraisal_goal_self_assessment(
                db, appraisal_goal, self_comment, self_rating
            )
        
        await db.flush()
        
        # Reload with all necessary relationships for the response
        return await self.get_appraisal_with_goals(db, appraisal_id)
    
    async def update_appraiser_evaluation(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        goals_data: Dict[int, Dict[str, Any]],
        appraiser_overall_comments: Optional[str] = None,
        appraiser_overall_rating: Optional[int] = None
    ) -> Appraisal:
        """Update appraiser evaluation for appraisal goals and overall assessment."""
        db_appraisal = await self.get_by_id_or_404(
            db, 
            appraisal_id,
            load_relationships=["appraisal_goals"]
        )
        
        # Validate appraisal is in correct status
        if db_appraisal.status != AppraisalStatus.APPRAISER_EVALUATION:
            raise ValidationError("Appraisal must be in 'Appraiser Evaluation' status")
        
        # Update goal evaluations
        for goal_id, goal_data in goals_data.items():
            appraisal_goal = await self.repository.find_appraisal_goal(db, db_appraisal.appraisal_id, goal_id)
            
            if not appraisal_goal:
                raise EntityNotFoundError("Goal", goal_id)
            
            appraiser_comment = goal_data.get("appraiser_comment")
            appraiser_rating = goal_data.get("appraiser_rating")
            
            if appraiser_rating is not None and not 1 <= appraiser_rating <= 5:
                raise ValidationError("Rating must be between 1 and 5")
            
            await self.repository.update_appraisal_goal_appraiser_evaluation(
                db, appraisal_goal, appraiser_comment, appraiser_rating
            )
        
        # Update overall appraiser evaluation
        if appraiser_overall_rating is not None and not 1 <= appraiser_overall_rating <= 5:
            raise ValidationError("Overall rating must be between 1 and 5")
        
        await self.repository.update_overall_appraiser_evaluation(
            db, db_appraisal, appraiser_overall_comments, appraiser_overall_rating
        )
        
        await db.flush()
        
        # Reload with all necessary relationships for the response
        return await self.get_appraisal_with_goals(db, appraisal_id)
    
    async def update_reviewer_evaluation(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        reviewer_overall_comments: Optional[str] = None,
        reviewer_overall_rating: Optional[int] = None
    ) -> Appraisal:
        """Update reviewer evaluation for overall assessment."""
        db_appraisal = await self.get_by_id_or_404(
            db, 
            appraisal_id,
            load_relationships=["appraisal_goals"]
        )
        
        # Validate appraisal is in correct status
        if db_appraisal.status != AppraisalStatus.REVIEWER_EVALUATION:
            raise ValidationError("Appraisal must be in 'Reviewer Evaluation' status")
        
        # Update overall reviewer evaluation
        if reviewer_overall_rating is not None and not 1 <= reviewer_overall_rating <= 5:
            raise ValidationError("Overall rating must be between 1 and 5")
        
        await self.repository.update_overall_reviewer_evaluation(
            db, db_appraisal, reviewer_overall_comments, reviewer_overall_rating
        )
        
        await db.flush()
        
        # Reload with all necessary relationships for the response
        return await self.get_appraisal_with_goals(db, appraisal_id)
    
    async def _validate_employees(
        self,
        db: AsyncSession,
        appraisal_data: AppraisalCreate
    ) -> None:
        """Validate that all employees exist."""
        employees_to_check = [
            (appraisal_data.appraisee_id, ROLE_APPRAISEE),
            (appraisal_data.appraiser_id, ROLE_APPRAISER),
            (appraisal_data.reviewer_id, ROLE_REVIEWER)
        ]
        
        for emp_id, role in employees_to_check:
            employee = await self.repository.get_employee_by_id(db, emp_id)
            
            if not employee:
                raise EntityNotFoundError(role, emp_id)
            
            if not employee.emp_status:
                raise ValidationError(f"{role} must be an active employee")
    
    async def _validate_appraisal_type_and_range(
        self,
        db: AsyncSession,
        appraisal_data: AppraisalCreate
    ) -> None:
        """Validate appraisal type and range."""
        # Check appraisal type exists
        appraisal_type = await self.repository.get_appraisal_type_by_id(db, appraisal_data.appraisal_type_id)
        
        if not appraisal_type:
            raise EntityNotFoundError(ENTITY_APPRAISAL_TYPE, appraisal_data.appraisal_type_id)
        
        # Check appraisal range if provided
        if appraisal_data.appraisal_type_range_id:
            appraisal_range = await self.repository.get_appraisal_range_by_id(db, appraisal_data.appraisal_type_range_id)
            
            if not appraisal_range:
                raise EntityNotFoundError(ENTITY_APPRAISAL_RANGE, appraisal_data.appraisal_type_range_id)
            
            # Check if range belongs to the type
            if appraisal_range.appraisal_type_id != appraisal_data.appraisal_type_id:
                raise ValidationError(APPRAISAL_RANGE_MISMATCH)
    
    async def _validate_and_get_goals(
        self,
        db: AsyncSession,
        appraisal_data: AppraisalCreate
    ) -> List[Goal]:
        """Validate goals and check weightage requirements."""
        if not appraisal_data.goal_ids:
            return []
        
        goals = await self._validate_goal_ids(db, appraisal_data.goal_ids)
        
        # Check weightage for non-draft status
        if appraisal_data.status != AppraisalStatus.DRAFT:
            total_weightage = sum(goal.goal_weightage for goal in goals)
            if total_weightage != 100:
                raise WeightageValidationError(total_weightage)
        
        return goals
    
    async def _validate_goal_ids(
        self,
        db: AsyncSession,
        goal_ids: List[int]
    ) -> List[Goal]:
        """Validate that all goal IDs exist and return the goals."""
        goals = await self.repository.get_goals_by_ids(db, goal_ids)
        
        # Check if we got all the goals we requested
        found_goal_ids = {goal.goal_id for goal in goals}
        missing_goal_ids = set(goal_ids) - found_goal_ids
        
        if missing_goal_ids:
            raise EntityNotFoundError("Goal", list(missing_goal_ids)[0])
        
        return goals
    
    async def _add_goals_to_appraisal(
        self,
        db: AsyncSession,
        appraisal: Appraisal,
        goal_ids: List[int]
    ) -> None:
        """Add goals to appraisal as AppraisalGoal records."""
        for goal_id in goal_ids:
            await self.repository.add_goal_to_appraisal(db, appraisal.appraisal_id, goal_id)
    
    async def _validate_submission_requirements(
        self,
        db: AsyncSession,
        appraisal: Appraisal
    ) -> None:
        """Validate requirements for submitting an appraisal."""
        if not appraisal.appraisal_goals:
            raise ValidationError(CANNOT_SUBMIT_WITHOUT_GOALS)
        
        # Check total weightage
        total_weightage = sum(
            ag.goal.goal_weightage for ag in appraisal.appraisal_goals
        )
        
        if total_weightage != 100:
            raise WeightageValidationError(total_weightage)
    
    async def _validate_submission_requirements_direct(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> None:
        """Validate requirements for submitting an appraisal using direct queries."""
        
        # Get weightage and count from repository
        total_weightage, goal_count = await self.repository.get_weightage_and_count(db, appraisal_id)

        if goal_count == 0 or total_weightage != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit appraisal: must have goals totalling 100% weightage"
            )
    
    async def get_appraisal_with_goals(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> Appraisal:
        """Get an appraisal with all its goals and nested relationships loaded."""
        appraisal = await self.repository.get_with_goals_and_relationships(db, appraisal_id)
        
        if not appraisal:
            raise EntityNotFoundError(self.entity_name, appraisal_id)
        
        return appraisal

    async def add_single_goal_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> None:
        """Get an existing AppraisalGoal by appraisal_id and goal_id."""
        existing_appraisal_goal = await self.repository.get_existing_appraisal_goal(db, appraisal_id, goal_id)

        if not existing_appraisal_goal:
            existing_appraisal_goal = AppraisalGoal(appraisal_id=appraisal_id, goal_id=goal_id)
            await self.repository.add_appraisal_goal(db, existing_appraisal_goal)


    async def update_appraisal_goal(self, db: AsyncSession, appraisal_id: int) -> AppraisalGoal:
        """Update an existing AppraisalGoal."""
        db_appraisal = await self.repository.update_appraisal_goal(db, appraisal_id)

        if not db_appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)

        return db_appraisal


    async def remove_goal_from_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> None:
        existing_appraisal_goal = await self.repository.get_appraisal_goal_by_id(db, appraisal_id, goal_id)

        if not existing_appraisal_goal:
            raise EntityNotFoundError("Appraisal Goal", f"appraisal_id={appraisal_id}, goal_id={goal_id}")
        
        await self.repository.remove_appraisal_goal(db, existing_appraisal_goal)

    async def get_appraisal(self, appraisal_id: int) -> Appraisal:
        """Get an appraisal by ID."""
        db_appraisal = await self.repository.get_appraisal_by_id(appraisal_id)

        if not db_appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        # Check if appraisal is in Draft status (only allow adding goals in Draft)
        if db_appraisal.status != AppraisalStatus.DRAFT:
            raise ValidationError(f"Cannot add goals when appraisal is in {db_appraisal.status} status. Goals can only be added in Draft status.")

        return db_appraisal

    async def get_goals_by_id(self, db: AsyncSession, goal_id: int) -> Goal:
        db_goal = await self.repository.get_goal_by_id(db, goal_id)

        if not db_goal:
            raise EntityNotFoundError("Goal", goal_id)

        return db_goal

    async def check_goal_not_already_in_appraisal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> None:
        existing_link_any = await self.repository.get_appraisal_goal(db, goal_id)

        if existing_link_any and existing_link_any.appraisal_id == appraisal_id:
            raise EntityNotFoundError("Appraisal Goal", f"goal_id={goal_id} is already linked with different appraisal")

    async def check_goal_in_appraisal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> None:
        existing_link_any = await self.repository.get_appraisal_goal_by_id(db, appraisal_id, goal_id)

        if existing_link_any:
            raise EntityNotFoundError("Appraisal Goal", f"goal_id={goal_id} is already added to this appraisal")
        

    async def check_total_weightage(self, db: AsyncSession, appraisal_id: int, db_goal: Goal) -> None:
        total_weightage = await self.repository.calculate_total_weightage(db, appraisal_id)
        new_total_weightage = total_weightage + db_goal.goal_weightage
        
        if new_total_weightage > 100:
            raise WeightageValidationError(new_total_weightage)

    async def add_goal_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> None:
        """Add a goal to an appraisal after performing necessary checks."""
        appraisal_goal = AppraisalGoal(
            appraisal_id=appraisal_id,
            goal_id=goal_id
        )
        await self.add_appraisal_goal(db, appraisal_goal)


    async def load_appraisal(self, db: AsyncSession, db_appraisal: Appraisal) -> Appraisal:
        return await self.repository.load_appraisal(db, db_appraisal)

    async def if_no_link_exists_delete_appraisal(self, db: AsyncSession, goal_id: int) -> None:
        remaining_link = await self.repository.get_appraisal_goal(db, goal_id)

        if not remaining_link:
            goal = await self.repository.get_goal_by_id(db, goal_id)

        if goal:
            await self.repository.delete_goal(db, goal)

    async def check_if_appraisal_exist(self, appraisal_id: int) -> Appraisal:
        """Get an appraisal by ID."""
        db_appraisal = await self.repository.get_appraisal_by_id(appraisal_id)

        if not db_appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)

    async def calculate_current_total_weightage(self, db: AsyncSession, appraisal_id: int):
        return await self.repository.calculate_total_weightage(db, appraisal_id)

    async def get_individual_goal_weightages(self, db: AsyncSession, appraisal_id: int):
        return await self.repository.get_individual_goal_weightages(db, appraisal_id)
        
    async def get_categories(self, db: AsyncSession):
        return await self.category_repository.get_categories(db)