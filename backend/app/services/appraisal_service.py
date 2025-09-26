"""
Appraisal service for the Performance Management System.

This module provides business logic for appraisal-related operations
with proper validation and status transition management.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.employee import Employee
from app.models.goal import Goal, AppraisalGoal
from app.models.appraisal_type import AppraisalType, AppraisalRange
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
from app.constants import (
    APPRAISAL_TYPE_NOT_FOUND,
    APPRAISAL_RANGE_NOT_FOUND,
    APPRAISAL_RANGE_MISMATCH,
    CANNOT_SUBMIT_WITHOUT_GOALS,
    ROLE_APPRAISEE,
    ROLE_APPRAISER,
    ROLE_REVIEWER
)


class AppraisalService(BaseService[Appraisal, AppraisalCreate, AppraisalUpdate]):
    """Service class for appraisal operations."""
    
    def __init__(self):
        super().__init__(Appraisal)
        self.repository = AppraisalRepository()
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
        db.add(db_appraisal)
        await db.flush()
        
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
        from sqlalchemy import select
        from app.models.goal import Goal, AppraisalGoal
        from fastapi import HTTPException, status
        
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
        
        # Update status
        db_appraisal.status = new_status
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
        
        # Use explicit query with selectinload to ensure appraisal_type is loaded
        from sqlalchemy.orm import selectinload
        from sqlalchemy import and_
        
        query = select(Appraisal).options(
            selectinload(Appraisal.appraisal_goals),
            selectinload(Appraisal.appraisal_type)
        )
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.order_by(Appraisal.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
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
            appraisal_goal = next(
                (ag for ag in db_appraisal.appraisal_goals if ag.goal_id == goal_id),
                None
            )
            
            if not appraisal_goal:
                raise EntityNotFoundError("Goal", goal_id)
            
            if "self_comment" in goal_data:
                appraisal_goal.self_comment = goal_data["self_comment"]
            
            if "self_rating" in goal_data:
                rating = goal_data["self_rating"]
                if rating is not None and not 1 <= rating <= 5:
                    raise ValidationError("Rating must be between 1 and 5")
                appraisal_goal.self_rating = rating
        
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
            appraisal_goal = next(
                (ag for ag in db_appraisal.appraisal_goals if ag.goal_id == goal_id),
                None
            )
            
            if not appraisal_goal:
                raise EntityNotFoundError("Goal", goal_id)
            
            if "appraiser_comment" in goal_data:
                appraisal_goal.appraiser_comment = goal_data["appraiser_comment"]
            
            if "appraiser_rating" in goal_data:
                rating = goal_data["appraiser_rating"]
                if rating is not None and not 1 <= rating <= 5:
                    raise ValidationError("Rating must be between 1 and 5")
                appraisal_goal.appraiser_rating = rating
        
        # Update overall appraiser evaluation
        if appraiser_overall_comments is not None:
            db_appraisal.appraiser_overall_comments = appraiser_overall_comments
        
        if appraiser_overall_rating is not None:
            if not 1 <= appraiser_overall_rating <= 5:
                raise ValidationError("Overall rating must be between 1 and 5")
            db_appraisal.appraiser_overall_rating = appraiser_overall_rating
        
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
        if reviewer_overall_comments is not None:
            db_appraisal.reviewer_overall_comments = reviewer_overall_comments
        
        if reviewer_overall_rating is not None:
            if not 1 <= reviewer_overall_rating <= 5:
                raise ValidationError("Overall rating must be between 1 and 5")
            db_appraisal.reviewer_overall_rating = reviewer_overall_rating
        
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
            result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
            employee = result.scalars().first()
            
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
        result = await db.execute(
            select(AppraisalType).where(AppraisalType.id == appraisal_data.appraisal_type_id)
        )
        appraisal_type = result.scalars().first()
        
        if not appraisal_type:
            raise EntityNotFoundError("Appraisal type", appraisal_data.appraisal_type_id)
        
        # Check appraisal range if provided
        if appraisal_data.appraisal_type_range_id:
            result = await db.execute(
                select(AppraisalRange).where(AppraisalRange.id == appraisal_data.appraisal_type_range_id)
            )
            appraisal_range = result.scalars().first()
            
            if not appraisal_range:
                raise EntityNotFoundError("Appraisal range", appraisal_data.appraisal_type_range_id)
            
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
        goals = []
        
        for goal_id in goal_ids:
            result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
            goal = result.scalars().first()
            
            if not goal:
                raise EntityNotFoundError("Goal", goal_id)
            
            goals.append(goal)
        
        return goals
    
    async def _add_goals_to_appraisal(
        self,
        db: AsyncSession,
        appraisal: Appraisal,
        goal_ids: List[int]
    ) -> None:
        """Add goals to appraisal as AppraisalGoal records."""
        for goal_id in goal_ids:
            # Check if goal is already added
            existing = await db.execute(
                select(AppraisalGoal).where(
                    and_(
                        AppraisalGoal.appraisal_id == appraisal.appraisal_id,
                        AppraisalGoal.goal_id == goal_id
                    )
                )
            )
            
            if not existing.scalars().first():
                appraisal_goal = AppraisalGoal(
                    appraisal_id=appraisal.appraisal_id,
                    goal_id=goal_id
                )
                db.add(appraisal_goal)
        
        await db.flush()
    
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
        from sqlalchemy import select, func
        from app.models.goal import Goal, AppraisalGoal
        from fastapi import HTTPException, status
        
        # Sum goal weightage for this appraisal
        total_res = await db.execute(
            select(func.coalesce(func.sum(Goal.goal_weightage), 0))
            .select_from(AppraisalGoal)
            .join(Goal, AppraisalGoal.goal_id == Goal.goal_id)
            .where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        total_weightage = total_res.scalar() or 0

        count_res = await db.execute(
            select(func.count(AppraisalGoal.id))
            .where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        goal_count = count_res.scalar() or 0

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
        query = (
            select(Appraisal)
            .where(Appraisal.appraisal_id == appraisal_id)
            .options(
                selectinload(Appraisal.appraisal_goals)
                .selectinload(AppraisalGoal.goal)
                .selectinload(Goal.category),
                selectinload(Appraisal.appraisal_type)
            )
        )
        
        result = await db.execute(query)
        appraisal = result.scalars().first()
        
        if not appraisal:
            raise EntityNotFoundError(self.entity_name, appraisal_id)
        
        return appraisal