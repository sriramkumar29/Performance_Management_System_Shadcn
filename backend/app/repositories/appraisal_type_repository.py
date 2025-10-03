from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, log_execution_time


class AppraisalTypeRepository(BaseRepository[AppraisalType]):
    """Repository for AppraisalType operations with comprehensive logging."""

    def __init__(self):
        super().__init__(AppraisalType)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Appraisal Type"

    @property
    def id_field(self) -> str:
        return "id"

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, type_id: int) -> Optional[AppraisalType]:
        """Get appraisal type by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_BY_ID: Getting appraisal type by ID - ID: {type_id}")
        
        try:
            result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
            appraisal_type = result.scalars().first()
            
            if appraisal_type:
                self.logger.debug(f"{context}REPO_GET_BY_ID_SUCCESS: Found appraisal type - ID: {type_id}, Name: {appraisal_type.name}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_ID_NOT_FOUND: Appraisal type not found - ID: {type_id}")
                
            return appraisal_type
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal type by ID"
            self.logger.error(f"{context}REPO_GET_BY_ID_ERROR: {error_msg} - ID: {type_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"type_id": type_id, "original_error": str(e)})

    @log_execution_time()
    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[AppraisalType]:
        """Get appraisal type by name with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_BY_NAME: Getting appraisal type by name - Name: {name}")
        
        try:
            result = await db.execute(select(AppraisalType).where(AppraisalType.name == name))
            appraisal_type = result.scalars().first()
            
            if appraisal_type:
                self.logger.debug(f"{context}REPO_GET_BY_NAME_SUCCESS: Found appraisal type - ID: {appraisal_type.id}, Name: {name}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_NAME_NOT_FOUND: Appraisal type not found - Name: {name}")
                
            return appraisal_type
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal type by name"
            self.logger.error(f"{context}REPO_GET_BY_NAME_ERROR: {error_msg} - Name: {name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"name": name, "original_error": str(e)})

    @log_execution_time()
    async def get_all(self, db: AsyncSession, skip: int, limit: int) -> List[AppraisalType]:
        """Get all appraisal types with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_ALL: Getting all appraisal types - Skip: {skip}, Limit: {limit}")
        
        try:
            result = await db.execute(select(AppraisalType).offset(skip).limit(limit))
            types = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_GET_ALL_SUCCESS: Retrieved {len(types)} appraisal types")
            return types
            
        except Exception as e:
            error_msg = f"Error retrieving all appraisal types"
            self.logger.error(f"{context}REPO_GET_ALL_ERROR: {error_msg} - Skip: {skip}, Limit: {limit}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"skip": skip, "limit": limit, "original_error": str(e)})

    @log_execution_time()
    async def create(self, db: AsyncSession, obj: AppraisalType) -> AppraisalType:
        """Create appraisal type with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_CREATE: Creating appraisal type - Name: {obj.name}")
        
        try:
            db.add(obj)
            await db.commit()
            await db.refresh(obj)
            
            self.logger.info(f"{context}REPO_CREATE_SUCCESS: Created appraisal type - ID: {obj.id}, Name: {obj.name}")
            return obj
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error creating appraisal type"
            self.logger.error(f"{context}REPO_CREATE_ERROR: {error_msg} - Name: {obj.name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"name": obj.name, "original_error": str(e)})

    @log_execution_time()
    async def update(self, db: AsyncSession, obj: AppraisalType) -> AppraisalType:
        """Update appraisal type with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_UPDATE: Updating appraisal type - ID: {obj.id}, Name: {obj.name}")
        
        try:
            await db.commit()
            await db.refresh(obj)
            
            self.logger.info(f"{context}REPO_UPDATE_SUCCESS: Updated appraisal type - ID: {obj.id}, Name: {obj.name}")
            return obj
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating appraisal type"
            self.logger.error(f"{context}REPO_UPDATE_ERROR: {error_msg} - ID: {obj.id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"type_id": obj.id, "original_error": str(e)})

    @log_execution_time()
    async def delete(self, db: AsyncSession, obj: AppraisalType):
        """Delete appraisal type with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_DELETE: Deleting appraisal type - ID: {obj.id}, Name: {obj.name}")
        
        try:
            await db.delete(obj)
            await db.commit()
            
            self.logger.info(f"{context}REPO_DELETE_SUCCESS: Deleted appraisal type - ID: {obj.id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error deleting appraisal type"
            self.logger.error(f"{context}REPO_DELETE_ERROR: {error_msg} - ID: {obj.id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"type_id": obj.id, "original_error": str(e)})


class AppraisalRangeRepository:
    """Repository for AppraisalRange operations with comprehensive logging."""

    def __init__(self):
        self.logger = get_logger(__name__)

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, range_id: int) -> Optional[AppraisalRange]:
        """Get appraisal range by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_RANGE_GET_BY_ID: Getting appraisal range by ID - ID: {range_id}")
        
        try:
            result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
            appraisal_range = result.scalars().first()
            
            if appraisal_range:
                self.logger.debug(f"{context}REPO_RANGE_GET_BY_ID_SUCCESS: Found appraisal range - ID: {range_id}, Name: {appraisal_range.name}")
            else:
                self.logger.debug(f"{context}REPO_RANGE_GET_BY_ID_NOT_FOUND: Appraisal range not found - ID: {range_id}")
                
            return appraisal_range
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal range by ID"
            self.logger.error(f"{context}REPO_RANGE_GET_BY_ID_ERROR: {error_msg} - ID: {range_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"range_id": range_id, "original_error": str(e)})

    @log_execution_time()
    async def get_by_name_and_type(self, db: AsyncSession, appraisal_type_id: int, name: str) -> Optional[AppraisalRange]:
        """Get appraisal range by name and type with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_RANGE_GET_BY_NAME_TYPE: Getting appraisal range - Type ID: {appraisal_type_id}, Name: {name}")
        
        try:
            result = await db.execute(
                select(AppraisalRange).where(
                    (AppraisalRange.appraisal_type_id == appraisal_type_id) &
                    (AppraisalRange.name == name)
                )
            )
            appraisal_range = result.scalars().first()
            
            if appraisal_range:
                self.logger.debug(f"{context}REPO_RANGE_GET_BY_NAME_TYPE_SUCCESS: Found appraisal range - ID: {appraisal_range.id}, Type ID: {appraisal_type_id}, Name: {name}")
            else:
                self.logger.debug(f"{context}REPO_RANGE_GET_BY_NAME_TYPE_NOT_FOUND: Appraisal range not found - Type ID: {appraisal_type_id}, Name: {name}")
                
            return appraisal_range
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal range by name and type"
            self.logger.error(f"{context}REPO_RANGE_GET_BY_NAME_TYPE_ERROR: {error_msg} - Type ID: {appraisal_type_id}, Name: {name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_type_id": appraisal_type_id, "name": name, "original_error": str(e)})

    @log_execution_time()
    async def get_all(self, db: AsyncSession, appraisal_type_id: Optional[int], skip: int, limit: int) -> List[AppraisalRange]:
        """Get all appraisal ranges with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_RANGE_GET_ALL: Getting appraisal ranges - Type ID: {appraisal_type_id}, Skip: {skip}, Limit: {limit}")
        
        try:
            query = select(AppraisalRange)
            if appraisal_type_id:
                query = query.where(AppraisalRange.appraisal_type_id == appraisal_type_id)
            result = await db.execute(query.offset(skip).limit(limit))
            ranges = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_RANGE_GET_ALL_SUCCESS: Retrieved {len(ranges)} appraisal ranges - Type ID: {appraisal_type_id}")
            return ranges
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal ranges"
            self.logger.error(f"{context}REPO_RANGE_GET_ALL_ERROR: {error_msg} - Type ID: {appraisal_type_id}, Skip: {skip}, Limit: {limit}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_type_id": appraisal_type_id, "skip": skip, "limit": limit, "original_error": str(e)})

    @log_execution_time()
    async def create(self, db: AsyncSession, obj: AppraisalRange) -> AppraisalRange:
        """Create appraisal range with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_RANGE_CREATE: Creating appraisal range - Type ID: {obj.appraisal_type_id}, Name: {obj.name}")
        
        try:
            db.add(obj)
            await db.commit()
            await db.refresh(obj)
            
            self.logger.info(f"{context}REPO_RANGE_CREATE_SUCCESS: Created appraisal range - ID: {obj.id}, Type ID: {obj.appraisal_type_id}, Name: {obj.name}")
            return obj
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error creating appraisal range"
            self.logger.error(f"{context}REPO_RANGE_CREATE_ERROR: {error_msg} - Type ID: {obj.appraisal_type_id}, Name: {obj.name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_type_id": obj.appraisal_type_id, "name": obj.name, "original_error": str(e)})

    @log_execution_time()
    async def update(self, db: AsyncSession, obj: AppraisalRange) -> AppraisalRange:
        """Update appraisal range with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_RANGE_UPDATE: Updating appraisal range - ID: {obj.id}, Type ID: {obj.appraisal_type_id}, Name: {obj.name}")
        
        try:
            await db.commit()
            await db.refresh(obj)
            
            self.logger.info(f"{context}REPO_RANGE_UPDATE_SUCCESS: Updated appraisal range - ID: {obj.id}, Type ID: {obj.appraisal_type_id}, Name: {obj.name}")
            return obj
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating appraisal range"
            self.logger.error(f"{context}REPO_RANGE_UPDATE_ERROR: {error_msg} - ID: {obj.id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"range_id": obj.id, "original_error": str(e)})

    @log_execution_time()
    async def delete(self, db: AsyncSession, obj: AppraisalRange):
        """Delete appraisal range with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_RANGE_DELETE: Deleting appraisal range - ID: {obj.id}, Type ID: {obj.appraisal_type_id}, Name: {obj.name}")
        
        try:
            await db.delete(obj)
            await db.commit()
            
            self.logger.info(f"{context}REPO_RANGE_DELETE_SUCCESS: Deleted appraisal range - ID: {obj.id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error deleting appraisal range"
            self.logger.error(f"{context}REPO_RANGE_DELETE_ERROR: {error_msg} - ID: {obj.id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"range_id": obj.id, "original_error": str(e)})
