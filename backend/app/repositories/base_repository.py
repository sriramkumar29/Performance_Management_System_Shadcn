"""
Base repository class for the Performance Management System.

This module provides a base repository class with common database operations
following the Repository pattern for data access abstraction.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, and_, or_, delete, update
from pydantic import BaseModel

from app.exceptions import EntityNotFoundError, DuplicateEntityError, ValidationError

# Type variables for generic repository
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(ABC, Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base repository class providing common CRUD operations.
    
    This class abstracts database operations and provides a clean interface
    for data access with proper error handling and type safety.
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
    
    async def get_by_id(
        self,
        db: AsyncSession,
        entity_id: int,
        load_relationships: bool = False
    ) -> Optional[ModelType]:
        """
        Get entity by ID.
        
        Args:
            db: Database session
            entity_id: Entity ID
            load_relationships: Whether to eagerly load relationships
            
        Returns:
            Entity instance or None if not found
        """
        query = select(self.model).where(getattr(self.model, self.id_field) == entity_id)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_field(
        self,
        db: AsyncSession,
        field_name: str,
        field_value: Any,
        load_relationships: bool = False
    ) -> Optional[ModelType]:
        """
        Get entity by specific field.
        
        Args:
            db: Database session
            field_name: Field name to filter by
            field_value: Field value to match
            load_relationships: Whether to eagerly load relationships
            
        Returns:
            Entity instance or None if not found
        """
        query = select(self.model).where(getattr(self.model, field_name) == field_value)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        load_relationships: bool = False
    ) -> List[ModelType]:
        """
        Get multiple entities with pagination and filtering.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of field filters
            load_relationships: Whether to eagerly load relationships
            
        Returns:
            List of entity instances
        """
        query = select(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def count(
        self,
        db: AsyncSession,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Count entities with optional filtering.
        
        Args:
            db: Database session
            filters: Dictionary of field filters
            
        Returns:
            Count of entities
        """
        query = select(func.count()).select_from(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
        
        result = await db.execute(query)
        return result.scalar()
    
    async def create(
        self,
        db: AsyncSession,
        obj_in: Union[CreateSchemaType, Dict[str, Any]],
        commit: bool = True
    ) -> ModelType:
        """
        Create new entity.
        
        Args:
            db: Database session
            obj_in: Data for entity creation
            commit: Whether to commit the transaction
            
        Returns:
            Created entity instance
        """
        if isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = obj_in.dict()
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        
        return db_obj
    
    async def update(
        self,
        db: AsyncSession,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
        commit: bool = True
    ) -> ModelType:
        """
        Update existing entity.
        
        Args:
            db: Database session
            db_obj: Existing entity instance
            obj_in: Data for entity update
            commit: Whether to commit the transaction
            
        Returns:
            Updated entity instance
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        db.add(db_obj)
        
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        
        return db_obj
    
    async def delete(
        self,
        db: AsyncSession,
        entity_id: int,
        commit: bool = True
    ) -> bool:
        """
        Delete entity by ID.
        
        Args:
            db: Database session
            entity_id: Entity ID to delete
            commit: Whether to commit the transaction
            
        Returns:
            True if entity was deleted, False if not found
        """
        result = await db.execute(
            delete(self.model).where(getattr(self.model, self.id_field) == entity_id)
        )
        
        if commit:
            await db.commit()
        
        return result.rowcount > 0
    
    async def bulk_create(
        self,
        db: AsyncSession,
        objects_in: List[Union[CreateSchemaType, Dict[str, Any]]],
        commit: bool = True
    ) -> List[ModelType]:
        """
        Create multiple entities in bulk.
        
        Args:
            db: Database session
            objects_in: List of data for entity creation
            commit: Whether to commit the transaction
            
        Returns:
            List of created entity instances
        """
        db_objects = []
        for obj_in in objects_in:
            if isinstance(obj_in, dict):
                obj_data = obj_in
            else:
                obj_data = obj_in.dict()
            
            db_obj = self.model(**obj_data)
            db_objects.append(db_obj)
        
        db.add_all(db_objects)
        
        if commit:
            await db.commit()
            for db_obj in db_objects:
                await db.refresh(db_obj)
        
        return db_objects
    
    async def exists(
        self,
        db: AsyncSession,
        entity_id: int
    ) -> bool:
        """
        Check if entity exists by ID.
        
        Args:
            db: Database session
            entity_id: Entity ID to check
            
        Returns:
            True if entity exists, False otherwise
        """
        query = select(func.count()).select_from(self.model).where(
            getattr(self.model, self.id_field) == entity_id
        )
        result = await db.execute(query)
        return result.scalar() > 0
    
    def _add_relationship_loading(self, query):
        """
        Add relationship loading to query.
        Override in subclasses to specify relationships to load.
        
        Args:
            query: SQLAlchemy query
            
        Returns:
            Query with relationship loading
        """
        return query