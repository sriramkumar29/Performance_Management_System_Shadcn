"""
Goal service for the Performance Management System.

This module provides business logic for goal and goal template management
with proper validation and relationship handling using Repository pattern.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal, GoalTemplate, Category, AppraisalGoal
from app.schemas.goal import (
    GoalCreate, GoalUpdate,
    GoalTemplateCreate, GoalTemplateUpdate,
    CategoryCreate, CategoryUpdate,
    AppraisalGoalCreate, AppraisalGoalUpdate
)
from app.repositories.goal_repository import (
    GoalRepository,
    GoalTemplateRepository,
    CategoryRepository,
    AppraisalGoalRepository
)
from app.exceptions import EntityNotFoundError, ValidationError, DuplicateEntityError


class GoalService:
    """Service class for goal operations using Repository pattern."""
    
    def __init__(self):
        self.repository = GoalRepository()
        self.template_repository = GoalTemplateRepository()
        self.category_repository = CategoryRepository()
    
    async def create_goal(
        self,
        db: AsyncSession,
        *,
        goal_data: GoalCreate
    ) -> Goal:
        """Create a new goal with validation."""
        # Validate template exists if provided
        if goal_data.goal_template_id:
            template = await self.template_repository.get_by_id(db, goal_data.goal_template_id)
            if not template:
                raise EntityNotFoundError("Goal Template", goal_data.goal_template_id)
        
        # Validate category exists if provided
        if goal_data.category_id:
            category = await self.category_repository.get_by_id(db, goal_data.category_id)
            if not category:
                raise EntityNotFoundError("Category", goal_data.category_id)
        
        # Validate weightage
        if not (1 <= goal_data.goal_weightage <= 100):
            raise ValidationError("Goal weightage must be between 1 and 100")
        
        goal_dict = goal_data.dict()
        return await self.repository.create(db, goal_dict)
    
    async def update_goal(
        self,
        db: AsyncSession,
        *,
        goal_id: int,
        goal_data: GoalUpdate
    ) -> Goal:
        """Update an existing goal with validation."""
        db_goal = await self.repository.get_by_id(db, goal_id)
        if not db_goal:
            raise EntityNotFoundError("Goal", goal_id)
        
        update_data = goal_data.dict(exclude_unset=True)
        
        # Validate template exists if being updated
        if "goal_template_id" in update_data and update_data["goal_template_id"]:
            template = await self.template_repository.get_by_id(db, update_data["goal_template_id"])
            if not template:
                raise EntityNotFoundError("Goal Template", update_data["goal_template_id"])
        
        # Validate category exists if being updated
        if "category_id" in update_data and update_data["category_id"]:
            category = await self.category_repository.get_by_id(db, update_data["category_id"])
            if not category:
                raise EntityNotFoundError("Category", update_data["category_id"])
        
        # Validate weightage if being updated
        if "goal_weightage" in update_data:
            if not (1 <= update_data["goal_weightage"] <= 100):
                raise ValidationError("Goal weightage must be between 1 and 100")
        
        return await self.repository.update(db, db_goal, update_data)
    
    async def get_goal_by_id(
        self,
        db: AsyncSession,
        goal_id: int,
        load_relationships: bool = True
    ) -> Optional[Goal]:
        """Get goal by ID."""
        return await self.repository.get_by_id(
            db, goal_id, load_relationships=load_relationships
        )
    
    async def get_goals_by_template(
        self,
        db: AsyncSession,
        template_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Goal]:
        """Get goals by template ID."""
        return await self.repository.get_by_template(
            db, template_id, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_goals_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Goal]:
        """Get goals by category ID."""
        return await self.repository.get_by_category(
            db, category_id, skip=skip, limit=limit, load_relationships=True
        )
    
    async def search_goals(
        self,
        db: AsyncSession,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Goal]:
        """Search goals by title or description."""
        return await self.repository.search_goals(
            db, search_term, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_goals_with_filters(
        self,
        db: AsyncSession,
        *,
        category_id: Optional[int] = None,
        template_id: Optional[int] = None,
        importance: Optional[str] = None,
        min_weightage: Optional[int] = None,
        max_weightage: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Goal]:
        """Get goals with multiple filters."""
        return await self.repository.get_goals_by_filters(
            db=db,
            category_id=category_id,
            template_id=template_id,
            importance=importance,
            min_weightage=min_weightage,
            max_weightage=max_weightage,
            skip=skip,
            limit=limit,
            load_relationships=True
        )
    
    async def delete_goal(
        self,
        db: AsyncSession,
        goal_id: int
    ) -> bool:
        """Delete goal by ID."""
        # Check if goal is used in any appraisals
        appraisal_goal_repo = AppraisalGoalRepository()
        if await appraisal_goal_repo.exists_for_goal(db, goal_id):
            raise ValidationError("Cannot delete goal that is used in appraisals")
        
        return await self.repository.delete(db, goal_id)
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: GoalCreate) -> Goal:
        """Backward compatibility method for create_goal."""
        return await self.create_goal(db, goal_data=obj_in)
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> Goal:
        """Backward compatibility method - get by ID or raise 404."""
        goal = await self.get_goal_by_id(db, entity_id)
        if not goal:
            raise EntityNotFoundError("Goal", entity_id)
        return goal
    
    async def update(self, db: AsyncSession, *, db_obj: Goal, obj_in: GoalUpdate) -> Goal:
        """Backward compatibility method for update."""
        return await self.update_goal(db, goal_id=db_obj.goal_id, goal_data=obj_in)
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_goal(db, entity_id)
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[Goal]:
        """Get multiple goals - backward compatibility."""
        return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)


class GoalTemplateService:
    """Service class for goal template operations using Repository pattern."""
    
    def __init__(self):
        self.repository = GoalTemplateRepository()
        self.category_repository = CategoryRepository()
    
    async def create_template(
        self,
        db: AsyncSession,
        *,
        template_data: GoalTemplateCreate
    ) -> GoalTemplate:
        """Create a new goal template with validation."""
        # Validate weightage
        if not (1 <= template_data.temp_weightage <= 100):
            raise ValidationError("Template weightage must be between 1 and 100")
        
        template_dict = template_data.dict()
        return await self.repository.create(db, template_dict)
    
    async def update_template(
        self,
        db: AsyncSession,
        *,
        template_id: int,
        template_data: GoalTemplateUpdate
    ) -> GoalTemplate:
        """Update an existing goal template with validation."""
        db_template = await self.repository.get_by_id(db, template_id)
        if not db_template:
            raise EntityNotFoundError("Goal Template", template_id)
        
        update_data = template_data.dict(exclude_unset=True)
        
        # Validate weightage if being updated
        if "temp_weightage" in update_data:
            if not (1 <= update_data["temp_weightage"] <= 100):
                raise ValidationError("Template weightage must be between 1 and 100")
        
        return await self.repository.update(db, db_template, update_data)
    
    async def get_template_by_id(
        self,
        db: AsyncSession,
        template_id: int,
        load_relationships: bool = True
    ) -> Optional[GoalTemplate]:
        """Get template by ID."""
        return await self.repository.get_by_id(
            db, template_id, load_relationships=load_relationships
        )
    
    async def get_templates_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[GoalTemplate]:
        """Get templates by category."""
        return await self.repository.get_by_category(
            db, category_id, skip=skip, limit=limit, load_relationships=True
        )
    
    async def search_templates(
        self,
        db: AsyncSession,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[GoalTemplate]:
        """Search templates by title or description."""
        return await self.repository.search_templates(
            db, search_term, skip=skip, limit=limit, load_relationships=True
        )
    
    async def get_all_templates(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[GoalTemplate]:
        """Get all templates."""
        return await self.repository.get_multi(
            db, skip=skip, limit=limit, load_relationships=True
        )
    
    async def delete_template(
        self,
        db: AsyncSession,
        template_id: int
    ) -> bool:
        """Delete template by ID."""
        # Check if template is used by any goals
        goal_repo = GoalRepository()
        goals = await goal_repo.get_by_template(db, template_id, limit=1)
        if goals:
            raise ValidationError("Cannot delete template that is used by goals")
        
        return await self.repository.delete(db, template_id)
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: GoalTemplateCreate) -> GoalTemplate:
        """Backward compatibility method for create_goal_template."""
        return await self.create_template(db, template_data=obj_in)
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> GoalTemplate:
        """Backward compatibility method - get by ID or raise 404."""
        template = await self.get_template_by_id(db, entity_id)
        if not template:
            raise EntityNotFoundError("GoalTemplate", entity_id)
        return template
    
    async def update(self, db: AsyncSession, *, db_obj: GoalTemplate, obj_in: GoalTemplateUpdate) -> GoalTemplate:
        """Backward compatibility method for update."""
        return await self.update_template(db, template_id=db_obj.template_id, template_data=obj_in)
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_template(db, entity_id)
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[GoalTemplate]:
        """Get multiple goal templates - backward compatibility."""
        return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)


class CategoryService:
    """Service class for category operations using Repository pattern."""
    
    def __init__(self):
        self.repository = CategoryRepository()
    
    async def create_category(
        self,
        db: AsyncSession,
        *,
        category_data: CategoryCreate
    ) -> Category:
        """Create a new category with validation."""
        # Check if name already exists
        if await self.repository.name_exists(db, category_data.name):
            raise DuplicateEntityError("Category", "name")
        
        category_dict = category_data.dict()
        return await self.repository.create(db, category_dict)
    
    async def update_category(
        self,
        db: AsyncSession,
        *,
        category_id: int,
        name: str
    ) -> Category:
        """Update an existing category with validation."""
        db_category = await self.repository.get_by_id(db, category_id)
        if not db_category:
            raise EntityNotFoundError("Category", category_id)
        
        # Check if new name already exists (excluding current category)
        if await self.repository.name_exists(db, name, exclude_id=category_id):
            raise DuplicateEntityError("Category", "name")
        
        return await self.repository.update(db, db_category, {"name": name})
    
    async def get_category_by_id(
        self,
        db: AsyncSession,
        category_id: int,
        load_relationships: bool = True
    ) -> Optional[Category]:
        """Get category by ID."""
        return await self.repository.get_by_id(
            db, category_id, load_relationships=load_relationships
        )
    
    async def get_category_by_name(
        self,
        db: AsyncSession,
        name: str,
        load_relationships: bool = True
    ) -> Optional[Category]:
        """Get category by name."""
        return await self.repository.get_by_name(
            db, name, load_relationships=load_relationships
        )
    
    async def get_all_categories(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Category]:
        """Get all categories."""
        return await self.repository.get_multi(
            db, skip=skip, limit=limit, load_relationships=True
        )
    
    async def delete_category(
        self,
        db: AsyncSession,
        category_id: int
    ) -> bool:
        """Delete category by ID."""
        # Check if category is used by any goals or templates
        goal_repo = GoalRepository()
        goals = await goal_repo.get_by_category(db, category_id, limit=1)
        if goals:
            raise ValidationError("Cannot delete category that is used by goals")
        
        template_repo = GoalTemplateRepository()
        templates = await template_repo.get_by_category(db, category_id, limit=1)
        if templates:
            raise ValidationError("Cannot delete category that is used by templates")
        
        return await self.repository.delete(db, category_id)
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: CategoryCreate) -> Category:
        """Backward compatibility method for create_category."""
        return await self.create_category(db, category_data=obj_in)
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> Category:
        """Backward compatibility method - get by ID or raise 404."""
        category = await self.get_category_by_id(db, entity_id)
        if not category:
            raise EntityNotFoundError("Category", entity_id)
        return category
    
    async def update(self, db: AsyncSession, *, db_obj: Category, obj_in: CategoryUpdate) -> Category:
        """Backward compatibility method for update."""
        return await self.update_category(db, category_id=db_obj.category_id, name=obj_in.name)
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_category(db, entity_id)
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[Category]:
        """Get multiple categories - backward compatibility."""
        return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)


class AppraisalGoalService:
    """Service class for appraisal goal operations using Repository pattern."""
    
    def __init__(self):
        self.repository = AppraisalGoalRepository()
        self.goal_repository = GoalRepository()
    
    async def create_appraisal_goal(
        self,
        db: AsyncSession,
        *,
        appraisal_goal_data: AppraisalGoalCreate
    ) -> AppraisalGoal:
        """Create a new appraisal goal with validation."""
        # Validate goal exists
        goal = await self.goal_repository.get_by_id(db, appraisal_goal_data.goal_id)
        if not goal:
            raise EntityNotFoundError("Goal", appraisal_goal_data.goal_id)
        
        # Check if goal is already assigned to another appraisal
        if await self.repository.exists_for_goal(db, appraisal_goal_data.goal_id):
            raise ValidationError("Goal is already assigned to another appraisal")
        
        appraisal_goal_dict = appraisal_goal_data.dict()
        return await self.repository.create(db, appraisal_goal_dict)
    
    async def update_appraisal_goal(
        self,
        db: AsyncSession,
        *,
        appraisal_goal_id: int,
        appraisal_goal_data: AppraisalGoalUpdate
    ) -> AppraisalGoal:
        """Update an existing appraisal goal with validation."""
        db_appraisal_goal = await self.repository.get_by_id(db, appraisal_goal_id)
        if not db_appraisal_goal:
            raise EntityNotFoundError("Appraisal Goal", appraisal_goal_id)
        
        update_data = appraisal_goal_data.dict(exclude_unset=True)
        
        # Validate ratings if being updated
        for rating_field in ["self_rating", "appraiser_rating"]:
            if rating_field in update_data and update_data[rating_field] is not None:
                if not (1 <= update_data[rating_field] <= 5):
                    raise ValidationError(f"{rating_field} must be between 1 and 5")
        
        return await self.repository.update(db, db_appraisal_goal, update_data)
    
    async def get_goals_by_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> List[AppraisalGoal]:
        """Get all goals for an appraisal."""
        return await self.repository.get_by_appraisal(
            db, appraisal_id, load_relationships=True
        )
    
    async def get_appraisal_goal_by_goal(
        self,
        db: AsyncSession,
        goal_id: int
    ) -> Optional[AppraisalGoal]:
        """Get appraisal goal by goal ID."""
        return await self.repository.get_by_goal(
            db, goal_id, load_relationships=True
        )
    
    async def get_goals_with_ratings(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> List[AppraisalGoal]:
        """Get goals that have ratings for an appraisal."""
        return await self.repository.get_goals_with_ratings(
            db, appraisal_id, load_relationships=True
        )
    
    async def delete_appraisal_goal(
        self,
        db: AsyncSession,
        appraisal_goal_id: int
    ) -> bool:
        """Delete appraisal goal by ID."""
        return await self.repository.delete(db, appraisal_goal_id)
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: AppraisalGoalCreate) -> AppraisalGoal:
        """Backward compatibility method for create_appraisal_goal."""
        return await self.create_appraisal_goal(
            db, 
            appraisal_id=obj_in.appraisal_id,
            goal_id=obj_in.goal_id,
            target_value=obj_in.target_value,
            weight=obj_in.weight
        )
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> AppraisalGoal:
        """Backward compatibility method - get by ID or raise 404."""
        appraisal_goal = await self.repository.get_by_id(db, entity_id, load_relationships=True)
        if not appraisal_goal:
            raise EntityNotFoundError("AppraisalGoal", entity_id)
        return appraisal_goal
    
    async def update(self, db: AsyncSession, *, db_obj: AppraisalGoal, obj_in: AppraisalGoalUpdate) -> AppraisalGoal:
        """Backward compatibility method for update."""
        return await self.update_appraisal_goal(
            db,
            appraisal_goal_id=db_obj.appraisal_goal_id,
            appraisal_goal_data=obj_in
        )
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_appraisal_goal(db, entity_id)
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[AppraisalGoal]:
        """Get multiple appraisal goals - backward compatibility."""
        return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: AppraisalGoalCreate) -> AppraisalGoal:
        """Backward compatibility method for create_appraisal_goal."""
        return await self.create_appraisal_goal(db, appraisal_goal_data=obj_in)
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> AppraisalGoal:
        """Backward compatibility method - get by ID or raise 404."""
        appraisal_goal = await self.get_appraisal_goal_by_id(db, entity_id)
        if not appraisal_goal:
            raise EntityNotFoundError("AppraisalGoal", entity_id)
        return appraisal_goal
    
    async def update(self, db: AsyncSession, *, db_obj: AppraisalGoal, obj_in: AppraisalGoalUpdate) -> AppraisalGoal:
        """Backward compatibility method for update."""
        return await self.update_appraisal_goal(db, appraisal_goal_id=db_obj.appraisal_goal_id, goal_data=obj_in)
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_appraisal_goal(db, entity_id)
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[AppraisalGoal]:
        """Get multiple appraisal goals - backward compatibility."""
        return await self.repository.get_multi(db, skip=skip, limit=limit, load_relationships=True)