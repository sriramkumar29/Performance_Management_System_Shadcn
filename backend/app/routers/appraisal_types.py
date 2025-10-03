from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.database import get_db
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.models.employee import Employee
from app.services.appraisal_type_service import AppraisalTypeService, AppraisalRangeService
from app.schemas.appraisal_type import (
    AppraisalTypeCreate,
    AppraisalTypeUpdate,
    AppraisalTypeResponse,
    AppraisalTypeWithRanges,
    AppraisalRangeCreate,
    AppraisalRangeUpdate,
    AppraisalRangeResponse
)

from app.routers.auth import get_current_user, get_current_active_user
from app.exceptions.domain_exceptions import BaseDomainException, map_domain_exception_to_http_status
from app.utils.logger import get_logger, build_log_context, sanitize_log_data
from app.constants import (
    APPRAISAL_TYPE_NOT_FOUND,
    APPRAISAL_RANGE_NOT_FOUND
)

router = APIRouter(dependencies=[Depends(get_current_user)])

# Initialize logger
logger = get_logger(__name__)

appraisal_type_service = AppraisalTypeService()
appraisal_range_service = AppraisalRangeService()


# Appraisal Types endpoints
@router.post("/", response_model=AppraisalTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_type(
    appraisal_type: AppraisalTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Create a new appraisal type with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST / - Create appraisal type - Name: {sanitize_log_data(appraisal_type.name)}")
    
    try:
        db_appraisal_type = await appraisal_type_service.create(db, appraisal_type)
        
        logger.info(f"{context}API_SUCCESS: Created appraisal type - ID: {db_appraisal_type.id}")
        return db_appraisal_type
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create appraisal type - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating appraisal type"
            }
        )


@router.get("/", response_model=List[AppraisalTypeResponse])
async def read_appraisal_types(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get all appraisal types with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET / - Get appraisal types - Skip: {skip}, Limit: {limit}")
    
    try:
        appraisal_types = await appraisal_type_service.get_all(db, skip, limit)
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(appraisal_types)} appraisal types")
        return appraisal_types
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get appraisal types - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving appraisal types"
            }
        )


# Appraisal Ranges endpoints - Define before parameterized routes
@router.post("/ranges", response_model=AppraisalRangeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_range(
    appraisal_range: AppraisalRangeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Create a new appraisal range with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /ranges - Create appraisal range - Type ID: {appraisal_range.appraisal_type_id}")
    
    try:
        db_appraisal_range = await appraisal_range_service.create(db, appraisal_range)
        
        logger.info(f"{context}API_SUCCESS: Created appraisal range - ID: {db_appraisal_range.id}")
        return db_appraisal_range
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create appraisal range - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating appraisal range"
            }
        )


@router.get("/ranges", response_model=List[AppraisalRangeResponse])
async def read_appraisal_ranges(
    appraisal_type_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get all appraisal ranges with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /ranges - Get appraisal ranges - Type ID: {appraisal_type_id}, Skip: {skip}, Limit: {limit}")
    
    try:
        ranges = await appraisal_range_service.get_all(db, appraisal_type_id, skip, limit)
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(ranges)} appraisal ranges")
        return ranges
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get appraisal ranges - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving appraisal ranges"
            }
        )


@router.get("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def read_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get an appraisal range by ID with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /ranges/{range_id} - Get appraisal range by ID")
    
    try:
        appraisal_range = await appraisal_range_service.get_by_id(db, range_id)
        
        logger.info(f"{context}API_SUCCESS: Retrieved appraisal range - ID: {range_id}")
        return appraisal_range
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get appraisal range - Range ID: {range_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving appraisal range"
            }
        )


@router.put("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def update_appraisal_range(
    range_id: int,
    appraisal_range: AppraisalRangeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Update an appraisal range with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /ranges/{range_id} - Update appraisal range")
    
    try:
        updated_range = await appraisal_range_service.update(db, range_id, appraisal_range)
        
        logger.info(f"{context}API_SUCCESS: Updated appraisal range - ID: {range_id}")
        return updated_range
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update appraisal range - Range ID: {range_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating appraisal range"
            }
        )
    

@router.delete("/ranges/{range_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Delete an appraisal range with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /ranges/{range_id} - Delete appraisal range")
    
    try:
        await appraisal_range_service.delete(db, range_id)
        
        logger.info(f"{context}API_SUCCESS: Deleted appraisal range - ID: {range_id}")
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to delete appraisal range - Range ID: {range_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while deleting appraisal range"
            }
        )


# Appraisal Types parameterized endpoints - Define after specific routes
@router.get("/{type_id}", response_model=AppraisalTypeWithRanges)
async def read_appraisal_type(
    type_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Get an appraisal type by ID with its ranges and comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /{type_id} - Get appraisal type by ID")
    
    try:
        appraisal_type = await appraisal_type_service.get_by_id(db, type_id)
        
        logger.info(f"{context}API_SUCCESS: Retrieved appraisal type - ID: {type_id}")
        return appraisal_type
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get appraisal type - Type ID: {type_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving appraisal type"
            }
        )


@router.put("/{type_id}", response_model=AppraisalTypeResponse)
async def update_appraisal_type(
    type_id: int,
    appraisal_type: AppraisalTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Update an appraisal type with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /{type_id} - Update appraisal type")
    
    try:
        updated_type = await appraisal_type_service.update(db, type_id, appraisal_type)
        
        logger.info(f"{context}API_SUCCESS: Updated appraisal type - ID: {type_id}")
        return updated_type
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update appraisal type - Type ID: {type_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating appraisal type"
            }
        )


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_type(
    type_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """Delete an appraisal type with comprehensive logging."""
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /{type_id} - Delete appraisal type")
    
    try:
        await appraisal_type_service.delete(db, type_id)
        
        logger.info(f"{context}API_SUCCESS: Deleted appraisal type - ID: {type_id}")
        
    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to delete appraisal type - Type ID: {type_id}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while deleting appraisal type"
            }
        )


