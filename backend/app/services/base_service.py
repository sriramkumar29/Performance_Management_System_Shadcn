"""
Base service class for the Performance Management System.

This module provides a base service class with common database operations
and error handling patterns.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_, or_
from pydantic import BaseModel

from app.exceptions import EntityNotFoundError, DuplicateEntityError, ValidationError

# Type variables for generic service
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(ABC, Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base service class providing common CRUD operations.
    
    This class implements the Repository pattern and provides standard
    database operations with proper error handling.
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
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        """Get entity by ID with optional relationship loading."""
        query = select(self.model).where(getattr(self.model, self.id_field) == entity_id)
        
        if load_relationships:
            for relationship in load_relationships:
                query = query.options(selectinload(getattr(self.model, relationship)))
        
        result = await db.execute(query)
        return result.scalars().first()
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> ModelType:
        """Get entity by ID or raise 404 error."""
        entity = await self.get_by_id(db, entity_id, load_relationships=load_relationships)
        if not entity:
            raise EntityNotFoundError(self.entity_name, entity_id)
        return entity
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[Any]] = None,
        order_by: Optional[Any] = None,
        load_relationships: Optional[List[str]] = None
    ) -> List[ModelType]:
        """Get multiple entities with pagination and filtering."""
        query = select(self.model)
        
        if filters:
            query = query.where(and_(*filters))
        
        if order_by is not None:
            query = query.order_by(order_by)
        
        if load_relationships:
            for relationship in load_relationships:
                query = query.options(selectinload(getattr(self.model, relationship)))
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def count(
        self,
        db: AsyncSession,
        *,
        filters: Optional[List[Any]] = None
    ) -> int:
        """Count entities with optional filtering."""
        query = select(func.count()).select_from(self.model)
        
        if filters:
            query = query.where(and_(*filters))
        
        result = await db.execute(query)
        return result.scalar()
    
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: CreateSchemaType,
        **extra_fields
    ) -> ModelType:
        """Create a new entity."""
        obj_data = obj_in.model_dump() if hasattr(obj_in, 'model_dump') else obj_in.dict()
        obj_data.update(extra_fields)
        
        # Validate unique constraints before creating
        await self._validate_unique_constraints(db, obj_data)
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        
        return db_obj
    
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType
    ) -> ModelType:
        """Update an existing entity."""
        obj_data = obj_in.model_dump(exclude_unset=True) if hasattr(obj_in, 'model_dump') else obj_in.dict(exclude_unset=True)
        
        # Validate unique constraints before updating
        await self._validate_unique_constraints(db, obj_data, exclude_id=getattr(db_obj, self.id_field))
        
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        await db.flush()
        await db.refresh(db_obj)
        
        return db_obj
    
    async def delete(
        self,
        db: AsyncSession,
        *,
        entity_id: int
    ) -> ModelType:
        """Delete an entity by ID."""
        db_obj = await self.get_by_id_or_404(db, entity_id)
        await db.delete(db_obj)
        await db.flush()
        
        return db_obj
    
    async def soft_delete(
        self,
        db: AsyncSession,
        *,
        entity_id: int
    ) -> ModelType:
        """Soft delete an entity (set status to False)."""
        db_obj = await self.get_by_id_or_404(db, entity_id)
        
        if hasattr(db_obj, 'emp_status'):
            db_obj.emp_status = False
        elif hasattr(db_obj, 'status'):
            db_obj.status = False
        else:
            raise ValidationError(f"{self.entity_name} does not support soft delete")
        
        await db.flush()
        await db.refresh(db_obj)
        
        return db_obj
    
    async def exists(
        self,
        db: AsyncSession,
        *,
        filters: List[Any]
    ) -> bool:
        """Check if entity exists with given filters."""
        query = select(self.model).where(and_(*filters))
        result = await db.execute(query)
        return result.scalars().first() is not None
    
    async def _validate_unique_constraints(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any],
        exclude_id: Optional[int] = None
    ) -> None:
        """
        Validate unique constraints. Override in subclasses for specific validations.
        """
        pass
    
    def _build_search_filters(
        self,
        search_term: Optional[str],
        search_fields: List[str]
    ) -> List[Any]:
        """Build search filters for text search across multiple fields."""
        if not search_term or not search_fields:
            return []
        
        search_conditions = []
        for field_name in search_fields:
            if hasattr(self.model, field_name):
                field = getattr(self.model, field_name)
                search_conditions.append(field.ilike(f"%{search_term}%"))
        
        return [or_(*search_conditions)] if search_conditions else []