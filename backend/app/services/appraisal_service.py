"""
Appraisal service for the Performance Management System.

This module provides business logic for appraisal-related operations
with proper validation and status transition management using Repository pattern.
"""

from typing import List, Optional, Dict, Any
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.employee import Employee
from app.schemas.appraisal import AppraisalCreate, AppraisalUpdate
from app.repositories.appraisal_repository import AppraisalRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.goal_repository import AppraisalGoalRepository
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


class AppraisalService:
    """Service class for appraisal operations using Repository pattern."""
    
    def __init__(self):
        self.repository = AppraisalRepository()
        self.employee_repository = EmployeeRepository()
        self.appraisal_goal_repository = AppraisalGoalRepository()
        
        self._valid_transitions = {
            AppraisalStatus.DRAFT: [AppraisalStatus.SUBMITTED],
            AppraisalStatus.SUBMITTED: [AppraisalStatus.APPRAISEE_SELF_ASSESSMENT],
            AppraisalStatus.APPRAISEE_SELF_ASSESSMENT: [AppraisalStatus.APPRAISER_EVALUATION],
            AppraisalStatus.APPRAISER_EVALUATION: [AppraisalStatus.REVIEWER_EVALUATION],
            AppraisalStatus.REVIEWER_EVALUATION: [AppraisalStatus.COMPLETE],
            AppraisalStatus.COMPLETE: []  # No transitions from complete
        }
    
    async def create_appraisal(
        self,
        db: AsyncSession,
        *,
        appraisal_data: AppraisalCreate
    ) -> Appraisal:
        """Create a new appraisal with validation."""
        # Validate participants exist and are active
        await self._validate_participants(
            db,
            appraisal_data.appraisee_id,
            appraisal_data.appraiser_id,
            appraisal_data.reviewer_id
        )
        
        # Check for overlapping appraisals
        if await self.repository.exists_for_employee_in_period(
            db,
            appraisal_data.appraisee_id,
            appraisal_data.start_date,
            appraisal_data.end_date
        ):
            raise ValidationError("Employee already has an appraisal in this period")
        
        # Validate date range
        if appraisal_data.start_date >= appraisal_data.end_date:
            raise ValidationError("Start date must be before end date")
        
        appraisal_dict = appraisal_data.dict()
        return await self.repository.create(db, appraisal_dict)
    
    async def update_appraisal(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        appraisal_data: AppraisalUpdate
    ) -> Appraisal:
        """Update an existing appraisal with validation."""
        db_appraisal = await self.repository.get_by_id(db, appraisal_id, load_relationships=True)
        if not db_appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        # Validate status transitions if status is being updated
        if appraisal_data.status and appraisal_data.status != db_appraisal.status:
            self._validate_status_transition(db_appraisal.status, appraisal_data.status)
        
        # Validate participants if being updated
        update_data = appraisal_data.dict(exclude_unset=True)
        if any(key in update_data for key in ['appraisee_id', 'appraiser_id', 'reviewer_id']):
            await self._validate_participants(
                db,
                update_data.get('appraisee_id', db_appraisal.appraisee_id),
                update_data.get('appraiser_id', db_appraisal.appraiser_id),
                update_data.get('reviewer_id', db_appraisal.reviewer_id)
            )
        
        # Check for period overlap if dates are being updated
        if 'start_date' in update_data or 'end_date' in update_data:
            new_start = update_data.get('start_date', db_appraisal.start_date)
            new_end = update_data.get('end_date', db_appraisal.end_date)
            appraisee_id = update_data.get('appraisee_id', db_appraisal.appraisee_id)
            
            if new_start >= new_end:
                raise ValidationError("Start date must be before end date")
            
            if await self.repository.exists_for_employee_in_period(
                db, appraisee_id, new_start, new_end, exclude_id=appraisal_id
            ):
                raise ValidationError("Employee already has an appraisal in this period")
        
        return await self.repository.update(db, db_appraisal, update_data)
    
    async def get_appraisal_by_id(
        self,
        db: AsyncSession,
        appraisal_id: int,
        load_relationships: bool = True
    ) -> Optional[Appraisal]:
        """Get appraisal by ID."""
        return await self.repository.get_by_id(
            db, appraisal_id, load_relationships=load_relationships
        )
    
    async def get_appraisals_by_employee(
        self,
        db: AsyncSession,
        employee_id: int,
        role: str = ROLE_APPRAISEE,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appraisal]:
        """Get appraisals by employee role."""
        if role == ROLE_APPRAISEE:
            return await self.repository.get_by_appraisee(
                db, employee_id, skip=skip, limit=limit, load_relationships=True
            )
        elif role == ROLE_APPRAISER:
            return await self.repository.get_by_appraiser(
                db, employee_id, skip=skip, limit=limit, load_relationships=True
            )
        elif role == ROLE_REVIEWER:
            return await self.repository.get_by_reviewer(
                db, employee_id, skip=skip, limit=limit, load_relationships=True
            )
        else:
            raise ValidationError(f"Invalid role: {role}")
    
    async def get_pending_appraisals(
        self,
        db: AsyncSession,
        employee_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appraisal]:
        """Get pending appraisals for an employee."""
        return await self.repository.get_pending_appraisals(
            db, employee_id, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_appraisals_by_status(
        self,
        db: AsyncSession,
        status: AppraisalStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appraisal]:
        """Get appraisals by status."""
        return await self.repository.get_by_status(
            db, status, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_appraisals_by_date_range(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appraisal]:
        """Get appraisals within date range."""
        return await self.repository.get_by_date_range(
            db, start_date, end_date, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_employee_appraisals_by_year(
        self,
        db: AsyncSession,
        employee_id: int,
        year: int
    ) -> List[Appraisal]:
        """Get all appraisals for an employee in a specific year."""
        return await self.repository.get_employee_appraisals_by_year(
            db, employee_id, year, load_relationships=True
        )
    
    async def get_overdue_appraisals(
        self,
        db: AsyncSession,
        current_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appraisal]:
        """Get overdue appraisals."""
        if current_date is None:
            current_date = date.today()
        
        return await self.repository.get_overdue_appraisals(
            db, current_date, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_appraisal_statistics(
        self,
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, int]:
        """Get appraisal statistics grouped by status."""
        return await self.repository.get_statistics_by_status(
            db, start_date=start_date, end_date=end_date
        )
    
    async def transition_status(
        self,
        db: AsyncSession,
        appraisal_id: int,
        new_status: AppraisalStatus,
        user_id: int
    ) -> Appraisal:
        """Transition appraisal to new status with validation."""
        appraisal = await self.repository.get_by_id(db, appraisal_id, load_relationships=True)
        if not appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        # Validate status transition
        self._validate_status_transition(appraisal.status, new_status)
        
        # Validate user has permission for this transition
        await self._validate_user_permission(db, appraisal, new_status, user_id)
        
        # Perform status-specific validations
        if new_status == AppraisalStatus.SUBMITTED:
            await self._validate_submission(db, appraisal)
        
        return await self.repository.update(
            db, appraisal, {"status": new_status}
        )
    
    async def submit_self_assessment(
        self,
        db: AsyncSession,
        appraisal_id: int,
        user_id: int
    ) -> Appraisal:
        """Submit self-assessment and transition to next status."""
        return await self.transition_status(
            db, appraisal_id, AppraisalStatus.APPRAISEE_SELF_ASSESSMENT, user_id
        )
    
    async def complete_appraiser_evaluation(
        self,
        db: AsyncSession,
        appraisal_id: int,
        user_id: int,
        overall_rating: Optional[int] = None,
        overall_comments: Optional[str] = None
    ) -> Appraisal:
        """Complete appraiser evaluation."""
        appraisal = await self.repository.get_by_id(db, appraisal_id)
        if not appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        update_data = {"status": AppraisalStatus.APPRAISER_EVALUATION}
        if overall_rating is not None:
            if not (1 <= overall_rating <= 5):
                raise ValidationError("Overall rating must be between 1 and 5")
            update_data["appraiser_overall_rating"] = overall_rating
        
        if overall_comments:
            update_data["appraiser_overall_comments"] = overall_comments
        
        return await self.repository.update(db, appraisal, update_data)
    
    async def complete_reviewer_evaluation(
        self,
        db: AsyncSession,
        appraisal_id: int,
        user_id: int,
        overall_rating: Optional[int] = None,
        overall_comments: Optional[str] = None
    ) -> Appraisal:
        """Complete reviewer evaluation."""
        appraisal = await self.repository.get_by_id(db, appraisal_id)
        if not appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        update_data = {"status": AppraisalStatus.COMPLETE}
        if overall_rating is not None:
            if not (1 <= overall_rating <= 5):
                raise ValidationError("Overall rating must be between 1 and 5")
            update_data["reviewer_overall_rating"] = overall_rating
        
        if overall_comments:
            update_data["reviewer_overall_comments"] = overall_comments
        
        return await self.repository.update(db, appraisal, update_data)
    
    async def delete_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> bool:
        """Delete appraisal if in valid state."""
        appraisal = await self.repository.get_by_id(db, appraisal_id)
        if not appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        # Only allow deletion of draft appraisals
        if appraisal.status != AppraisalStatus.DRAFT:
            raise ValidationError("Can only delete draft appraisals")
        
        return await self.repository.delete(db, appraisal_id)
    
    def _validate_status_transition(
        self,
        current_status: AppraisalStatus,
        new_status: AppraisalStatus
    ) -> None:
        """Validate status transition is allowed."""
        if new_status not in self._valid_transitions.get(current_status, []):
            raise StatusTransitionError(
                f"Cannot transition from {current_status.value} to {new_status.value}"
            )
    
    async def _validate_participants(
        self,
        db: AsyncSession,
        appraisee_id: int,
        appraiser_id: int,
        reviewer_id: int
    ) -> None:
        """Validate all participants exist and are active."""
        for emp_id, role in [
            (appraisee_id, "Appraisee"),
            (appraiser_id, "Appraiser"),
            (reviewer_id, "Reviewer")
        ]:
            employee = await self.employee_repository.get_by_id(db, emp_id)
            if not employee:
                raise EntityNotFoundError(f"{role} employee", emp_id)
            if not employee.emp_status:
                raise ValidationError(f"{role} must be an active employee")
        
        # Validate that participants are different
        if len(set([appraisee_id, appraiser_id, reviewer_id])) != 3:
            raise ValidationError("Appraisee, appraiser, and reviewer must be different employees")
    
    async def _validate_submission(
        self,
        db: AsyncSession,
        appraisal: Appraisal
    ) -> None:
        """Validate appraisal can be submitted."""
        # Check if appraisal has goals
        goals = await self.appraisal_goal_repository.get_by_appraisal(
            db, appraisal.appraisal_id
        )
        if not goals:
            raise ValidationError(CANNOT_SUBMIT_WITHOUT_GOALS)
    
    async def _validate_user_permission(
        self,
        db: AsyncSession,
        appraisal: Appraisal,
        new_status: AppraisalStatus,
        user_id: int
    ) -> None:
        """Validate user has permission for status transition."""
        if new_status == AppraisalStatus.SUBMITTED:
            # Only appraisee can submit
            if user_id != appraisal.appraisee_id:
                raise ValidationError("Only appraisee can submit appraisal")
        elif new_status == AppraisalStatus.APPRAISEE_SELF_ASSESSMENT:
            # Only appraisee can complete self-assessment
            if user_id != appraisal.appraisee_id:
                raise ValidationError("Only appraisee can complete self-assessment")
        elif new_status == AppraisalStatus.APPRAISER_EVALUATION:
            # Only appraiser can complete evaluation
            if user_id != appraisal.appraiser_id:
                raise ValidationError("Only appraiser can complete evaluation")
        elif new_status == AppraisalStatus.REVIEWER_EVALUATION:
            # Only reviewer can complete review
            if user_id != appraisal.reviewer_id:
                raise ValidationError("Only reviewer can complete review")
        elif new_status == AppraisalStatus.COMPLETE:
            # Only reviewer can mark as complete
            if user_id != appraisal.reviewer_id:
                raise ValidationError("Only reviewer can mark appraisal as complete")
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: AppraisalCreate) -> Appraisal:
        """Backward compatibility method for create_appraisal."""
        return await self.create_appraisal(db, appraisal_data=obj_in)
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> Appraisal:
        """Backward compatibility method - get by ID or raise 404."""
        appraisal = await self.get_appraisal_by_id(db, entity_id)
        if not appraisal:
            raise EntityNotFoundError("Appraisal", entity_id)
        return appraisal
    
    async def update(self, db: AsyncSession, *, db_obj: Appraisal, obj_in: AppraisalUpdate) -> Appraisal:
        """Backward compatibility method for update."""
        return await self.update_appraisal(db, appraisal_id=db_obj.appraisal_id, appraisal_data=obj_in)
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_appraisal(db, entity_id)
    
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
        """Get appraisals with various filters - backward compatibility."""
        if status:
            return await self.get_appraisals_by_status(db, status, skip=skip, limit=limit)
        elif appraisee_id:
            return await self.get_appraisals_by_employee(db, appraisee_id, role=ROLE_APPRAISEE, skip=skip, limit=limit)
        elif appraiser_id:
            return await self.get_appraisals_by_employee(db, appraiser_id, role=ROLE_APPRAISER, skip=skip, limit=limit)
        elif reviewer_id:
            return await self.get_appraisals_by_employee(db, reviewer_id, role=ROLE_REVIEWER, skip=skip, limit=limit)
        else:
            # Return all appraisals with pagination
            return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)
    
    async def get_appraisal_with_goals(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]:
        """Get appraisal with goals loaded - backward compatibility."""
        return await self.get_appraisal_by_id(db, appraisal_id, load_relationships=True)
    
    async def update_appraisal_status(
        self,
        db: AsyncSession,
        appraisal_id: int,
        new_status: AppraisalStatus,
        user_id: int
    ) -> Appraisal:
        """Update appraisal status - backward compatibility."""
        return await self.transition_status(db, appraisal_id, new_status, user_id)
    
    async def update_self_assessment(
        self,
        db: AsyncSession,
        appraisal_id: int,
        user_id: int
    ) -> Appraisal:
        """Submit self assessment - backward compatibility."""
        return await self.submit_self_assessment(db, appraisal_id, user_id)
    
    # Goal management methods
    async def add_goals_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_ids: List[int]
    ) -> Appraisal:
        """Add multiple goals to an appraisal with validation."""
        # Verify appraisal exists
        appraisal = await self.repository.get_by_id(db, appraisal_id)
        if not appraisal:
            raise EntityNotFoundError("Appraisal", appraisal_id)
        
        # Validate goals exist and add them
        for goal_id in goal_ids:
            # Check goal exists
            goal = await self.appraisal_goal_repository.get_goal_by_id(db, goal_id)
            if not goal:
                raise EntityNotFoundError("Goal", goal_id)
            
            # Add goal if not already linked
            await self.appraisal_goal_repository.add_goal_to_appraisal(
                db, appraisal_id, goal_id
            )
        
        return await self.repository.get_by_id(db, appraisal_id, load_relationships=True)
    
    async def add_single_goal_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> Appraisal:
        """Add a single goal to an appraisal with validation."""
        return await self.add_goals_to_appraisal(db, appraisal_id, [goal_id])
    
    async def remove_goal_from_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> bool:
        """Remove a goal from an appraisal with validation."""
        # Verify appraisal goal exists
        if not await self.appraisal_goal_repository.goal_exists_in_appraisal(
            db, appraisal_id, goal_id
        ):
            raise EntityNotFoundError("Appraisal Goal", f"appraisal_id={appraisal_id}, goal_id={goal_id}")
        
        return await self.appraisal_goal_repository.remove_goal_from_appraisal(
            db, appraisal_id, goal_id
        )

    async def update_appraiser_evaluation(
        self,
        db: AsyncSession,
        appraisal_id: int,
        user_id: int,
        overall_rating: Optional[int] = None,
        overall_comments: Optional[str] = None
    ) -> Appraisal:
        """Complete appraiser evaluation - backward compatibility."""
        return await self.complete_appraiser_evaluation(
            db, appraisal_id, user_id, overall_rating, overall_comments
        )
    
    async def update_reviewer_evaluation(
        self,
        db: AsyncSession,
        appraisal_id: int,
        user_id: int,
        overall_rating: Optional[int] = None,
        overall_comments: Optional[str] = None
    ) -> Appraisal:
        """Complete reviewer evaluation - backward compatibility."""
        return await self.complete_reviewer_evaluation(
            db, appraisal_id, user_id, overall_rating, overall_comments
        )
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[Appraisal]:
        """Get multiple appraisals - backward compatibility."""
        return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)