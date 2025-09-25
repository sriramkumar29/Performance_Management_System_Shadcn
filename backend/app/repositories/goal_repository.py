"""
Goal repository for the Performance Management System.

This module provides data access operations for goal-related entities
including goals, goal templates, categories, and appraisal goals.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import and_, or_, func, desc

from app.models.goal import Goal, GoalTemplate, Category, AppraisalGoal
from app.schemas.goal import GoalCreate, GoalUpdate
from app.repositories.base_repository import BaseRepository


class GoalRepository(BaseRepository[Goal, GoalCreate, GoalUpdate]):
    """Repository for goal data access operations."""
    
    def __init__(self):
        super().__init__(Goal)
    
    @property
    def entity_name(self) -> str:
        return "Goal"
    
    @property
    def id_field(self) -> str:
        return "goal_id"
    
    def _add_relationship_loading(self, query):
        """Add goal relationship loading."""
        return query.options(
            selectinload(Goal.template),
            selectinload(Goal.category),
            selectinload(Goal.appraisal_goals)
        )
    
    async def get_by_template(
        self,
        db: AsyncSession,
        template_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Goal]:
        """
        Get goals by template ID.
        
        Args:
            db: Database session
            template_id: Goal template ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of goals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"goal_template_id": template_id},
            load_relationships=load_relationships
        )
    
    async def get_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Goal]:
        """
        Get goals by category ID.
        
        Args:
            db: Database session
            category_id: Category ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of goals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"category_id": category_id},
            load_relationships=load_relationships
        )
    
    async def get_by_importance(
        self,
        db: AsyncSession,
        importance: str,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Goal]:
        """
        Get goals by importance level.
        
        Args:
            db: Database session
            importance: Importance level (High/Medium/Low)
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of goals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"goal_importance": importance},
            load_relationships=load_relationships
        )
    
    async def search_goals(
        self,
        db: AsyncSession,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Goal]:
        """
        Search goals by title or description.
        
        Args:
            db: Database session
            search_term: Search term
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of matching goals
        """
        query = select(Goal).where(
            or_(
                Goal.goal_title.ilike(f"%{search_term}%"),
                Goal.goal_description.ilike(f"%{search_term}%")
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_goals_by_filters(
        self,
        db: AsyncSession,
        category_id: Optional[int] = None,
        template_id: Optional[int] = None,
        importance: Optional[str] = None,
        min_weightage: Optional[int] = None,
        max_weightage: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Goal]:
        """
        Get goals with multiple filters.
        
        Args:
            db: Database session
            category_id: Filter by category
            template_id: Filter by template
            importance: Filter by importance
            min_weightage: Minimum weightage
            max_weightage: Maximum weightage
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of filtered goals
        """
        query = select(Goal)
        
        if category_id:
            query = query.where(Goal.category_id == category_id)
        
        if template_id:
            query = query.where(Goal.goal_template_id == template_id)
        
        if importance:
            query = query.where(Goal.goal_importance == importance)
        
        if min_weightage is not None:
            query = query.where(Goal.goal_weightage >= min_weightage)
        
        if max_weightage is not None:
            query = query.where(Goal.goal_weightage <= max_weightage)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()


class GoalTemplateRepository(BaseRepository[GoalTemplate, dict, dict]):
    """Repository for goal template data access operations."""
    
    def __init__(self):
        super().__init__(GoalTemplate)
    
    @property
    def entity_name(self) -> str:
        return "GoalTemplate"
    
    @property
    def id_field(self) -> str:
        return "temp_id"
    
    def _add_relationship_loading(self, query):
        """Add goal template relationship loading."""
        return query.options(
            selectinload(GoalTemplate.categories),
            selectinload(GoalTemplate.goals)
        )
    
    async def get_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[GoalTemplate]:
        """
        Get goal templates by category.
        
        Args:
            db: Database session
            category_id: Category ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of goal templates
        """
        query = select(GoalTemplate).join(GoalTemplate.categories).where(
            Category.id == category_id
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def search_templates(
        self,
        db: AsyncSession,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[GoalTemplate]:
        """
        Search goal templates by title or description.
        
        Args:
            db: Database session
            search_term: Search term
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of matching goal templates
        """
        query = select(GoalTemplate).where(
            or_(
                GoalTemplate.temp_title.ilike(f"%{search_term}%"),
                GoalTemplate.temp_description.ilike(f"%{search_term}%")
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()


class CategoryRepository(BaseRepository[Category, dict, dict]):
    """Repository for category data access operations."""
    
    def __init__(self):
        super().__init__(Category)
    
    @property
    def entity_name(self) -> str:
        return "Category"
    
    @property
    def id_field(self) -> str:
        return "id"
    
    def _add_relationship_loading(self, query):
        """Add category relationship loading."""
        return query.options(
            selectinload(Category.goal_templates),
            selectinload(Category.goals)
        )
    
    async def get_by_name(
        self,
        db: AsyncSession,
        name: str,
        load_relationships: bool = False
    ) -> Optional[Category]:
        """
        Get category by name.
        
        Args:
            db: Database session
            name: Category name
            load_relationships: Whether to load relationships
            
        Returns:
            Category instance or None
        """
        return await self.get_by_field(
            db=db,
            field_name="name",
            field_value=name,
            load_relationships=load_relationships
        )
    
    async def name_exists(
        self,
        db: AsyncSession,
        name: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if category name already exists.
        
        Args:
            db: Database session
            name: Category name to check
            exclude_id: Category ID to exclude from check
            
        Returns:
            True if name exists, False otherwise
        """
        query = select(func.count()).select_from(Category).where(
            Category.name == name
        )
        
        if exclude_id:
            query = query.where(Category.id != exclude_id)
        
        result = await db.execute(query)
        return result.scalar() > 0


class AppraisalGoalRepository(BaseRepository[AppraisalGoal, dict, dict]):
    """Repository for appraisal goal data access operations."""
    
    def __init__(self):
        super().__init__(AppraisalGoal)
    
    @property
    def entity_name(self) -> str:
        return "AppraisalGoal"
    
    @property
    def id_field(self) -> str:
        return "id"
    
    def _add_relationship_loading(self, query):
        """Add appraisal goal relationship loading."""
        return query.options(
            selectinload(AppraisalGoal.appraisal),
            selectinload(AppraisalGoal.goal)
        )
    
    async def get_by_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        load_relationships: bool = False
    ) -> List[AppraisalGoal]:
        """
        Get appraisal goals by appraisal ID.
        
        Args:
            db: Database session
            appraisal_id: Appraisal ID
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisal goals
        """
        query = select(AppraisalGoal).where(
            AppraisalGoal.appraisal_id == appraisal_id
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_by_goal(
        self,
        db: AsyncSession,
        goal_id: int,
        load_relationships: bool = False
    ) -> Optional[AppraisalGoal]:
        """
        Get appraisal goal by goal ID.
        
        Args:
            db: Database session
            goal_id: Goal ID
            load_relationships: Whether to load relationships
            
        Returns:
            AppraisalGoal instance or None
        """
        query = select(AppraisalGoal).where(
            AppraisalGoal.goal_id == goal_id
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def exists_for_goal(
        self,
        db: AsyncSession,
        goal_id: int
    ) -> bool:
        """
        Check if appraisal goal exists for a goal.
        
        Args:
            db: Database session
            goal_id: Goal ID
            
        Returns:
            True if appraisal goal exists
        """
        query = select(func.count()).select_from(AppraisalGoal).where(
            AppraisalGoal.goal_id == goal_id
        )
        result = await db.execute(query)
        return result.scalar() > 0
    
    async def get_goals_with_ratings(
        self,
        db: AsyncSession,
        appraisal_id: int,
        load_relationships: bool = False
    ) -> List[AppraisalGoal]:
        """
        Get appraisal goals that have ratings.
        
        Args:
            db: Database session
            appraisal_id: Appraisal ID
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisal goals with ratings
        """
        query = select(AppraisalGoal).where(
            and_(
                AppraisalGoal.appraisal_id == appraisal_id,
                or_(
                    AppraisalGoal.self_rating.isnot(None),
                    AppraisalGoal.appraiser_rating.isnot(None)
                )
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_goal_by_id(
        self,
        db: AsyncSession,
        goal_id: int
    ) -> Optional[Goal]:
        """Get goal by ID (helper method for validation)."""
        query = select(Goal).where(Goal.goal_id == goal_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def goal_exists_in_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> bool:
        """Check if a goal exists in an appraisal."""
        query = select(func.count()).select_from(AppraisalGoal).where(
            and_(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
        result = await db.execute(query)
        return result.scalar() > 0
    
    async def add_goal_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> AppraisalGoal:
        """Add a goal to an appraisal if not already exists."""
        if not await self.goal_exists_in_appraisal(db, appraisal_id, goal_id):
            appraisal_goal = AppraisalGoal(
                appraisal_id=appraisal_id,
                goal_id=goal_id
            )
            db.add(appraisal_goal)
            await db.flush()
            return appraisal_goal
        else:
            query = select(AppraisalGoal).where(
                and_(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
            result = await db.execute(query)
            return result.scalar_one()
    
    async def remove_goal_from_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> bool:
        """Remove a goal from an appraisal."""
        query = select(AppraisalGoal).where(
            and_(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
        result = await db.execute(query)
        appraisal_goal = result.scalar_one_or_none()
        
        if appraisal_goal:
            await db.delete(appraisal_goal)
            return True
        return False