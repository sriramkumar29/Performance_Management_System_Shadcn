"""Appraisal service for handling appraisal-related business logic."""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_
from fastapi import HTTPException, status

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.employee import Employee
from app.models.goal import Goal, AppraisalGoal
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.schemas.appraisal import (
    AppraisalCreate, 
    AppraisalUpdate, 
    AppraisalStatusUpdate,
    SelfAssessmentUpdate,
    AppraiserEvaluationUpdate,
    ReviewerEvaluationUpdate
)
from app.services.base_service import BaseService
from app.constants import (
    APPRAISAL_NOT_FOUND,
    APPRAISAL_TYPE_NOT_FOUND,
    APPRAISAL_RANGE_NOT_FOUND,
    APPRAISAL_RANGE_MISMATCH,
    CANNOT_SUBMIT_WITHOUT_GOALS,
    ROLE_APPRAISEE,
    ROLE_APPRAISER,
    ROLE_REVIEWER,
    get_entity_not_found_message,
    get_invalid_transition_message,
    get_weightage_error_message,
    get_goal_not_in_appraisal_message
)


class AppraisalService(BaseService[Appraisal, AppraisalCreate, AppraisalUpdate]):
    """Service for appraisal-related operations."""
    
    def __init__(self):
        super().__init__(Appraisal)
    
    async def get_by_id(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]:
        """Get appraisal by ID with relationships."""
        result = await db.execute(
            select(Appraisal)
            .where(Appraisal.appraisal_id == appraisal_id)
            .options(
                selectinload(Appraisal.appraisee),
                selectinload(Appraisal.appraiser),
                selectinload(Appraisal.reviewer),
                selectinload(Appraisal.appraisal_type),
                selectinload(Appraisal.appraisal_range),
                selectinload(Appraisal.goals).selectinload(AppraisalGoal.goal)
            )
        )
        return result.scalars().first()
    
    async def get_all_appraisals(
        self, 
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Appraisal]:
        """Get all appraisals with filtering."""
        query = select(Appraisal).options(
            selectinload(Appraisal.appraisee),
            selectinload(Appraisal.appraiser),
            selectinload(Appraisal.reviewer),
            selectinload(Appraisal.appraisal_type),
            selectinload(Appraisal.appraisal_range)
        )
        
        if filters:
            if 'status' in filters:
                query = query.where(Appraisal.status == filters['status'])
            if 'appraisee_id' in filters:
                query = query.where(Appraisal.appraisee_id == filters['appraisee_id'])
            if 'appraiser_id' in filters:
                query = query.where(Appraisal.appraiser_id == filters['appraiser_id'])
            if 'reviewer_id' in filters:
                query = query.where(Appraisal.reviewer_id == filters['reviewer_id'])
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_appraisal(
        self, 
        db: AsyncSession, 
        appraisal_data: AppraisalCreate
    ) -> Appraisal:
        """Create a new appraisal with validation."""
        async with db.begin():
            # Validate create data
            await self.validate_create(db, appraisal_data)
            
            # Create appraisal
            db_appraisal = await self.create(db, appraisal_data, commit=False)
            await db.refresh(db_appraisal)
            
            return db_appraisal
    
    async def update_appraisal_status(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        status_update: AppraisalStatusUpdate
    ) -> Appraisal:
        """Update appraisal status with validation."""
        async with db.begin():
            db_appraisal = await self.get_by_id_or_404(db, appraisal_id)
            
            # Validate status transition
            await self._validate_status_transition(db, db_appraisal, status_update.status)
            
            # Update status
            db_appraisal.status = status_update.status
            db.add(db_appraisal)
            await db.refresh(db_appraisal)
            
            return db_appraisal
    
    async def submit_self_assessment(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        assessment_data: SelfAssessmentUpdate
    ) -> Appraisal:
        """Submit self-assessment for an appraisal."""
        async with db.begin():
            db_appraisal = await self.get_by_id_or_404(db, appraisal_id)
            
            # Validate that appraisal is in draft status
            if db_appraisal.status != AppraisalStatus.DRAFT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=get_invalid_transition_message(db_appraisal.status.value, "self_assessment")
                )
            
            # Validate goals exist and total 100% weightage
            await self._validate_goals_for_submission(db, appraisal_id)
            
            # Update self-assessment data
            db_appraisal.self_assessment = assessment_data.self_assessment
            db_appraisal.status = AppraisalStatus.PENDING
            
            db.add(db_appraisal)
            await db.refresh(db_appraisal)
            
            return db_appraisal
    
    async def submit_appraiser_evaluation(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        evaluation_data: AppraiserEvaluationUpdate
    ) -> Appraisal:
        """Submit appraiser evaluation for an appraisal."""
        async with db.begin():
            db_appraisal = await self.get_by_id_or_404(db, appraisal_id)
            
            # Validate that appraisal is in pending status
            if db_appraisal.status != AppraisalStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=get_invalid_transition_message(db_appraisal.status.value, "appraiser_evaluation")
                )
            
            # Update appraiser evaluation data
            db_appraisal.appraiser_evaluation = evaluation_data.appraiser_evaluation
            db_appraisal.status = AppraisalStatus.IN_PROGRESS
            
            db.add(db_appraisal)
            await db.refresh(db_appraisal)
            
            return db_appraisal
    
    async def submit_reviewer_evaluation(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        evaluation_data: ReviewerEvaluationUpdate
    ) -> Appraisal:
        """Submit reviewer evaluation for an appraisal."""
        async with db.begin():
            db_appraisal = await self.get_by_id_or_404(db, appraisal_id)
            
            # Validate that appraisal is in in_progress status
            if db_appraisal.status != AppraisalStatus.IN_PROGRESS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=get_invalid_transition_message(db_appraisal.status.value, "reviewer_evaluation")
                )
            
            # Update reviewer evaluation data
            db_appraisal.reviewer_evaluation = evaluation_data.reviewer_evaluation
            db_appraisal.status = AppraisalStatus.COMPLETED
            
            db.add(db_appraisal)
            await db.refresh(db_appraisal)
            
            return db_appraisal
    
    async def validate_create(self, db: AsyncSession, obj_in: AppraisalCreate) -> None:
        """Validate appraisal creation data."""
        # Validate employees exist
        await self._validate_employees(db, obj_in)
        
        # Validate appraisal type and range
        await self._validate_appraisal_type_and_range(db, obj_in)
    
    async def validate_update(self, db: AsyncSession, db_obj: Appraisal, obj_in: AppraisalUpdate) -> None:
        """Validate appraisal update data."""
        # Validate employees if being updated
        if any(getattr(obj_in, field, None) for field in ['appraisee_id', 'appraiser_id', 'reviewer_id']):
            # Create a temporary AppraisalCreate object for validation
            temp_create = AppraisalCreate(
                appraisee_id=obj_in.appraisee_id or db_obj.appraisee_id,
                appraiser_id=obj_in.appraiser_id or db_obj.appraiser_id,
                reviewer_id=obj_in.reviewer_id or db_obj.reviewer_id,
                appraisal_type_id=obj_in.appraisal_type_id or db_obj.appraisal_type_id,
                appraisal_range_id=obj_in.appraisal_range_id or db_obj.appraisal_range_id,
                start_date=obj_in.start_date or db_obj.start_date,
                end_date=obj_in.end_date or db_obj.end_date
            )
            await self._validate_employees(db, temp_create)
        
        # Validate appraisal type and range if being updated
        if obj_in.appraisal_type_id or obj_in.appraisal_range_id:
            temp_create = AppraisalCreate(
                appraisee_id=db_obj.appraisee_id,
                appraiser_id=db_obj.appraiser_id,
                reviewer_id=db_obj.reviewer_id,
                appraisal_type_id=obj_in.appraisal_type_id or db_obj.appraisal_type_id,
                appraisal_range_id=obj_in.appraisal_range_id or db_obj.appraisal_range_id,
                start_date=db_obj.start_date,
                end_date=db_obj.end_date
            )
            await self._validate_appraisal_type_and_range(db, temp_create)
    
    async def _validate_employees(self, db: AsyncSession, appraisal: AppraisalCreate) -> None:
        """Validate that all employees (appraisee, appraiser, reviewer) exist."""
        employees_to_check = [
            (appraisal.appraisee_id, ROLE_APPRAISEE),
            (appraisal.appraiser_id, ROLE_APPRAISER),
            (appraisal.reviewer_id, ROLE_REVIEWER)
        ]
        
        for emp_id, role in employees_to_check:
            result = await db.execute(
                select(Employee).where(
                    Employee.emp_id == emp_id,
                    Employee.emp_status == True
                )
            )
            employee = result.scalars().first()
            
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=get_entity_not_found_message(role, emp_id)
                )
    
    async def _validate_appraisal_type_and_range(self, db: AsyncSession, appraisal: AppraisalCreate) -> None:
        """Validate appraisal type and range compatibility."""
        # Validate appraisal type exists
        result = await db.execute(select(AppraisalType).where(AppraisalType.id == appraisal.appraisal_type_id))
        appraisal_type = result.scalars().first()
        
        if not appraisal_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_entity_not_found_message("Appraisal type", appraisal.appraisal_type_id)
            )
        
        # Validate appraisal range if provided
        if appraisal.appraisal_range_id:
            result = await db.execute(
                select(AppraisalRange).where(
                    AppraisalRange.id == appraisal.appraisal_range_id,
                    AppraisalRange.appraisal_type_id == appraisal.appraisal_type_id
                )
            )
            appraisal_range = result.scalars().first()
            
            if not appraisal_range:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=APPRAISAL_RANGE_MISMATCH
                )
    
    async def _validate_status_transition(self, db: AsyncSession, appraisal: Appraisal, new_status: AppraisalStatus) -> None:
        """Validate status transition is allowed."""
        valid_transitions = {
            AppraisalStatus.DRAFT: [AppraisalStatus.PENDING],
            AppraisalStatus.PENDING: [AppraisalStatus.IN_PROGRESS, AppraisalStatus.DRAFT],
            AppraisalStatus.IN_PROGRESS: [AppraisalStatus.COMPLETED, AppraisalStatus.PENDING],
            AppraisalStatus.COMPLETED: [AppraisalStatus.APPROVED],
            AppraisalStatus.APPROVED: []  # Terminal state
        }
        
        current_status = appraisal.status
        if new_status not in valid_transitions.get(current_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_invalid_transition_message(current_status.value, new_status.value)
            )
    
    async def _validate_goals_for_submission(self, db: AsyncSession, appraisal_id: int) -> None:
        """Validate that appraisal has goals totaling 100% weightage."""
        result = await db.execute(
            select(AppraisalGoal).where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        appraisal_goals = result.scalars().all()
        
        if not appraisal_goals:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=CANNOT_SUBMIT_WITHOUT_GOALS
            )
        
        total_weightage = sum(goal.weightage for goal in appraisal_goals)
        if total_weightage != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_weightage_error_message(total_weightage)
            )
    
    async def get_by_id_or_404(self, db: AsyncSession, appraisal_id: int) -> Appraisal:
        """Get appraisal by ID or raise 404 error."""
        appraisal = await self.get_by_id(db, appraisal_id)
        if not appraisal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_entity_not_found_message("Appraisal", appraisal_id)
            )
        return appraisal