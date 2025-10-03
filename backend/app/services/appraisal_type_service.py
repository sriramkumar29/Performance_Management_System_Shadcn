from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging

from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.schemas.appraisal_type import (
    AppraisalTypeCreate, AppraisalTypeUpdate,
    AppraisalRangeCreate, AppraisalRangeUpdate
)
from app.constants import APPRAISAL_TYPE_NOT_FOUND, APPRAISAL_RANGE_NOT_FOUND

from app.repositories.appraisal_type_repository import (
    AppraisalTypeRepository, AppraisalRangeRepository
)
from app.exceptions.custom_exceptions import (
    NotFoundError,
    DuplicateResourceError,
    BadRequestError,
    BaseServiceException
)
from app.utils.logger import log_execution_time, log_exception, build_log_context, sanitize_log_data

class AppraisalTypeService:
    """Service for managing appraisal types with comprehensive logging and error handling."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.appraisal_type_repo = AppraisalTypeRepository()
        self.appraisal_range_repo = AppraisalRangeRepository()

    @log_execution_time()
    async def create(self, db: AsyncSession, payload: AppraisalTypeCreate) -> AppraisalType:
        """Create a new appraisal type with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_TYPE_CREATE_REQUEST: Creating appraisal type - Name: {sanitize_log_data(payload.name)}")
        
        try:
            # Check for existing appraisal type with same name
            existing = await self.appraisal_type_repo.get_by_name(db, payload.name)
            if existing:
                self.logger.warning(f"{context}APPRAISAL_TYPE_CREATE_FAILED: Duplicate name - Name: {sanitize_log_data(payload.name)}")
                raise DuplicateResourceError(f"Appraisal type with name '{payload.name}' already exists")

            # Create new appraisal type
            self.logger.debug(f"{context}APPRAISAL_TYPE_CREATE_DATA: Creating with data - {payload.model_dump()}")
            obj = AppraisalType(**payload.model_dump())
            
            created_type = await self.appraisal_type_repo.create(db, obj)
            
            self.logger.info(f"{context}APPRAISAL_TYPE_CREATE_SUCCESS: Appraisal type created - ID: {created_type.id}, Name: {sanitize_log_data(created_type.name)}")
            return created_type
            
        except DuplicateResourceError as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "create")
            raise e
            
        except Exception as e:
            error_msg = "Failed to create appraisal type due to unexpected error"
            log_exception(self.logger, e, context, "create", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_all(self, db: AsyncSession, skip: int, limit: int) -> List[AppraisalType]:
        """Get all appraisal types with pagination and comprehensive logging."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_TYPE_GET_ALL_REQUEST: Getting appraisal types - Skip: {skip}, Limit: {limit}")
        
        try:
            appraisal_types = await self.appraisal_type_repo.get_all(db, skip, limit)
            
            self.logger.info(f"{context}APPRAISAL_TYPE_GET_ALL_SUCCESS: Retrieved {len(appraisal_types)} appraisal types")
            return appraisal_types
            
        except Exception as e:
            error_msg = "Failed to retrieve appraisal types due to unexpected error"
            log_exception(self.logger, e, context, "get_all", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, type_id: int) -> AppraisalType:
        """Get appraisal type by ID with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_TYPE_GET_BY_ID_REQUEST: Getting appraisal type - ID: {type_id}")
        
        try:
            obj = await self.appraisal_type_repo.get_by_id(db, type_id)
            if not obj:
                self.logger.warning(f"{context}APPRAISAL_TYPE_GET_BY_ID_FAILED: Appraisal type not found - ID: {type_id}")
                raise NotFoundError(APPRAISAL_TYPE_NOT_FOUND)
                
            self.logger.info(f"{context}APPRAISAL_TYPE_GET_BY_ID_SUCCESS: Appraisal type found - ID: {obj.id}, Name: {sanitize_log_data(obj.name)}")
            return obj
            
        except NotFoundError as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "get_by_id")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to retrieve appraisal type {type_id} due to unexpected error"
            log_exception(self.logger, e, context, "get_by_id", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def update(self, db: AsyncSession, type_id: int, payload: AppraisalTypeUpdate) -> AppraisalType:
        """Update appraisal type with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_TYPE_UPDATE_REQUEST: Updating appraisal type - ID: {type_id}")
        
        try:
            obj = await self.get_by_id(db, type_id)

            # Check for name conflicts if name is being updated
            if payload.name and payload.name != obj.name:
                self.logger.debug(f"{context}APPRAISAL_TYPE_UPDATE_NAME_CHECK: Checking name uniqueness - New name: {sanitize_log_data(payload.name)}")
                existing = await self.appraisal_type_repo.get_by_name(db, payload.name)
                if existing:
                    self.logger.warning(f"{context}APPRAISAL_TYPE_UPDATE_FAILED: Duplicate name - Name: {sanitize_log_data(payload.name)}")
                    raise DuplicateResourceError(f"Appraisal type with name '{payload.name}' already exists")

            # Apply updates
            update_data = payload.model_dump(exclude_unset=True)
            self.logger.debug(f"{context}APPRAISAL_TYPE_UPDATE_DATA: Applying updates - {update_data}")
            
            for key, value in update_data.items():
                setattr(obj, key, value)

            updated_obj = await self.appraisal_type_repo.update(db, obj)
            
            self.logger.info(f"{context}APPRAISAL_TYPE_UPDATE_SUCCESS: Appraisal type updated - ID: {updated_obj.id}, Name: {sanitize_log_data(updated_obj.name)}")
            return updated_obj
            
        except (NotFoundError, DuplicateResourceError) as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "update")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to update appraisal type {type_id} due to unexpected error"
            log_exception(self.logger, e, context, "update", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def delete(self, db: AsyncSession, type_id: int):
        """Delete appraisal type with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_TYPE_DELETE_REQUEST: Deleting appraisal type - ID: {type_id}")
        
        try:
            obj = await self.get_by_id(db, type_id)
            
            self.logger.debug(f"{context}APPRAISAL_TYPE_DELETE_CONFIRM: Deleting - ID: {obj.id}, Name: {sanitize_log_data(obj.name)}")
            await self.appraisal_type_repo.delete(db, obj)
            
            self.logger.info(f"{context}APPRAISAL_TYPE_DELETE_SUCCESS: Appraisal type deleted - ID: {type_id}")
            
        except NotFoundError as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "delete")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to delete appraisal type {type_id} due to unexpected error"
            log_exception(self.logger, e, context, "delete", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})


class AppraisalRangeService:
    """Service for managing appraisal ranges with comprehensive logging and error handling."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.appraisal_type_repo = AppraisalTypeRepository()
        self.appraisal_range_repo = AppraisalRangeRepository()

    @log_execution_time()
    async def create(self, db: AsyncSession, payload: AppraisalRangeCreate) -> AppraisalRange:
        """Create a new appraisal range with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_RANGE_CREATE_REQUEST: Creating appraisal range - Name: {sanitize_log_data(payload.name)}, Type ID: {payload.appraisal_type_id}")
        
        try:
            # Validate appraisal type exists
            appraisal_type = await self.appraisal_type_repo.get_by_id(db, payload.appraisal_type_id)
            if not appraisal_type:
                self.logger.warning(f"{context}APPRAISAL_RANGE_CREATE_FAILED: Appraisal type not found - Type ID: {payload.appraisal_type_id}")
                raise NotFoundError(APPRAISAL_TYPE_NOT_FOUND)

            # Validate appraisal type supports ranges
            if not appraisal_type.has_range:
                self.logger.warning(f"{context}APPRAISAL_RANGE_CREATE_FAILED: Appraisal type does not support ranges - Type ID: {payload.appraisal_type_id}")
                raise BadRequestError("This appraisal type does not support ranges")

            # Check for existing range with same name
            existing = await self.appraisal_range_repo.get_by_name_and_type(db, payload.appraisal_type_id, payload.name)
            if existing:
                self.logger.warning(f"{context}APPRAISAL_RANGE_CREATE_FAILED: Duplicate range name - Name: {sanitize_log_data(payload.name)}, Type ID: {payload.appraisal_type_id}")
                raise DuplicateResourceError(f"Range with name '{payload.name}' already exists for this appraisal type")

            # Create new appraisal range
            self.logger.debug(f"{context}APPRAISAL_RANGE_CREATE_DATA: Creating with data - {payload.model_dump()}")
            obj = AppraisalRange(**payload.model_dump())
            
            created_range = await self.appraisal_range_repo.create(db, obj)
            
            self.logger.info(f"{context}APPRAISAL_RANGE_CREATE_SUCCESS: Appraisal range created - ID: {created_range.id}, Name: {sanitize_log_data(created_range.name)}")
            return created_range
            
        except (NotFoundError, BadRequestError, DuplicateResourceError) as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "create")
            raise e
            
        except Exception as e:
            error_msg = "Failed to create appraisal range due to unexpected error"
            log_exception(self.logger, e, context, "create", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_all(self, db: AsyncSession, appraisal_type_id: int, skip: int, limit: int) -> List[AppraisalRange]:
        """Get all appraisal ranges for a type with comprehensive logging."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_RANGE_GET_ALL_REQUEST: Getting ranges - Type ID: {appraisal_type_id}, Skip: {skip}, Limit: {limit}")
        
        try:
            ranges = await self.appraisal_range_repo.get_all(db, appraisal_type_id, skip, limit)
            
            self.logger.info(f"{context}APPRAISAL_RANGE_GET_ALL_SUCCESS: Retrieved {len(ranges)} ranges for type {appraisal_type_id}")
            return ranges
            
        except Exception as e:
            error_msg = f"Failed to retrieve appraisal ranges for type {appraisal_type_id} due to unexpected error"
            log_exception(self.logger, e, context, "get_all", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, range_id: int) -> AppraisalRange:
        """Get appraisal range by ID with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_RANGE_GET_BY_ID_REQUEST: Getting appraisal range - ID: {range_id}")
        
        try:
            obj = await self.appraisal_range_repo.get_by_id(db, range_id)
            if not obj:
                self.logger.warning(f"{context}APPRAISAL_RANGE_GET_BY_ID_FAILED: Appraisal range not found - ID: {range_id}")
                raise NotFoundError(APPRAISAL_RANGE_NOT_FOUND)
                
            self.logger.info(f"{context}APPRAISAL_RANGE_GET_BY_ID_SUCCESS: Appraisal range found - ID: {obj.id}, Name: {sanitize_log_data(obj.name)}")
            return obj
            
        except NotFoundError as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "get_by_id")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to retrieve appraisal range {range_id} due to unexpected error"
            log_exception(self.logger, e, context, "get_by_id", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def update(self, db: AsyncSession, range_id: int, payload: AppraisalRangeUpdate) -> AppraisalRange:
        """Update appraisal range with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_RANGE_UPDATE_REQUEST: Updating appraisal range - ID: {range_id}")
        
        try:
            obj = await self.get_by_id(db, range_id)

            # Check for name conflicts if name is being updated
            if payload.name and payload.name != obj.name:
                self.logger.debug(f"{context}APPRAISAL_RANGE_UPDATE_NAME_CHECK: Checking name uniqueness - New name: {sanitize_log_data(payload.name)}")
                existing = await self.appraisal_range_repo.get_by_name_and_type(db, obj.appraisal_type_id, payload.name)
                if existing:
                    self.logger.warning(f"{context}APPRAISAL_RANGE_UPDATE_FAILED: Duplicate name - Name: {sanitize_log_data(payload.name)}")
                    raise DuplicateResourceError(f"Range with name '{payload.name}' already exists for this appraisal type")

            # Apply updates
            update_data = payload.model_dump(exclude_unset=True)
            self.logger.debug(f"{context}APPRAISAL_RANGE_UPDATE_DATA: Applying updates - {update_data}")
            
            for key, value in update_data.items():
                setattr(obj, key, value)

            updated_obj = await self.appraisal_range_repo.update(db, obj)
            
            self.logger.info(f"{context}APPRAISAL_RANGE_UPDATE_SUCCESS: Appraisal range updated - ID: {updated_obj.id}, Name: {sanitize_log_data(updated_obj.name)}")
            return updated_obj
            
        except (NotFoundError, DuplicateResourceError) as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "update")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to update appraisal range {range_id} due to unexpected error"
            log_exception(self.logger, e, context, "update", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def delete(self, db: AsyncSession, range_id: int):
        """Delete appraisal range with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}APPRAISAL_RANGE_DELETE_REQUEST: Deleting appraisal range - ID: {range_id}")
        
        try:
            obj = await self.get_by_id(db, range_id)
            
            self.logger.debug(f"{context}APPRAISAL_RANGE_DELETE_CONFIRM: Deleting - ID: {obj.id}, Name: {sanitize_log_data(obj.name)}")
            await self.appraisal_range_repo.delete(db, obj)
            
            self.logger.info(f"{context}APPRAISAL_RANGE_DELETE_SUCCESS: Appraisal range deleted - ID: {range_id}")
            
        except NotFoundError as e:
            # Re-raise domain exceptions as-is
            log_exception(self.logger, e, context, "delete")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to delete appraisal range {range_id} due to unexpected error"
            log_exception(self.logger, e, context, "delete", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
