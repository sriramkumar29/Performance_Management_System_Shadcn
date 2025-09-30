from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.database import get_db
from app.models.appraisal_type import AppraisalType, AppraisalRange
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

from app.routers.auth import get_current_user
from app.constants import (
    APPRAISAL_TYPE_NOT_FOUND,
    APPRAISAL_RANGE_NOT_FOUND
)

router = APIRouter(dependencies=[Depends(get_current_user)])


appraisal_type_service = AppraisalTypeService()
appraisal_range_service = AppraisalRangeService()


# Appraisal Types endpoints
@router.post("/", response_model=AppraisalTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_type(
    appraisal_type: AppraisalTypeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal type."""
    db_appraisal_type = await appraisal_type_service.create(db, appraisal_type)
    return db_appraisal_type


@router.get("/", response_model=List[AppraisalTypeResponse])
async def read_appraisal_types(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal types."""
    return await appraisal_type_service.get_all(db, skip, limit)


# Appraisal Ranges endpoints - Define before parameterized routes
@router.post("/ranges", response_model=AppraisalRangeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_range(
    appraisal_range: AppraisalRangeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal range."""

    # Check if appraisal type exists
    await appraisal_type_service.get_by_id(db, appraisal_range.appraisal_type_id)

    # Create new appraisal range
    return await appraisal_range_service.create(db, appraisal_range)


@router.get("/ranges", response_model=List[AppraisalRangeResponse])
async def read_appraisal_ranges(
    appraisal_type_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal ranges, optionally filtered by appraisal type."""

    return await appraisal_range_service.get_all(db, appraisal_type_id, skip, limit)


@router.get("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def read_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal range by ID."""
    
    return await appraisal_range_service.get_by_id(db, range_id)


@router.put("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def update_appraisal_range(
    range_id: int,
    appraisal_range: AppraisalRangeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal range."""

    return await appraisal_range_service.update(db, range_id, appraisal_range)
    

@router.delete("/ranges/{range_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal range."""

    return await appraisal_range_service.delete(db, range_id)


# Appraisal Types parameterized endpoints - Define after specific routes
@router.get("/{type_id}", response_model=AppraisalTypeWithRanges)
async def read_appraisal_type(
    type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal type by ID with its ranges."""
    
    return await appraisal_type_service.get_by_id(db, type_id)


@router.put("/{type_id}", response_model=AppraisalTypeResponse)
async def update_appraisal_type(
    type_id: int,
    appraisal_type: AppraisalTypeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal type."""
    
    return await appraisal_type_service.update(db, type_id, appraisal_type)


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_type(
    type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal type."""

    return await appraisal_type_service.delete(db, type_id)


# Appraisal Ranges endpoints
@router.post("/ranges", response_model=AppraisalRangeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_range(
    appraisal_range: AppraisalRangeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal range."""

    return await appraisal_range_service.create(db, appraisal_range)


@router.get("/ranges", response_model=List[AppraisalRangeResponse])
async def read_appraisal_ranges(
    appraisal_type_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal ranges, optionally filtered by appraisal type."""
    
    return await appraisal_range_service.get_all(db, appraisal_type_id, skip, limit)
    

@router.get("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def read_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal range by ID."""
    return await appraisal_range_service.get_by_id(db, range_id)


@router.put("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def update_appraisal_range(
    range_id: int,
    appraisal_range: AppraisalRangeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal range."""
    return await appraisal_range_service.update(db, range_id, appraisal_range)


@router.delete("/ranges/{range_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal range."""
    return await appraisal_range_service.delete(db, range_id)
