"""Goal service for handling goal-related business logic."""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.goal import Goal, GoalTemplate, Category, AppraisalGoal
from app.models.appraisal import Appraisal
from app.schemas.goal import (
    GoalCreate, 
    GoalUpdate, 
    GoalTemplateCreate, 
    GoalTemplateUpdate,
    AppraisalGoalCreate,
    AppraisalGoalUpdate
)
from app.services.base_service import BaseService
from app.constants import (
    GOAL_NOT_FOUND,
    GOAL_TEMPLATE_NOT_FOUND,
    APPRAISAL_NOT_FOUND,
    APPRAISAL_GOAL_NOT_FOUND,
    CATEGORY_NOT_FOUND,
    INVALID_WEIGHTAGE_TOTAL,
    WEIGHTAGE_MUST_BE_VALID,
    RATING_MUST_BE_VALID,
    IMPORTANCE_MUST_BE_VALID,
    get_entity_not_found_message,
    get_weightage_error_message,
    get_goal_not_in_appraisal_message
)


class GoalService(BaseService[Goal, GoalCreate, GoalUpdate]):
    """Service for goal-related operations."""
    
    def __init__(self):
        super().__init__(Goal)
    
    async def get_by_id(self, db: AsyncSession, goal_id: int) -> Optional[Goal]:
        """Get goal by ID with relationships."""
        result = await db.execute(
            select(Goal)
            .where(Goal.goal_id == goal_id)
            .options(selectinload(Goal.category))
        )
        return result.scalars().first()
    
    async def get_all_goals(
        self, 
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Goal]:
        """Get all goals with filtering."""
        query = select(Goal).options(selectinload(Goal.category))
        
        if filters:
            if 'category_id' in filters:
                query = query.where(Goal.category_id == filters['category_id'])
            if 'importance' in filters:
                query = query.where(Goal.importance == filters['importance'])
            if 'status' in filters:
                query = query.where(Goal.status == filters['status'])
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_goal(
        self, 
        db: AsyncSession, 
        goal_data: GoalCreate
    ) -> Goal:
        """Create a new goal with validation."""
        async with db.begin():
            # Validate create data
            await self.validate_create(db, goal_data)
            
            # Create goal
            db_goal = await self.create(db, goal_data, commit=False)
            await db.refresh(db_goal)
            
            return db_goal
    
    async def update_goal(
        self, 
        db: AsyncSession, 
        goal_id: int, 
        goal_update: GoalUpdate
    ) -> Goal:
        """Update an existing goal."""
        async with db.begin():
            # Get existing goal
            db_goal = await self.get_by_id_or_404(db, goal_id)
            
            # Validate update data
            await self.validate_update(db, db_goal, goal_update)
            
            # Update goal
            updated_goal = await self.update(db, db_goal, goal_update, commit=False)
            await db.refresh(updated_goal)
            
            return updated_goal
    
    # Goal Template operations
    async def get_template_by_id(self, db: AsyncSession, template_id: int) -> Optional[GoalTemplate]:
        """Get goal template by ID."""
        result = await db.execute(
            select(GoalTemplate)
            .where(GoalTemplate.template_id == template_id)
            .options(selectinload(GoalTemplate.category))
        )
        return result.scalars().first()
    
    async def get_all_templates(
        self, 
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[GoalTemplate]:
        """Get all goal templates with filtering."""
        query = select(GoalTemplate).options(selectinload(GoalTemplate.category))
        
        if filters:
            if 'category_id' in filters:
                query = query.where(GoalTemplate.category_id == filters['category_id'])
            if 'importance' in filters:
                query = query.where(GoalTemplate.importance == filters['importance'])
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_template(
        self, 
        db: AsyncSession, 
        template_data: GoalTemplateCreate
    ) -> GoalTemplate:
        """Create a new goal template with validation."""
        async with db.begin():
            # Validate category exists
            await self._validate_category_exists(db, template_data.category_id)
            
            # Create template
            template_dict = template_data.model_dump()
            db_template = GoalTemplate(**template_dict)
            db.add(db_template)
            await db.flush()
            await db.refresh(db_template)
            
            return db_template
    
    # Appraisal Goal operations
    async def get_appraisal_goals(
        self, 
        db: AsyncSession, 
        appraisal_id: int
    ) -> List[AppraisalGoal]:
        """Get all goals for an appraisal."""
        result = await db.execute(
            select(AppraisalGoal)
            .where(AppraisalGoal.appraisal_id == appraisal_id)
            .options(selectinload(AppraisalGoal.goal))
        )
        return result.scalars().all()
    
    async def add_goal_to_appraisal(
        self, 
        db: AsyncSession, 
        appraisal_goal_data: AppraisalGoalCreate
    ) -> AppraisalGoal:
        """Add a goal to an appraisal with validation."""
        async with db.begin():
            # Validate appraisal exists
            await self._validate_appraisal_exists(db, appraisal_goal_data.appraisal_id)
            
            # Validate goal exists
            await self._validate_goal_exists(db, appraisal_goal_data.goal_id)
            
            # Validate weightage
            await self._validate_weightage(appraisal_goal_data.weightage)
            
            # Check total weightage won't exceed 100%
            await self._validate_total_weightage(
                db, 
                appraisal_goal_data.appraisal_id, 
                appraisal_goal_data.weightage
            )
            
            # Create appraisal goal
            appraisal_goal_dict = appraisal_goal_data.model_dump()
            db_appraisal_goal = AppraisalGoal(**appraisal_goal_dict)
            db.add(db_appraisal_goal)
            await db.flush()
            await db.refresh(db_appraisal_goal)
            
            return db_appraisal_goal
    
    async def update_appraisal_goal(
        self, 
        db: AsyncSession, 
        appraisal_goal_id: int, 
        appraisal_goal_update: AppraisalGoalUpdate
    ) -> AppraisalGoal:
        """Update an appraisal goal."""
        async with db.begin():
            # Get existing appraisal goal
            result = await db.execute(
                select(AppraisalGoal).where(AppraisalGoal.id == appraisal_goal_id)
            )
            db_appraisal_goal = result.scalars().first()
            
            if not db_appraisal_goal:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=get_entity_not_found_message("Appraisal goal", appraisal_goal_id)
                )
            
            # Validate weightage if being updated
            if appraisal_goal_update.weightage is not None:
                await self._validate_weightage(appraisal_goal_update.weightage)
                
                # Check total weightage won't exceed 100%
                current_weightage = db_appraisal_goal.weightage
                weightage_difference = appraisal_goal_update.weightage - current_weightage
                
                if weightage_difference > 0:
                    await self._validate_total_weightage(
                        db, 
                        db_appraisal_goal.appraisal_id, 
                        weightage_difference,
                        exclude_goal_id=appraisal_goal_id
                    )
            
            # Validate ratings if provided
            if appraisal_goal_update.self_rating is not None:
                await self._validate_rating(appraisal_goal_update.self_rating)
            if appraisal_goal_update.appraiser_rating is not None:
                await self._validate_rating(appraisal_goal_update.appraiser_rating)
            if appraisal_goal_update.reviewer_rating is not None:
                await self._validate_rating(appraisal_goal_update.reviewer_rating)
            
            # Update appraisal goal
            update_data = appraisal_goal_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_appraisal_goal, field, value)
            
            db.add(db_appraisal_goal)
            await db.refresh(db_appraisal_goal)
            
            return db_appraisal_goal
    
    async def remove_goal_from_appraisal(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        goal_id: int
    ) -> bool:
        """Remove a goal from an appraisal."""
        async with db.begin():
            result = await db.execute(
                select(AppraisalGoal).where(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
            appraisal_goal = result.scalars().first()
            
            if not appraisal_goal:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=get_goal_not_in_appraisal_message(goal_id)
                )
            
            await db.delete(appraisal_goal)
            return True
    
    # Validation methods
    async def validate_create(self, db: AsyncSession, obj_in: GoalCreate) -> None:
        """Validate goal creation data."""
        await self._validate_category_exists(db, obj_in.category_id)
        await self._validate_importance(obj_in.importance)
    
    async def validate_update(self, db: AsyncSession, db_obj: Goal, obj_in: GoalUpdate) -> None:
        """Validate goal update data."""
        if obj_in.category_id is not None:
            await self._validate_category_exists(db, obj_in.category_id)
        if obj_in.importance is not None:
            await self._validate_importance(obj_in.importance)
    
    async def _validate_category_exists(self, db: AsyncSession, category_id: int) -> None:
        """Validate that category exists."""
        result = await db.execute(select(Category).where(Category.category_id == category_id))
        category = result.scalars().first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_entity_not_found_message("Category", category_id)
            )
    
    async def _validate_appraisal_exists(self, db: AsyncSession, appraisal_id: int) -> None:
        """Validate that appraisal exists."""
        result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
        appraisal = result.scalars().first()
        
        if not appraisal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_entity_not_found_message("Appraisal", appraisal_id)
            )
    
    async def _validate_goal_exists(self, db: AsyncSession, goal_id: int) -> None:
        """Validate that goal exists."""
        goal = await self.get_by_id(db, goal_id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_entity_not_found_message("Goal", goal_id)
            )
    
    async def _validate_weightage(self, weightage: float) -> None:
        """Validate weightage is between 0 and 100."""
        if not (0 <= weightage <= 100):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=WEIGHTAGE_MUST_BE_VALID
            )
    
    async def _validate_rating(self, rating: int) -> None:
        """Validate rating is between 1 and 5."""
        if not (1 <= rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=RATING_MUST_BE_VALID
            )
    
    async def _validate_importance(self, importance: str) -> None:
        """Validate importance is one of: High, Medium, Low."""
        if importance not in ["High", "Medium", "Low"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=IMPORTANCE_MUST_BE_VALID
            )
    
    async def _validate_total_weightage(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        additional_weightage: float,
        exclude_goal_id: Optional[int] = None
    ) -> None:
        """Validate that total weightage won't exceed 100%."""
        query = select(AppraisalGoal).where(AppraisalGoal.appraisal_id == appraisal_id)
        
        if exclude_goal_id:
            query = query.where(AppraisalGoal.id != exclude_goal_id)
        
        result = await db.execute(query)
        existing_goals = result.scalars().all()
        
        current_total = sum(goal.weightage for goal in existing_goals)
        new_total = current_total + additional_weightage
        
        if new_total > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_weightage_error_message(new_total)
            )
    
    async def get_by_id_or_404(self, db: AsyncSession, goal_id: int) -> Goal:
        """Get goal by ID or raise 404 error."""
        goal = await self.get_by_id(db, goal_id)
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_entity_not_found_message("Goal", goal_id)
            )
        return goal