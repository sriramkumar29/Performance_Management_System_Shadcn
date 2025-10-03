"""
Goal template repository for database operations.

This module handles all direct database interactions
for the GoalTemplate entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, insert

from app.models.goal import GoalTemplate, Category, goal_template_categories
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, log_execution_time


class GoalTemplateRepository(BaseRepository[GoalTemplate]):
    """Repository for GoalTemplate database operations with comprehensive logging."""

    def __init__(self):
        super().__init__(GoalTemplate)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Goal Template"

    @property
    def id_field(self) -> str:
        return "temp_id"

    @log_execution_time()
    async def get_goal_template(self, db: AsyncSession, skip: int, limit: int) -> List[GoalTemplate]:
        """Get goal templates with categories with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_GOAL_TEMPLATE: Getting goal templates - Skip: {skip}, Limit: {limit}")
        
        try:
            result = await db.execute(
                select(GoalTemplate)
                .options(selectinload(GoalTemplate.categories))
                .offset(skip)
                .limit(limit)
            )
            templates = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_GET_GOAL_TEMPLATE_SUCCESS: Retrieved {len(templates)} goal templates")
            return templates
            
        except Exception as e:
            error_msg = f"Error retrieving goal templates"
            self.logger.error(f"{context}REPO_GET_GOAL_TEMPLATE_ERROR: {error_msg} - Skip: {skip}, Limit: {limit}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"skip": skip, "limit": limit, "original_error": str(e)})

    @log_execution_time()
    async def get_with_categories(
        self,
        db: AsyncSession,
        template_id: int
    ) -> Optional[GoalTemplate]:
        """Get a goal template with categories loaded with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_WITH_CATEGORIES: Getting goal template with categories - Template ID: {template_id}")
        
        try:
            query = (
                select(GoalTemplate)
                .options(selectinload(GoalTemplate.categories))
                .where(GoalTemplate.temp_id == template_id)
            )
            
            result = await db.execute(query)
            template = result.scalars().first()
            
            if template:
                category_count = len(template.categories) if template.categories else 0
                self.logger.debug(f"{context}REPO_GET_WITH_CATEGORIES_SUCCESS: Found template with {category_count} categories - Template ID: {template_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_WITH_CATEGORIES_NOT_FOUND: Template not found - Template ID: {template_id}")
                
            return template
            
        except Exception as e:
            error_msg = f"Error retrieving goal template with categories"
            self.logger.error(f"{context}REPO_GET_WITH_CATEGORIES_ERROR: {error_msg} - Template ID: {template_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"template_id": template_id, "original_error": str(e)})

    @log_execution_time()
    async def create_with_categories(
        self,
        db: AsyncSession,
        *,
        template_data: dict,
        categories: List[Category]
    ) -> GoalTemplate:
        """Create a new goal template with category relationships with comprehensive logging."""
        context = build_log_context()
        
        template_title = template_data.get("temp_title", "Unknown")
        self.logger.debug(f"{context}REPO_CREATE_WITH_CATEGORIES: Creating goal template with categories - Title: {template_title}, Categories: {len(categories)}")
        
        try:
            db_template = GoalTemplate(
                temp_title=template_data.get("temp_title"),
                temp_description=template_data.get("temp_description"),
                temp_performance_factor=template_data.get("temp_performance_factor"),
                temp_importance=template_data.get("temp_importance"),
                temp_weightage=template_data.get("temp_weightage"),
                categories=categories
            )
            
            db.add(db_template)
            await db.flush()
            await db.refresh(db_template)
            
            self.logger.info(f"{context}REPO_CREATE_WITH_CATEGORIES_SUCCESS: Created goal template with categories - ID: {db_template.temp_id}, Title: {template_title}")
            return db_template
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error creating goal template with categories"
            self.logger.error(f"{context}REPO_CREATE_WITH_CATEGORIES_ERROR: {error_msg} - Title: {template_title}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"template_title": template_title, "categories_count": len(categories), "original_error": str(e)})

    @log_execution_time()
    async def update_template_categories(
        self,
        db: AsyncSession,
        template: GoalTemplate,
        categories: List[Category]
    ) -> None:
        """Update the categories associated with a template with comprehensive logging."""
        context = build_log_context()
        
        template_id = template.temp_id
        self.logger.debug(f"{context}REPO_UPDATE_TEMPLATE_CATEGORIES: Updating template categories - Template ID: {template_id}, New Categories: {len(categories)}")
        
        try:
            # Delete existing associations
            await db.execute(
                delete(goal_template_categories).where(
                    goal_template_categories.c.template_id == template.temp_id
                )
            )
            
            # Insert associations for provided categories
            for category in categories:
                await db.execute(
                    insert(goal_template_categories).values(
                        template_id=template.temp_id,
                        category_id=category.id
                    )
                )
            await db.flush()
            
            self.logger.info(f"{context}REPO_UPDATE_TEMPLATE_CATEGORIES_SUCCESS: Updated template categories - Template ID: {template_id}, Categories: {len(categories)}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating template categories"
            self.logger.error(f"{context}REPO_UPDATE_TEMPLATE_CATEGORIES_ERROR: {error_msg} - Template ID: {template_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"template_id": template_id, "categories_count": len(categories), "original_error": str(e)})

    @log_execution_time()
    async def get_or_create_category(
        self,
        db: AsyncSession,
        category_name: str
    ) -> Category:
        """Get an existing category or create a new one with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_OR_CREATE_CATEGORY: Getting or creating category - Name: {category_name}")
        
        try:
            result = await db.execute(
                select(Category).where(Category.name == category_name)
            )
            category = result.scalars().first()
            
            if not category:
                self.logger.debug(f"{context}REPO_GET_OR_CREATE_CATEGORY_CREATING: Creating new category - Name: {category_name}")
                
                category = Category(name=category_name)
                db.add(category)
                await db.flush()
                await db.refresh(category)
                
                self.logger.info(f"{context}REPO_GET_OR_CREATE_CATEGORY_CREATED: Created new category - ID: {category.id}, Name: {category_name}")
            else:
                self.logger.debug(f"{context}REPO_GET_OR_CREATE_CATEGORY_FOUND: Found existing category - ID: {category.id}, Name: {category_name}")
            
            return category
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error getting or creating category"
            self.logger.error(f"{context}REPO_GET_OR_CREATE_CATEGORY_ERROR: {error_msg} - Name: {category_name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"category_name": category_name, "original_error": str(e)})