"""Base service class with common functionality."""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.constants import get_entity_not_found_message

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType], ABC):
    """Base service class providing common CRUD operations."""
    
    def __init__(self, model: type[ModelType]):
        self.model = model
        self._entity_name = model.__name__
    
    async def get_by_id(
        self, 
        db: AsyncSession, 
        entity_id: int,
        relationships: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        """Get entity by ID with optional relationships."""
        query = select(self.model).where(self.model.id == entity_id)
        
        if relationships:
            for rel in relationships:
                query = query.options(selectinload(getattr(self.model, rel)))
        
        result = await db.execute(query)
        return result.scalars().first()
    
    async def get_by_id_or_404(
        self, 
        db: AsyncSession, 
        entity_id: int,
        relationships: Optional[List[str]] = None
    ) -> ModelType:
        """Get entity by ID or raise 404 error."""
        entity = await self.get_by_id(db, entity_id, relationships)
        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_entity_not_found_message(self._entity_name, entity_id)
            )
        return entity
    
    async def get_all(
        self, 
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        relationships: Optional[List[str]] = None
    ) -> List[ModelType]:
        """Get all entities with pagination and filtering."""
        query = select(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
        
        if relationships:
            for rel in relationships:
                query = query.options(selectinload(getattr(self.model, rel)))
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create(
        self, 
        db: AsyncSession, 
        obj_in: CreateSchemaType,
        commit: bool = True
    ) -> ModelType:
        """Create new entity."""
        obj_data = obj_in.model_dump() if hasattr(obj_in, 'model_dump') else obj_in.dict()
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        else:
            await db.flush()
        
        return db_obj
    
    async def update(
        self, 
        db: AsyncSession, 
        db_obj: ModelType, 
        obj_in: UpdateSchemaType,
        commit: bool = True
    ) -> ModelType:
        """Update existing entity."""
        obj_data = obj_in.model_dump(exclude_unset=True) if hasattr(obj_in, 'model_dump') else obj_in.dict(exclude_unset=True)
        
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        db.add(db_obj)
        
        if commit:
            await db.commit()
            await db.refresh(db_obj)
        else:
            await db.flush()
        
        return db_obj
    
    async def delete(
        self, 
        db: AsyncSession, 
        entity_id: int,
        commit: bool = True
    ) -> bool:
        """Delete entity by ID."""
        db_obj = await self.get_by_id_or_404(db, entity_id)
        await db.delete(db_obj)
        
        if commit:
            await db.commit()
        
        return True
    
    @abstractmethod
    async def validate_create(self, db: AsyncSession, obj_in: CreateSchemaType) -> None:
        """Validate data before creating entity."""
        pass
    
    @abstractmethod
    async def validate_update(self, db: AsyncSession, db_obj: ModelType, obj_in: UpdateSchemaType) -> None:
        """Validate data before updating entity."""
        pass