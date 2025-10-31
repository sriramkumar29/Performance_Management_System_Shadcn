"""
Goal service for the Performance Management System.

This module provides business logic for goal and goal template management
with proper validation and relationship handling.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal, GoalTemplate, Category, AppraisalGoal
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
from app.exceptions.domain_exceptions import (
    BaseRepositoryException, GoalServiceError, GoalAlreadyExistsError,
    InvalidGoalStatusError, UnauthorizedActionError, 
    EntityNotFoundError as DomainEntityNotFoundError,
    ValidationError as DomainValidationError
)
from app.utils.logger import (
    get_logger, log_execution_time, log_exception, sanitize_log_data,
    log_business_operation, build_log_context
)


class GoalService(BaseService[Goal, GoalCreate, GoalUpdate]):
    """Service class for goal operations."""
    
    def __init__(self):
        super().__init__(Goal)
        self.repository = GoalRepository()
        self.logger = get_logger(f"app.services.{self.__class__.__name__}")
        self.logger.debug("GoalService initialized successfully")
    
    @property
    def entity_name(self) -> str:
        return "Goal"
    
    @property
    def id_field(self) -> str:
        return "goal_id"
    
    def _user_can_create_goals_for_others(self, user: Any) -> bool:
        """
        Check if user has permission to create goals for other employees.
        
        Args:
            user: User object
            
        Returns:
            bool: True if user can create goals for others
        """
        # Business rule: Only managers and admins can create goals for others
        if hasattr(user, 'role'):
            return user.role in ['manager', 'admin', 'hr']
        return False
    
    async def _check_duplicate_goal(self, db: AsyncSession, employee_id: int, title: str) -> Optional[Goal]:
        """
        Check if a goal with the same title already exists for the employee.
        
        Args:
            db: Database session
            employee_id: Employee ID
            title: Goal title
            
        Returns:
            Optional[Goal]: Existing goal if found
        """
        try:
            # This would typically use a repository method to check for duplicates
            # For now, return None (no duplicate found)
            return None
        except Exception as e:
            self.logger.error(f"Error checking for duplicate goal: {str(e)}")
            return None
    
    @log_execution_time(include_args=True)
    @log_exception()
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: GoalCreate,
        current_user: Optional[Any] = None
    ) -> Goal:
        """
        Create a new goal with business rule validation.
        
        Args:
            db: Database session
            obj_in: Goal creation data
            current_user: Current user creating the goal
            
        Returns:
            Goal: Created goal
            
        Raises:
            GoalAlreadyExistsError: If goal already exists for employee
            UnauthorizedActionError: If user not authorized
            ValidationError: If data validation fails
        """
        user_id = getattr(current_user, 'emp_id', None) if current_user else None
        context = build_log_context(user_id=str(user_id) if user_id else None)
        
        self.logger.info(f"{context}BUSINESS_ACTION: Creating goal - Title: {sanitize_log_data(obj_in.goal_title)}")
        
        try:
            # Note: Goals are created independently and associated with employees through appraisals
            # No direct employee validation needed at goal creation time
            
            # Convert Pydantic model to dict
            goal_data = obj_in.model_dump()
            self.logger.debug(f"{context}Goal data prepared: {sanitize_log_data(goal_data)}")
            
            # Apply business logic hooks
            goal_data = await self.before_create(db, goal_data)
            
            # Extract category_ids if provided (new API)
            category_ids = None
            if isinstance(goal_data, dict):
                category_ids = goal_data.pop("category_ids", None)

            # Use repository to create (new helper will persist associations)
            if category_ids is not None:
                db_goal = await self.repository.create_with_categories(db, obj_data=goal_data, category_ids=category_ids)
            else:
                db_goal = await self.repository.create(db, obj_data=goal_data)

            # Apply after-create hook
            db_goal = await self.after_create(db, db_goal, goal_data)
            
            # Log successful business operation
            log_business_operation("CREATE", "Goal", db_goal.goal_id, user_id=str(user_id) if user_id else None, logger=self.logger)
            self.logger.info(f"{context}BUSINESS_SUCCESS: Goal created - ID: {db_goal.goal_id}, Title: {sanitize_log_data(obj_in.goal_title)}")
            
            return db_goal
            
        except (GoalAlreadyExistsError, UnauthorizedActionError, DomainValidationError):
            # Re-raise business exceptions
            raise
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to create goal - {str(e)}")
            raise GoalServiceError(f"Failed to create goal: {str(e)}")
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Goal creation failed - {str(e)}")
            raise GoalServiceError(f"Unexpected error creating goal: {str(e)}")
    
    @log_execution_time()
    @log_exception()
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Goal:
        """Get goal by ID or raise 404 error."""
        self.logger.info(f"Fetching goal with ID: {entity_id}")
        
        try:
            goal = await self.repository.get_by_id(db, entity_id, load_relationships=load_relationships)
            if not goal:
                self.logger.warning(f"Goal with ID {entity_id} not found")
                raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
            
            self.logger.info(f"Successfully retrieved goal with ID: {entity_id}")
            return goal
            
        except EntityNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error fetching goal with ID {entity_id}: {str(e)}")
            raise
    
    @log_execution_time()
    @log_exception()
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
        self.logger.info(f"Fetching multiple goals - skip: {skip}, limit: {limit}")
        
        try:
            goals = await self.repository.get_multi(
                db,
                skip=skip,
                limit=limit,
                filters=filters,
                order_by=order_by
            )
            
            self.logger.info(f"Successfully retrieved {len(goals)} goals")
            return goals
            
        except Exception as e:
            self.logger.error(f"Error fetching multiple goals: {str(e)}")
            raise
    
    @log_execution_time()
    @log_exception()
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: Goal,
        obj_in: GoalUpdate
    ) -> Goal:
        """Update a goal with the provided data."""
        goal_id = getattr(db_obj, self.id_field)
        self.logger.info(f"Updating goal with ID: {goal_id}")
        
        try:
            # Convert Pydantic model to dict, excluding unset values
            update_data = obj_in.model_dump(exclude_unset=True)
            self.logger.debug(f"Update data: {sanitize_log_data(update_data)}")

            # Extract category_ids if present
            category_ids = None
            if isinstance(update_data, dict):
                category_ids = update_data.pop("category_ids", None)

            # Apply business logic hooks
            update_data = await self.before_update(db, db_obj, update_data)

            # Use repository to update basic fields
            updated_goal = await self.repository.update(db, db_obj=db_obj, obj_data=update_data)

            # Update categories association if requested
            if category_ids is not None:
                await self.repository.update_categories(db, updated_goal, category_ids=category_ids)

            # Apply after-update hook
            updated_goal = await self.after_update(db, updated_goal, db_obj, update_data)
            
            self.logger.info(f"Successfully updated goal with ID: {goal_id}")
            return updated_goal
            
        except Exception as e:
            self.logger.error(f"Failed to update goal with ID {goal_id}: {str(e)}")
            raise


class GoalTemplateService(BaseService[GoalTemplate, GoalTemplateCreate, GoalTemplateUpdate]):
    """Service class for goal template operations."""
    
    def __init__(self):
        super().__init__(GoalTemplate)
        from app.repositories.goal_template_repository import GoalTemplateRepository
        self.repository = GoalTemplateRepository()
        self.logger = get_logger(f"app.services.{self.__class__.__name__}")
        self.logger.debug("GoalTemplateService initialized successfully")
    
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
        """Get goal template by ID or raise 404 error with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by ID: {entity_id}")
        
        try:
            template = await self.repository.get_by_id(db, entity_id, load_relationships=load_relationships)
            if not template:
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {self.entity_name} with ID {entity_id} not found")
                raise DomainEntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with ID: {entity_id}")
            return template
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            raise GoalServiceError(f"Failed to retrieve {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by ID {entity_id} - {str(e)}")
            raise GoalServiceError(f"Unexpected error retrieving {self.entity_name}")

    @log_execution_time()
    @log_exception()
    async def get_goal_template(self, db: AsyncSession, skip: int, limit: int) -> List[GoalTemplate]:
        """Get multiple goal templates with pagination."""
        self.logger.info(f"Fetching goal templates - skip: {skip}, limit: {limit}")
        
        try:
            templates = await self.repository.get_goal_template(db, skip, limit)
            self.logger.info(f"Successfully retrieved {len(templates)} goal templates")
            return templates
            
        except Exception as e:
            self.logger.error(f"Error fetching goal templates: {str(e)}")
            raise
    
    async def get_template_with_categories(
        self,
        db: AsyncSession,
        template_id: int
    ) -> GoalTemplate:
        """Get a goal template with categories loaded with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} with categories - ID: {template_id}")
        
        try:
            template = await self.repository.get_with_categories(db, template_id)
            
            if not template:
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {self.entity_name} with ID {template_id} not found")
                raise DomainEntityNotFoundError(f"{self.entity_name} with ID {template_id} not found")
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with categories - ID: {template_id}")
            return template
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            raise GoalServiceError(f"Failed to retrieve {self.entity_name} with categories: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} with categories by ID {template_id} - {str(e)}")
            raise GoalServiceError(f"Unexpected error retrieving {self.entity_name} with categories")

    @log_execution_time()
    async def get_templates_by_role(
        self,
        db: AsyncSession,
        role_id: int
    ) -> List[GoalTemplate]:
        """Get all goal templates for a specific role (via headers)."""
        context = build_log_context()

        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} templates by role - Role ID: {role_id}")

        try:
            templates = await self.repository.get_by_role_id(db, role_id)
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(templates)} templates for role {role_id}")
            return templates

        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get templates for role {role_id} - {str(e)}")
            raise GoalServiceError(f"Unexpected error retrieving templates for role {role_id}")
    
    async def create_template_with_categories(
        self,
        db: AsyncSession,
        *,
        template_data: GoalTemplateCreate
    ) -> GoalTemplate:
        """Create a new goal template with category relationships with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Create {self.entity_name} with categories - Title: {sanitize_log_data(template_data.temp_title)}")
        
        try:
            # Get or create categories
            categories = []
            for category_name in template_data.categories:
                category = await self.repository.get_or_create_category(db, category_name)
                categories.append(category)
            
            self.logger.debug(f"{context}CATEGORIES_PROCESSED: {len(categories)} categories processed")
            
            # Create new goal template using repository
            template_dict = template_data.model_dump(exclude={"categories"})
            db_template = await self.repository.create_with_categories(
                db,
                template_data=template_dict,
                categories=categories
            )
            
            # Reload with categories for response
            result = await self.get_template_with_categories(db, db_template.temp_id)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Created {self.entity_name} with categories - ID: {db_template.temp_id}")
            return result
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to create {self.entity_name} with categories - {e.message}")
            raise GoalServiceError(f"Failed to create {self.entity_name} with categories: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to create {self.entity_name} with categories - {str(e)}")
            raise GoalServiceError(f"Unexpected error creating {self.entity_name} with categories")
    
    async def update_template_with_categories(
        self,
        db: AsyncSession,
        *,
        template_id: int,
        template_data: GoalTemplateUpdate
    ) -> GoalTemplate:
        """Update a goal template with category relationships with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update {self.entity_name} with categories - ID: {template_id}")
        
        try:
            # Get existing template
            db_template = await self.get_template_with_categories(db, template_id)
            
            # Update basic fields using repository
            update_data = template_data.model_dump(exclude={"categories"}, exclude_unset=True)
            if update_data:
                self.logger.debug(f"{context}BASIC_UPDATE: Updating basic fields - {sanitize_log_data(update_data)}")
                db_template = await self.repository.update(
                    db, 
                    db_obj=db_template, 
                    obj_data=update_data
                )
            
            # Update categories if provided
            if template_data.categories is not None:
                self.logger.debug(f"{context}CATEGORY_UPDATE: Updating categories - {len(template_data.categories)} categories")
                
                # Get or create categories
                categories = []
                for category_name in template_data.categories:
                    category = await self.repository.get_or_create_category(db, category_name)
                    categories.append(category)
                
                # Update template categories using repository
                await self.repository.update_template_categories(db, db_template, categories)
            
            # Reload with categories for response
            result = await self.get_template_with_categories(db, template_id)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated {self.entity_name} with categories - ID: {template_id}")
            return result
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to update {self.entity_name} with categories - {e.message}")
            raise GoalServiceError(f"Failed to update {self.entity_name} with categories: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to update {self.entity_name} with categories ID {template_id} - {str(e)}")
            raise GoalServiceError(f"Unexpected error updating {self.entity_name} with categories")
    





class CategoryService(BaseService[Category, CategoryCreate, None]):
    """Service class for category operations."""
    
    def __init__(self):
        super().__init__(Category)
        self.repository = CategoryRepository()
        self.logger = get_logger(f"app.services.{self.__class__.__name__}")
        self.logger.debug("CategoryService initialized successfully")
    
    @property
    def entity_name(self) -> str:
        return "Category"
    
    @property
    def id_field(self) -> str:
        return "id"

    @log_execution_time()
    @log_exception()
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: CategoryCreate,
        current_user: Optional[Any] = None
    ) -> Category:
        """Create a category (or return existing) using repository helper.

        Uses get_or_create_by_name to make the operation idempotent and
        avoids duplicate entries at the DB level.
        """
        context = build_log_context()

        self.logger.info(f"{context}SERVICE_REQUEST: Create {self.entity_name} - Name: {getattr(obj_in, 'name', None)}")

        try:
            name = getattr(obj_in, "name", None)
            if name is None:
                raise ValueError("Category name is required")

            name = name.strip()
            category = await self.repository.get_or_create_by_name(db, name)

            self.logger.info(f"{context}SERVICE_SUCCESS: Created/returned {self.entity_name} - ID: {getattr(category, 'id', None)}")
            return category

        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to create {self.entity_name} - {e.message}")
            raise GoalServiceError(f"Failed to create {self.entity_name}: {e.message}")

        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to create {self.entity_name} - {str(e)}")
            raise GoalServiceError(f"Unexpected error creating {self.entity_name}: {str(e)}")
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by = None
    ) -> List[Category]:
        """Get multiple categories with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get multiple {self.entity_name}s - skip: {skip}, limit: {limit}")
        
        try:
            categories = await self.repository.get_multi(
                db,
                skip=skip,
                limit=limit,
                filters=filters,
                order_by=order_by
            )
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(categories)} {self.entity_name}s")
            return categories
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to get multiple {self.entity_name}s - {e.message}")
            raise GoalServiceError(f"Failed to retrieve {self.entity_name}s: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get multiple {self.entity_name}s - {str(e)}")
            raise GoalServiceError(f"Unexpected error retrieving {self.entity_name}s")
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Category:
        """Get category by ID or raise 404 error with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by ID: {entity_id}")
        
        try:
            category = await self.repository.get_by_id(db, entity_id)
            if not category:
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {self.entity_name} with ID {entity_id} not found")
                raise DomainEntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with ID: {entity_id}")
            return category
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            raise GoalServiceError(f"Failed to retrieve {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by ID {entity_id} - {str(e)}")
            raise GoalServiceError(f"Unexpected error retrieving {self.entity_name}")


class AppraisalGoalService(BaseService[AppraisalGoal, AppraisalGoalCreate, AppraisalGoalUpdate]):
    """Service class for appraisal goal operations."""
    
    def __init__(self):
        super().__init__(AppraisalGoal)
        self.repository = AppraisalGoalRepository()
        self.logger = get_logger(f"app.services.{self.__class__.__name__}")
        self.logger.debug("AppraisalGoalService initialized successfully")
    
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
        """Create a new appraisal goal with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Create {self.entity_name} - {sanitize_log_data(obj_in.model_dump())}")
        
        try:
            # Convert Pydantic model to dict
            appraisal_goal_data = obj_in.model_dump()
            
            # Apply business logic hooks
            appraisal_goal_data = await self.before_create(db, appraisal_goal_data)
            
            # Use repository to create
            db_appraisal_goal = await self.repository.create(db, obj_data=appraisal_goal_data)
            
            # Apply after-create hook
            db_appraisal_goal = await self.after_create(db, db_appraisal_goal, appraisal_goal_data)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Created {self.entity_name} with ID: {getattr(db_appraisal_goal, self.id_field)}")
            return db_appraisal_goal
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to create {self.entity_name} - {e.message}")
            raise GoalServiceError(f"Failed to create {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to create {self.entity_name} - {str(e)}")
            raise GoalServiceError(f"Unexpected error creating {self.entity_name}")
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> AppraisalGoal:
        """Get appraisal goal by ID or raise 404 error with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by ID: {entity_id}")
        
        try:
            appraisal_goal = await self.repository.get_by_id(db, entity_id)
            if not appraisal_goal:
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {self.entity_name} with ID {entity_id} not found")
                raise DomainEntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with ID: {entity_id}")
            return appraisal_goal
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            raise GoalServiceError(f"Failed to retrieve {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by ID {entity_id} - {str(e)}")
            raise GoalServiceError(f"Unexpected error retrieving {self.entity_name}")