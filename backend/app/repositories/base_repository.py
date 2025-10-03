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
from app.exceptions.domain_exceptions import (
    BaseRepositoryException, DatabaseError, DuplicateEntryError, 
    EntityNotFoundError as DomainEntityNotFoundError, ConstraintViolationError,
    convert_sqlalchemy_error
)
from app.utils.logger import (
    get_database_logger, log_execution_time, log_exception, 
    log_database_operation
)

# Type variables
ModelType = TypeVar("ModelType")


class BaseRepository(ABC, Generic[ModelType]):
    """
    Base repository class providing common CRUD operations.
    
    Handles raw database interactions with SQLAlchemy.
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model
        self.logger = get_database_logger()
        self.logger.debug(f"Repository initialized for model: {model.__name__}")

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

    @log_execution_time()
    async def get_by_id(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        """
        Get entity by ID from database.
        
        Args:
            db: Database session
            entity_id: ID of entity to retrieve
            load_relationships: Relationships to eager load
            
        Returns:
            Optional[ModelType]: Found entity or None
            
        Raises:
            DatabaseError: For database operation errors
        """
        self.logger.debug(f"Querying {self.entity_name} with ID: {entity_id}")
        log_database_operation("READ", self.entity_name, self.logger)
        
        try:
            query = select(self.model).where(getattr(self.model, self.id_field) == entity_id)

            if load_relationships:
                self.logger.debug(f"Loading relationships: {load_relationships}")
                for rel in load_relationships:
                    query = query.options(selectinload(getattr(self.model, rel)))

            result = await db.execute(query)
            entity = result.scalars().first()
            
            if entity:
                self.logger.debug(f"Found {self.entity_name} with ID: {entity_id}")
            else:
                self.logger.debug(f"No {self.entity_name} found with ID: {entity_id}")
                
            return entity
            
        except Exception as e:
            self.logger.error(f"Database error querying {self.entity_name} with ID {entity_id}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> ModelType:
        """
        Get entity by ID or raise domain exception.
        
        Args:
            db: Database session
            entity_id: ID of entity to retrieve
            load_relationships: Relationships to eager load
            
        Returns:
            ModelType: Found entity
            
        Raises:
            EntityNotFoundError: If entity not found
        """
        self.logger.debug(f"Fetching {self.entity_name} with ID: {entity_id}")
        log_database_operation("READ", self.entity_name, self.logger)
        
        try:
            entity = await self.get_by_id(db, entity_id, load_relationships=load_relationships)
            if not entity:
                self.logger.warning(f"{self.entity_name} with ID {entity_id} not found")
                raise DomainEntityNotFoundError(self.entity_name, entity_id)
            
            self.logger.debug(f"Successfully retrieved {self.entity_name} with ID: {entity_id}")
            return entity
            
        except DomainEntityNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error fetching {self.entity_name} with ID {entity_id}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()
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
        """
        Get multiple entities from database with pagination.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Optional query filters
            order_by: Optional ordering
            load_relationships: Relationships to eager load
            
        Returns:
            List[ModelType]: List of found entities
            
        Raises:
            DatabaseError: For database operation errors
        """
        self.logger.debug(f"Querying multiple {self.entity_name} - skip: {skip}, limit: {limit}")
        log_database_operation("READ_MULTI", self.entity_name, self.logger)
        
        try:
            query = select(self.model)

            if filters:
                self.logger.debug(f"Applying {len(filters)} filters")
                query = query.where(and_(*filters))

            if order_by is not None:
                self.logger.debug(f"Applying ordering")
                query = query.order_by(order_by)

            if load_relationships:
                self.logger.debug(f"Loading relationships: {load_relationships}")
                for rel in load_relationships:
                    query = query.options(selectinload(getattr(self.model, rel)))

            query = query.offset(skip).limit(limit)

            result = await db.execute(query)
            entities = result.scalars().all()
            
            self.logger.info(f"Retrieved {len(entities)} {self.entity_name} records")
            return entities
            
        except Exception as e:
            self.logger.error(f"Database error querying multiple {self.entity_name}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()
    async def count(
        self,
        db: AsyncSession,
        *,
        filters: Optional[List[Any]] = None
    ) -> int:
        """
        Count entities in database.
        
        Args:
            db: Database session
            filters: Optional query filters
            
        Returns:
            int: Number of entities matching criteria
            
        Raises:
            DatabaseError: For database operation errors
        """
        self.logger.debug(f"Counting {self.entity_name} records")
        log_database_operation("COUNT", self.entity_name, self.logger)
        
        try:
            query = select(func.count()).select_from(self.model)

            if filters:
                self.logger.debug(f"Applying {len(filters)} filters for count")
                query = query.where(and_(*filters))

            result = await db.execute(query)
            count = result.scalar()
            
            self.logger.debug(f"Found {count} {self.entity_name} records")
            return count
            
        except Exception as e:
            self.logger.error(f"Database error counting {self.entity_name}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_data: Dict[str, Any]
    ) -> ModelType:
        """
        Create a new entity in the database.
        
        Args:
            db: Database session
            obj_data: Data for creating the entity
            
        Returns:
            ModelType: Created entity
            
        Raises:
            DuplicateEntryError: If entity violates unique constraints
            ConstraintViolationError: If entity violates other constraints
            DatabaseError: For other database errors
        """
        self.logger.debug(f"Creating new {self.entity_name}")
        log_database_operation("CREATE", self.entity_name, self.logger)
        
        try:
            db_obj = self.model(**obj_data)
            db.add(db_obj)
            await db.flush()
            await db.refresh(db_obj)
            
            entity_id = getattr(db_obj, self.id_field, "unknown")
            self.logger.info(f"Database record created - {self.entity_name} with ID: {entity_id}")
            
            return db_obj
            
        except Exception as e:
            self.logger.error(f"Failed to create {self.entity_name}: {str(e)}")
            # Convert SQLAlchemy exceptions to domain exceptions
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()  
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_data: Dict[str, Any]
    ) -> ModelType:
        """
        Update an existing entity in the database.
        
        Args:
            db: Database session
            db_obj: Entity to update
            obj_data: Updated data
            
        Returns:
            ModelType: Updated entity
            
        Raises:
            ConstraintViolationError: If update violates constraints
            DatabaseError: For other database errors
        """
        entity_id = getattr(db_obj, self.id_field, "unknown")
        self.logger.debug(f"Updating {self.entity_name} with ID: {entity_id}")
        log_database_operation("UPDATE", self.entity_name, self.logger)
        
        try:
            for field, value in obj_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)

            await db.flush()
            await db.refresh(db_obj)
            
            self.logger.info(f"Database record updated - {self.entity_name} with ID: {entity_id}")
            
            return db_obj
            
        except Exception as e:
            self.logger.error(f"Failed to update {self.entity_name} with ID {entity_id}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()
    async def delete(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType
    ) -> None:
        """
        Delete an entity from database.
        
        Args:
            db: Database session
            db_obj: Entity to delete
            
        Raises:
            DatabaseError: For database operation errors
        """
        entity_id = getattr(db_obj, self.id_field, "unknown")
        self.logger.debug(f"Deleting {self.entity_name} with ID: {entity_id}")
        log_database_operation("DELETE", self.entity_name, self.logger)
        
        try:
            await db.delete(db_obj)
            await db.flush()
            
            self.logger.info(f"Database record deleted - {self.entity_name} with ID: {entity_id}")
            
        except Exception as e:
            self.logger.error(f"Database error deleting {self.entity_name} with ID {entity_id}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

    @log_execution_time()
    async def exists(
        self,
        db: AsyncSession,
        *,
        filters: List[Any]
    ) -> bool:
        """
        Check if entity exists in database.
        
        Args:
            db: Database session
            filters: Query filters to check existence
            
        Returns:
            bool: True if entity exists, False otherwise
            
        Raises:
            DatabaseError: For database operation errors
        """
        self.logger.debug(f"Checking existence of {self.entity_name}")
        log_database_operation("EXISTS", self.entity_name, self.logger)
        
        try:
            query = select(self.model).where(and_(*filters))
            result = await db.execute(query)
            exists = result.scalars().first() is not None
            
            self.logger.debug(f"{self.entity_name} exists: {exists}")
            return exists
            
        except Exception as e:
            self.logger.error(f"Database error checking existence of {self.entity_name}: {str(e)}")
            domain_exception = convert_sqlalchemy_error(e, self.entity_name)
            raise domain_exception

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
