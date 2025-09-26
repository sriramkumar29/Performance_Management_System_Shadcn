"""
Base repository class for common database operations.

This module provides a generic repository implementation that can be reused
across entities.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_, or_
from pydantic import BaseModel

from app.exceptions import EntityNotFoundError, ValidationError

# Type variables
ModelType = TypeVar("ModelType")


class BaseRepository(ABC, Generic[ModelType]):
    """
    Base repository class providing common CRUD operations.
    
    Handles raw database interactions with SQLAlchemy.
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
        """Return the primary key field name."""
        pass

    async def get_by_id(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        query = select(self.model).where(getattr(self.model, self.id_field) == entity_id)

        if load_relationships:
            for rel in load_relationships:
                query = query.options(selectinload(getattr(self.model, rel)))

        result = await db.execute(query)
        return result.scalars().first()

    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> ModelType:
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
        query = select(self.model)

        if filters:
            query = query.where(and_(*filters))

        if order_by is not None:
            query = query.order_by(order_by)

        if load_relationships:
            for rel in load_relationships:
                query = query.options(selectinload(getattr(self.model, rel)))

        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    async def count(
        self,
        db: AsyncSession,
        *,
        filters: Optional[List[Any]] = None
    ) -> int:
        query = select(func.count()).select_from(self.model)

        if filters:
            query = query.where(and_(*filters))

        result = await db.execute(query)
        return result.scalar()

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_data: Dict[str, Any]
    ) -> ModelType:
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
        obj_data: Dict[str, Any]
    ) -> ModelType:
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
        db_obj: ModelType
    ) -> None:
        await db.delete(db_obj)
        await db.flush()

    async def exists(
        self,
        db: AsyncSession,
        *,
        filters: List[Any]
    ) -> bool:
        query = select(self.model).where(and_(*filters))
        result = await db.execute(query)
        return result.scalars().first() is not None

    def _build_search_filters(
        self,
        search_term: Optional[str],
        search_fields: List[str]
    ) -> List[Any]:
        if not search_term or not search_fields:
            return []
        conditions = []
        for field_name in search_fields:
            if hasattr(self.model, field_name):
                field = getattr(self.model, field_name)
                conditions.append(field.ilike(f"%{search_term}%"))
        return [or_(*conditions)] if conditions else []
