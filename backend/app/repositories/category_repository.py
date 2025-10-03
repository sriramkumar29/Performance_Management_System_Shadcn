"""
Category repository for database operations.

This module handles all direct database interactions
for the Category entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.goal import Category
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, log_execution_time


class CategoryRepository(BaseRepository[Category]):
    """Repository for Category database operations with comprehensive logging."""

    def __init__(self):
        super().__init__(Category)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Category"

    @property
    def id_field(self) -> str:
        return "id"

    @log_execution_time()
    async def get_by_name(
        self,
        db: AsyncSession,
        name: str
    ) -> Optional[Category]:
        """Get category by name with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_BY_NAME: Getting category by name - Name: {name}")
        
        try:
            result = await db.execute(
                select(Category).where(Category.name == name)
            )
            category = result.scalars().first()
            
            if category:
                self.logger.debug(f"{context}REPO_GET_BY_NAME_SUCCESS: Found category - ID: {category.id}, Name: {name}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_NAME_NOT_FOUND: Category not found - Name: {name}")
                
            return category
            
        except Exception as e:
            error_msg = f"Error retrieving category by name"
            self.logger.error(f"{context}REPO_GET_BY_NAME_ERROR: {error_msg} - Name: {name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"name": name, "original_error": str(e)})

    @log_execution_time()
    async def get_or_create_by_name(
        self,
        db: AsyncSession,
        name: str
    ) -> Category:
        """Get category by name or create if it doesn't exist with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_OR_CREATE_BY_NAME: Getting or creating category - Name: {name}")
        
        try:
            category = await self.get_by_name(db, name)
            if not category:
                self.logger.debug(f"{context}REPO_GET_OR_CREATE_BY_NAME_CREATING: Creating new category - Name: {name}")
                
                category = Category(name=name)
                db.add(category)
                await db.flush()
                await db.refresh(category)
                
                self.logger.info(f"{context}REPO_GET_OR_CREATE_BY_NAME_CREATED: Created new category - ID: {category.id}, Name: {name}")
            else:
                self.logger.debug(f"{context}REPO_GET_OR_CREATE_BY_NAME_FOUND: Found existing category - ID: {category.id}, Name: {name}")
                
            return category
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error getting or creating category by name"
            self.logger.error(f"{context}REPO_GET_OR_CREATE_BY_NAME_ERROR: {error_msg} - Name: {name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"name": name, "original_error": str(e)})
    
    @log_execution_time()
    async def get_categories(self, db: AsyncSession) -> List[Category]:
        """Get all categories with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_CATEGORIES: Getting all categories")
        
        try:
            result = await db.execute(select(Category).order_by(Category.name))
            categories = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_GET_CATEGORIES_SUCCESS: Retrieved {len(categories)} categories")
            return categories
            
        except Exception as e:
            error_msg = f"Error retrieving all categories"
            self.logger.error(f"{context}REPO_GET_CATEGORIES_ERROR: {error_msg} - Error: {str(e)}")
            raise RepositoryException(error_msg, details={"original_error": str(e)})