"""
Goal service for the Performance Management System.

This module provides business logic for goal and goal template management
with proper validation and relationship handling.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, delete, insert

from app.models.goal import Goal, GoalTemplate, Category, AppraisalGoal, goal_template_categories
from app.schemas.goal import (
    GoalCreate, GoalUpdate,
    GoalTemplateCreate, GoalTemplateUpdate,
    CategoryCreate,
    AppraisalGoalCreate, AppraisalGoalUpdate
)
from app.services.base_service import BaseService
from app.repositories.category_repository import CategoryRepository
from app.repositories.goal_repository import GoalRepository
from app.repositories.appraisal_goal_repository import AppraisalGoalRepository
from app.exceptions import EntityNotFoundError, ValidationError


class GoalService(BaseService[Goal, GoalCreate, GoalUpdate]):
    """Service class for goal operations."""
    
    def __init__(self):
        super().__init__(Goal)
        self.repository = GoalRepository()
    
    @property
    def entity_name(self) -> str:
        return "Goal"
    
    @property
    def id_field(self) -> str:
        return "goal_id"
    
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: GoalCreate
    ) -> Goal:
        """Create a new goal."""
        # Convert Pydantic model to dict
        goal_data = obj_in.model_dump()
        
        # Apply business logic hooks
        goal_data = await self.before_create(db, goal_data)
        
        # Use repository to create
        db_goal = await self.repository.create(db, obj_data=goal_data)
        
        # Apply after-create hook
        db_goal = await self.after_create(db, db_goal, goal_data)
        
        return db_goal
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Goal:
        """Get goal by ID or raise 404 error."""
        goal = await self.repository.get_by_id(db, entity_id, load_relationships=load_relationships)
        if not goal:
            raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
        return goal
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by = None
    ) -> List[Goal]:
        """Get multiple goals."""
        return await self.repository.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=order_by
        )
    
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: Goal,
        obj_in: GoalUpdate
    ) -> Goal:
        """Update a goal with the provided data."""
        # Convert Pydantic model to dict, excluding unset values
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Apply business logic hooks
        update_data = await self.before_update(db, db_obj, update_data)
        
        # Use repository to update
        updated_goal = await self.repository.update(db, db_obj=db_obj, obj_data=update_data)
        
        # Apply after-update hook
        updated_goal = await self.after_update(db, updated_goal, db_obj, update_data)
        
        return updated_goal


class GoalTemplateService(BaseService[GoalTemplate, GoalTemplateCreate, GoalTemplateUpdate]):
    """Service class for goal template operations."""
    
    def __init__(self):
        super().__init__(GoalTemplate)
        from app.repositories.goal_template_repository import GoalTemplateRepository
        self.repository = GoalTemplateRepository()
    
    @property
    def entity_name(self) -> str:
        return "Goal Template"
    
    @property
    def id_field(self) -> str:
        return "temp_id"
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> GoalTemplate:
        """Get goal template by ID or raise 404 error."""
        template = await self.repository.get_by_id(db, entity_id, load_relationships=load_relationships)
        if not template:
            raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
        return template
    
    async def get_template_with_categories(
        self,
        db: AsyncSession,
        template_id: int
    ) -> GoalTemplate:
        """Get a goal template with categories loaded."""
        query = (
            select(GoalTemplate)
            .options(selectinload(GoalTemplate.categories))
            .where(GoalTemplate.temp_id == template_id)
        )
        
        result = await db.execute(query)
        template = result.scalars().first()
        
        if not template:
            raise EntityNotFoundError(self.entity_name, template_id)
        
        return template
    
    async def create_template_with_categories(
        self,
        db: AsyncSession,
        *,
        template_data: GoalTemplateCreate
    ) -> GoalTemplate:
        """Create a new goal template with category relationships."""
        # Get or create categories
        categories = []
        for category_name in template_data.categories:
            category = await self._get_or_create_category(db, category_name)
            categories.append(category)
        
        # Create new goal template
        db_template = GoalTemplate(
            temp_title=template_data.temp_title,
            temp_description=template_data.temp_description,
            temp_performance_factor=template_data.temp_performance_factor,
            temp_importance=template_data.temp_importance,
            temp_weightage=template_data.temp_weightage,
            categories=categories
        )
        
        db.add(db_template)
        await db.flush()
        
        # Reload with categories for response
        return await self.get_template_with_categories(db, db_template.temp_id)
    
    async def update_template_with_categories(
        self,
        db: AsyncSession,
        *,
        template_id: int,
        template_data: GoalTemplateUpdate
    ) -> GoalTemplate:
        """Update a goal template with category relationships."""
        # Get existing template
        db_template = await self.get_template_with_categories(db, template_id)
        
        # Update basic fields
        update_data = template_data.model_dump(exclude={"categories"}, exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_template, key, value)
        
        # Ensure pending scalar changes are flushed before mutating relationships
        await db.flush()
        
        # Update categories if provided
        if template_data.categories is not None:
            await self._update_template_categories(db, db_template, template_data.categories)
        
        await db.flush()
        
        # Reload with categories for response
        return await self.get_template_with_categories(db, template_id)
    
    async def _update_template_categories(
        self,
        db: AsyncSession,
        template: GoalTemplate,
        category_names: List[str]
    ) -> None:
        """Update the categories associated with a template."""
        # Delete existing associations
        await db.execute(
            delete(goal_template_categories).where(
                goal_template_categories.c.template_id == template.temp_id
            )
        )
        
        # Insert associations for provided categories
        for category_name in category_names:
            # Get or create category
            category = await self._get_or_create_category(db, category_name)
            
            # Insert link row
            await db.execute(
                insert(goal_template_categories).values(
                    template_id=template.temp_id,
                    category_id=category.id
                )
            )
    
    async def _get_or_create_category(
        self,
        db: AsyncSession,
        category_name: str
    ) -> Category:
        """Get an existing category or create a new one."""
        result = await db.execute(
            select(Category).where(Category.name == category_name)
        )
        category = result.scalars().first()
        
        if not category:
            category = Category(name=category_name)
            db.add(category)
            await db.flush()
        
        return category


class CategoryService(BaseService[Category, CategoryCreate, None]):
    """Service class for category operations."""
    
    def __init__(self):
        super().__init__(Category)
        self.repository = CategoryRepository()
    
    @property
    def entity_name(self) -> str:
        return "Category"
    
    @property
    def id_field(self) -> str:
        return "id"
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by = None
    ) -> List[Category]:
        """Get multiple categories."""
        return await self.repository.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=order_by
        )
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Category:
        """Get category by ID or raise 404 error."""
        category = await self.repository.get_by_id(db, entity_id)
        if not category:
            raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
        return category


class AppraisalGoalService(BaseService[AppraisalGoal, AppraisalGoalCreate, AppraisalGoalUpdate]):
    """Service class for appraisal goal operations."""
    
    def __init__(self):
        super().__init__(AppraisalGoal)
        self.repository = AppraisalGoalRepository()
    
    @property
    def entity_name(self) -> str:
        return "Appraisal Goal"
    
    @property
    def id_field(self) -> str:
        return "id"
    
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: AppraisalGoalCreate
    ) -> AppraisalGoal:
        """Create a new appraisal goal."""
        # Convert Pydantic model to dict
        appraisal_goal_data = obj_in.model_dump()
        
        # Apply business logic hooks
        appraisal_goal_data = await self.before_create(db, appraisal_goal_data)
        
        # Use repository to create
        db_appraisal_goal = await self.repository.create(db, obj_data=appraisal_goal_data)
        
        # Apply after-create hook
        db_appraisal_goal = await self.after_create(db, db_appraisal_goal, appraisal_goal_data)
        
        return db_appraisal_goal
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> AppraisalGoal:
        """Get appraisal goal by ID or raise 404 error."""
        appraisal_goal = await self.repository.get_by_id(db, entity_id)
        if not appraisal_goal:
            raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
        return appraisal_goal