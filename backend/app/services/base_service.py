"""
Base service class for the Performance Management System.

This module provides a base service class with common business logic operations
while delegating database operations to repositories.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.exceptions.custom_exceptions import (
    EntityNotFoundError, DuplicateEntityError, ValidationError,
    BaseServiceException, UnauthorizedActionError, BadRequestError, NotFoundError,
    BaseRepositoryException, BusinessRuleViolationError
)
from app.utils.logger import (
    get_logger, log_execution_time, log_exception, 
    log_business_operation, build_log_context, sanitize_log_data
)

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
        self.logger = get_logger(f"app.services.{self.__class__.__name__}")
        self.logger.debug(f"Initialized {self.__class__.__name__} for model: {model.__name__}")
    
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
        """Get entity by ID or raise 404 error with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by ID: {entity_id}")
        
        try:
            # This method should be overridden by subclasses to use their repository
            raise NotImplementedError("Subclasses should implement this method using their repository")
            
        except NotImplementedError:
            self.logger.error(f"{context}IMPLEMENTATION_ERROR: get_by_id_or_404 not implemented in {self.__class__.__name__}")
            raise
            
        except BaseRepositoryException as e:
            self.logger.warning(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            # Convert repository exception to service exception
            if "not found" in e.message.lower():
                raise BaseServiceException(f"{self.entity_name} with ID {entity_id} not found")
            raise BaseServiceException(f"Failed to retrieve {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by ID {entity_id} - {str(e)}")
            raise BaseServiceException(f"Unexpected error retrieving {self.entity_name}")
    
    async def validate_business_rules(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any],
        exclude_id: Optional[int] = None
    ) -> None:
        """
        Validate business rules with proper logging and error handling.
        This method focuses on business logic validation rather than database constraints.
        """
        context = build_log_context()
        
        self.logger.debug(f"{context}VALIDATION_REQUEST: Validating {self.entity_name} business rules")
        
        try:
            # Base implementation does no validation
            # Subclasses should override this method for specific validations
            self.logger.debug(f"{context}VALIDATION_SUCCESS: No business rules to validate in base class")
            
        except BusinessRuleViolationError as e:
            self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {e.message}")
            raise
            
        except Exception as e:
            self.logger.error(f"{context}VALIDATION_ERROR: Unexpected error during business rule validation - {str(e)}")
            raise BaseServiceException("Business rule validation failed unexpectedly")
    
    async def before_create(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Hook called before creating an entity with proper logging and error handling.
        Can be overridden to modify data or perform additional validations.
        """
        context = build_log_context()
        
        self.logger.info(f"{context}PRE_CREATE_HOOK: Processing before_create for {self.entity_name}")
        
        try:
            await self.validate_business_rules(db, obj_data)
            
            self.logger.debug(f"{context}PRE_CREATE_SUCCESS: before_create hook completed for {self.entity_name}")
            return obj_data
            
        except BusinessRuleViolationError as e:
            self.logger.warning(f"{context}PRE_CREATE_VALIDATION_ERROR: {e.message}")
            raise
            
        except BaseServiceException:
            # Re-raise service exceptions as-is
            raise
            
        except Exception as e:
            self.logger.error(f"{context}PRE_CREATE_ERROR: Unexpected error in before_create hook - {str(e)}")
            raise BaseServiceException("Pre-creation validation failed unexpectedly")
    
    async def after_create(
        self,
        db: AsyncSession,
        created_obj: ModelType,
        original_data: Dict[str, Any]
    ) -> ModelType:
        """
        Hook called after creating an entity with proper logging and error handling.
        Can be overridden to perform additional operations.
        """
        context = build_log_context()
        
        entity_id = getattr(created_obj, self.id_field, "unknown")
        self.logger.info(f"{context}POST_CREATE_HOOK: Processing after_create for {self.entity_name} ID: {entity_id}")
        
        try:
            # Base implementation does nothing
            self.logger.debug(f"{context}POST_CREATE_SUCCESS: after_create hook completed for {self.entity_name} ID: {entity_id}")
            return created_obj
            
        except Exception as e:
            self.logger.error(f"{context}POST_CREATE_ERROR: Unexpected error in after_create hook for {self.entity_name} ID: {entity_id} - {str(e)}")
            raise BaseServiceException("Post-creation operations failed unexpectedly")
    
    async def before_update(
        self,
        db: AsyncSession,
        current_obj: ModelType,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Hook called before updating an entity with proper logging and error handling.
        Can be overridden to modify data or perform additional validations.
        """
        context = build_log_context()
        
        entity_id = getattr(current_obj, self.id_field)
        self.logger.info(f"{context}PRE_UPDATE_HOOK: Processing before_update for {self.entity_name} ID: {entity_id}")
        
        try:
            await self.validate_business_rules(db, update_data, exclude_id=entity_id)
            
            self.logger.debug(f"{context}PRE_UPDATE_SUCCESS: before_update hook completed for {self.entity_name} ID: {entity_id}")
            return update_data
            
        except BusinessRuleViolationError as e:
            self.logger.warning(f"{context}PRE_UPDATE_VALIDATION_ERROR: {e.message} for {self.entity_name} ID: {entity_id}")
            raise
            
        except BaseServiceException:
            # Re-raise service exceptions as-is
            raise
            
        except Exception as e:
            self.logger.error(f"{context}PRE_UPDATE_ERROR: Unexpected error in before_update hook for {self.entity_name} ID: {entity_id} - {str(e)}")
            raise BaseServiceException("Pre-update validation failed unexpectedly")
    
    async def after_update(
        self,
        db: AsyncSession,
        updated_obj: ModelType,
        original_obj: ModelType,
        update_data: Dict[str, Any]
    ) -> ModelType:
        """
        Hook called after updating an entity with proper logging and error handling.
        Can be overridden to perform additional operations.
        """
        context = build_log_context()
        
        entity_id = getattr(updated_obj, self.id_field, "unknown")
        self.logger.info(f"{context}POST_UPDATE_HOOK: Processing after_update for {self.entity_name} ID: {entity_id}")
        
        try:
            # Base implementation does nothing
            self.logger.debug(f"{context}POST_UPDATE_SUCCESS: after_update hook completed for {self.entity_name} ID: {entity_id}")
            return updated_obj
            
        except Exception as e:
            self.logger.error(f"{context}POST_UPDATE_ERROR: Unexpected error in after_update hook for {self.entity_name} ID: {entity_id} - {str(e)}")
            raise BaseServiceException("Post-update operations failed unexpectedly")
    
    async def before_delete(
        self,
        db: AsyncSession,
        obj_to_delete: ModelType
    ) -> None:
        """
        Hook called before deleting an entity with proper logging and error handling.
        Can be overridden to perform validation or cleanup.
        """
        context = build_log_context()
        
        entity_id = getattr(obj_to_delete, self.id_field, "unknown")
        self.logger.info(f"{context}PRE_DELETE_HOOK: Processing before_delete for {self.entity_name} ID: {entity_id}")
        
        try:
            # Base implementation does nothing
            self.logger.debug(f"{context}PRE_DELETE_SUCCESS: before_delete hook completed for {self.entity_name} ID: {entity_id}")
            
        except BusinessRuleViolationError as e:
            self.logger.warning(f"{context}PRE_DELETE_VALIDATION_ERROR: {e.message} for {self.entity_name} ID: {entity_id}")
            raise
            
        except Exception as e:
            self.logger.error(f"{context}PRE_DELETE_ERROR: Unexpected error in before_delete hook for {self.entity_name} ID: {entity_id} - {str(e)}")
            raise BaseServiceException("Pre-deletion validation failed unexpectedly")
    
    async def after_delete(
        self,
        db: AsyncSession,
        deleted_obj: ModelType
    ) -> None:
        """
        Hook called after deleting an entity with proper logging and error handling.
        Can be overridden to perform cleanup operations.
        """
        context = build_log_context()
        
        entity_id = getattr(deleted_obj, self.id_field, "unknown")
        self.logger.info(f"{context}POST_DELETE_HOOK: Processing after_delete for {self.entity_name} ID: {entity_id}")
        
        try:
            # Base implementation does nothing
            self.logger.debug(f"{context}POST_DELETE_SUCCESS: after_delete hook completed for {self.entity_name} ID: {entity_id}")
            
        except Exception as e:
            self.logger.error(f"{context}POST_DELETE_ERROR: Unexpected error in after_delete hook for {self.entity_name} ID: {entity_id} - {str(e)}")
            raise BaseServiceException("Post-deletion operations failed unexpectedly")
    
    async def delete(
        self,
        db: AsyncSession,
        *,
        entity_id: int
    ) -> None:
        """Delete an entity by ID with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_DELETE_REQUEST: Deleting {self.entity_name} with ID: {entity_id}")
        
        try:
            # Get the entity first
            db_obj = await self.get_by_id_or_404(db, entity_id)
            
            # Apply before-delete hook
            await self.before_delete(db, db_obj)
            
            # Use repository to delete
            await self.repository.delete(db, db_obj=db_obj)
            
            # Apply after-delete hook
            await self.after_delete(db, db_obj)
            
            self.logger.info(f"{context}SERVICE_DELETE_SUCCESS: Successfully deleted {self.entity_name} with ID: {entity_id}")
            
        except BaseServiceException:
            # Re-raise service exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_DELETE_ERROR: {e.__class__.__name__} - {e.message}")
            raise BaseServiceException(f"Failed to delete {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_DELETE_ERROR: Failed to delete {self.entity_name} with ID {entity_id} - {str(e)}")
            raise BaseServiceException(f"Unexpected error deleting {self.entity_name}")