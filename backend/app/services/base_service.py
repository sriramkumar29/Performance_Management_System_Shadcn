"""
Base service class for the Performance Management System.

This module provides a base service class with common business logic operations
while delegating database operations to repositories.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.exceptions import EntityNotFoundError, DuplicateEntityError, ValidationError

# Type variables for generic service
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(ABC, Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base service class providing common business logic operations.
    
    This class focuses on business logic while delegating database operations
    to repositories following the Repository pattern.
    """
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    @property
    @abstractmethod
    def entity_name(self) -> str:
        """Return the human-readable name of the entity."""
        pass
    
    @property
    @abstractmethod
    def id_field(self) -> str:
        """Return the name of the primary key field."""
        pass
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> ModelType:
        """Get entity by ID or raise 404 error. This is a convenience method."""
        # This method should be overridden by subclasses to use their repository
        raise NotImplementedError("Subclasses should implement this method using their repository")
    
    async def validate_business_rules(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any],
        exclude_id: Optional[int] = None
    ) -> None:
        """
        Validate business rules. Override in subclasses for specific validations.
        This method focuses on business logic validation rather than database constraints.
        """
        pass
    
    async def before_create(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Hook called before creating an entity.
        Can be overridden to modify data or perform additional validations.
        """
        await self.validate_business_rules(db, obj_data)
        return obj_data
    
    async def after_create(
        self,
        db: AsyncSession,
        created_obj: ModelType,
        original_data: Dict[str, Any]
    ) -> ModelType:
        """
        Hook called after creating an entity.
        Can be overridden to perform additional operations.
        """
        return created_obj
    
    async def before_update(
        self,
        db: AsyncSession,
        current_obj: ModelType,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Hook called before updating an entity.
        Can be overridden to modify data or perform additional validations.
        """
        entity_id = getattr(current_obj, self.id_field)
        await self.validate_business_rules(db, update_data, exclude_id=entity_id)
        return update_data
    
    async def after_update(
        self,
        db: AsyncSession,
        updated_obj: ModelType,
        original_obj: ModelType,
        update_data: Dict[str, Any]
    ) -> ModelType:
        """
        Hook called after updating an entity.
        Can be overridden to perform additional operations.
        """
        return updated_obj
    
    async def before_delete(
        self,
        db: AsyncSession,
        obj_to_delete: ModelType
    ) -> None:
        """
        Hook called before deleting an entity.
        Can be overridden to perform validation or cleanup.
        """
        pass
    
    async def after_delete(
        self,
        db: AsyncSession,
        deleted_obj: ModelType
    ) -> None:
        """
        Hook called after deleting an entity.
        Can be overridden to perform cleanup operations.
        """
        pass
    
    async def delete(
        self,
        db: AsyncSession,
        *,
        entity_id: int
    ) -> None:
        """Delete an entity by ID."""
        # Get the entity first
        db_obj = await self.get_by_id_or_404(db, entity_id)
        
        # Apply before-delete hook
        await self.before_delete(db, db_obj)
        
        # Use repository to delete
        await self.repository.delete(db, db_obj=db_obj)
        
        # Apply after-delete hook
        await self.after_delete(db, db_obj)