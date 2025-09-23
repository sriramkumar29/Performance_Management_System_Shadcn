from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.database import get_db
from app.models.appraisal_type import AppraisalType, AppraisalRange
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

router = APIRouter(dependencies=[Depends(get_current_user)])

# router = APIRouter()


# Appraisal Types endpoints
@router.post("/", response_model=AppraisalTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_type(
    appraisal_type: AppraisalTypeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal type."""
    
    # Check if name already exists
    result = await db.execute(select(AppraisalType).where(AppraisalType.name == appraisal_type.name))
    existing_type = result.scalars().first()
    
    if existing_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appraisal type with this name already exists"
        )
    
    # Create new appraisal type
    db_appraisal_type = AppraisalType(**appraisal_type.model_dump())
    db.add(db_appraisal_type)
    await db.commit()
    await db.refresh(db_appraisal_type)
    
    return db_appraisal_type


@router.get("/", response_model=List[AppraisalTypeResponse])
async def read_appraisal_types(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal types."""
    
    result = await db.execute(select(AppraisalType).offset(skip).limit(limit))
    appraisal_types = result.scalars().all()
    
    return appraisal_types


# Appraisal Ranges endpoints - Define before parameterized routes
@router.post("/ranges", response_model=AppraisalRangeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_range(
    appraisal_range: AppraisalRangeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal range."""
    
    # Check if appraisal type exists
    result = await db.execute(select(AppraisalType).where(AppraisalType.id == appraisal_range.appraisal_type_id))
    appraisal_type = result.scalars().first()
    
    if not appraisal_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appraisal type not found"
        )
    
    # Create new appraisal range
    db_appraisal_range = AppraisalRange(**appraisal_range.model_dump())
    db.add(db_appraisal_range)
    await db.commit()
    await db.refresh(db_appraisal_range)
    
    return db_appraisal_range


@router.get("/ranges", response_model=List[AppraisalRangeResponse])
async def read_appraisal_ranges(
    appraisal_type_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal ranges, optionally filtered by appraisal type."""
    
    query = select(AppraisalRange)
    
    if appraisal_type_id:
        query = query.where(AppraisalRange.appraisal_type_id == appraisal_type_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    appraisal_ranges = result.scalars().all()
    
    return appraisal_ranges


@router.get("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def read_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal range by ID."""
    
    result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
    appraisal_range = result.scalars().first()
    
    if not appraisal_range:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal range not found"
        )
    
    return appraisal_range


@router.put("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def update_appraisal_range(
    range_id: int,
    appraisal_range: AppraisalRangeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal range."""
    
    result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
    db_appraisal_range = result.scalars().first()
    
    if not db_appraisal_range:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal range not found"
        )
    
    # Update appraisal range
    update_data = appraisal_range.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_appraisal_range, key, value)
    
    await db.commit()
    await db.refresh(db_appraisal_range)
    
    return db_appraisal_range


@router.delete("/ranges/{range_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal range."""
    
    result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
    db_appraisal_range = result.scalars().first()
    
    if not db_appraisal_range:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal range not found"
        )
    
    await db.delete(db_appraisal_range)
    await db.commit()
    
    return None


# Appraisal Types parameterized endpoints - Define after specific routes
@router.get("/{type_id}", response_model=AppraisalTypeWithRanges)
async def read_appraisal_type(
    type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal type by ID with its ranges."""
    
    result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
    appraisal_type = result.scalars().first()
    
    if not appraisal_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal type not found"
        )
    
    return appraisal_type


@router.put("/{type_id}", response_model=AppraisalTypeResponse)
async def update_appraisal_type(
    type_id: int,
    appraisal_type: AppraisalTypeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal type."""
    
    result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
    db_appraisal_type = result.scalars().first()
    
    if not db_appraisal_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal type not found"
        )
    
    # Check if name already exists if updating name
    if appraisal_type.name and appraisal_type.name != db_appraisal_type.name:
        result = await db.execute(select(AppraisalType).where(AppraisalType.name == appraisal_type.name))
        existing_type = result.scalars().first()
        
        if existing_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appraisal type with this name already exists"
            )
    
    # Update appraisal type
    update_data = appraisal_type.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_appraisal_type, key, value)
    
    await db.commit()
    await db.refresh(db_appraisal_type)
    
    return db_appraisal_type


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_type(
    type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal type."""
    
    result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
    db_appraisal_type = result.scalars().first()
    
    if not db_appraisal_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal type not found"
        )
    
    await db.delete(db_appraisal_type)
    await db.commit()
    
    return None


# Appraisal Ranges endpoints
@router.post("/ranges", response_model=AppraisalRangeResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_range(
    appraisal_range: AppraisalRangeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal range."""
    
    # Check if appraisal type exists
    result = await db.execute(select(AppraisalType).where(AppraisalType.id == appraisal_range.appraisal_type_id))
    appraisal_type = result.scalars().first()
    
    if not appraisal_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appraisal type not found"
        )
    
    # Check if appraisal type has ranges enabled
    if not appraisal_type.has_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This appraisal type does not support ranges"
        )
    
    # Check if name already exists for this appraisal type
    result = await db.execute(
        select(AppraisalRange).where(
            (AppraisalRange.appraisal_type_id == appraisal_range.appraisal_type_id) &
            (AppraisalRange.name == appraisal_range.name)
        )
    )
    existing_range = result.scalars().first()
    
    if existing_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Range with this name already exists for this appraisal type"
        )
    
    # Create new appraisal range
    db_appraisal_range = AppraisalRange(**appraisal_range.model_dump())
    db.add(db_appraisal_range)
    await db.commit()
    await db.refresh(db_appraisal_range)
    
    return db_appraisal_range


@router.get("/ranges", response_model=List[AppraisalRangeResponse])
async def read_appraisal_ranges(
    appraisal_type_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal ranges, optionally filtered by appraisal type."""
    
    query = select(AppraisalRange)
    
    if appraisal_type_id:
        query = query.where(AppraisalRange.appraisal_type_id == appraisal_type_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    appraisal_ranges = result.scalars().all()
    
    return appraisal_ranges


@router.get("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def read_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal range by ID."""
    
    result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
    appraisal_range = result.scalars().first()
    
    if not appraisal_range:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal range not found"
        )
    
    return appraisal_range


@router.put("/ranges/{range_id}", response_model=AppraisalRangeResponse)
async def update_appraisal_range(
    range_id: int,
    appraisal_range: AppraisalRangeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal range."""
    
    result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
    db_appraisal_range = result.scalars().first()
    
    if not db_appraisal_range:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal range not found"
        )
    
    # Check if name already exists for this appraisal type if updating name
    if appraisal_range.name and appraisal_range.name != db_appraisal_range.name:
        result = await db.execute(
            select(AppraisalRange).where(
                (AppraisalRange.appraisal_type_id == db_appraisal_range.appraisal_type_id) &
                (AppraisalRange.name == appraisal_range.name)
            )
        )
        existing_range = result.scalars().first()
        
        if existing_range:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Range with this name already exists for this appraisal type"
            )
    
    # Update appraisal range
    update_data = appraisal_range.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_appraisal_range, key, value)
    
    await db.commit()
    await db.refresh(db_appraisal_range)
    
    return db_appraisal_range


@router.delete("/ranges/{range_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_range(
    range_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal range."""
    
    result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
    db_appraisal_range = result.scalars().first()
    
    if not db_appraisal_range:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal range not found"
        )
    
    await db.delete(db_appraisal_range)
    await db.commit()
    
    return None
