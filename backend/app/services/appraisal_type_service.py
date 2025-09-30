from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.schemas.appraisal_type import (
    AppraisalTypeCreate, AppraisalTypeUpdate,
    AppraisalRangeCreate, AppraisalRangeUpdate
)
from app.constants import APPRAISAL_TYPE_NOT_FOUND, APPRAISAL_RANGE_NOT_FOUND

from app.repositories.appraisal_type_repository import (
    AppraisalTypeRepository, AppraisalRangeRepository
)

appraisal_type_repo = AppraisalTypeRepository()
appraisal_range_repo = AppraisalRangeRepository()


class AppraisalTypeService:

    async def create(self, db: AsyncSession, payload: AppraisalTypeCreate) -> AppraisalType:
        existing = await appraisal_type_repo.get_by_name(db, payload.name)
        if existing:
            raise HTTPException(status_code=400, detail="Appraisal type with this name already exists")

        obj = AppraisalType(**payload.model_dump())
        return await appraisal_type_repo.create(db, obj)

    async def get_all(self, db: AsyncSession, skip: int, limit: int) -> List[AppraisalType]:
        return await appraisal_type_repo.get_all(db, skip, limit)

    async def get_by_id(self, db: AsyncSession, type_id: int) -> AppraisalType:
        obj = await appraisal_type_repo.get_by_id(db, type_id)
        if not obj:
            raise HTTPException(status_code=404, detail=APPRAISAL_TYPE_NOT_FOUND)
        return obj

    async def update(self, db: AsyncSession, type_id: int, payload: AppraisalTypeUpdate) -> AppraisalType:
        obj = await self.get_by_id(db, type_id)

        if payload.name and payload.name != obj.name:
            existing = await appraisal_type_repo.get_by_name(db, payload.name)
            if existing:
                raise HTTPException(status_code=400, detail="Appraisal type with this name already exists")

        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(obj, key, value)

        return await appraisal_type_repo.update(db, obj)

    async def delete(self, db: AsyncSession, type_id: int):
        obj = await self.get_by_id(db, type_id)
        await appraisal_type_repo.delete(db, obj)


class AppraisalRangeService:

    async def create(self, db: AsyncSession, payload: AppraisalRangeCreate) -> AppraisalRange:
        appraisal_type = await appraisal_type_repo.get_by_id(db, payload.appraisal_type_id)
        if not appraisal_type:
            raise HTTPException(status_code=400, detail=APPRAISAL_TYPE_NOT_FOUND)

        if not appraisal_type.has_range:
            raise HTTPException(status_code=400, detail="This appraisal type does not support ranges")

        existing = await appraisal_range_repo.get_by_name_and_type(db, payload.appraisal_type_id, payload.name)
        if existing:
            raise HTTPException(status_code=400, detail="Range with this name already exists for this appraisal type")

        obj = AppraisalRange(**payload.model_dump())
        return await appraisal_range_repo.create(db, obj)

    async def get_all(self, db: AsyncSession, appraisal_type_id: int, skip: int, limit: int) -> List[AppraisalRange]:
        return await appraisal_range_repo.get_all(db, appraisal_type_id, skip, limit)

    async def get_by_id(self, db: AsyncSession, range_id: int) -> AppraisalRange:
        obj = await appraisal_range_repo.get_by_id(db, range_id)
        if not obj:
            raise HTTPException(status_code=404, detail=APPRAISAL_RANGE_NOT_FOUND)
        return obj

    async def update(self, db: AsyncSession, range_id: int, payload: AppraisalRangeUpdate) -> AppraisalRange:
        obj = await self.get_by_id(db, range_id)

        if payload.name and payload.name != obj.name:
            existing = await appraisal_range_repo.get_by_name_and_type(db, obj.appraisal_type_id, payload.name)
            if existing:
                raise HTTPException(status_code=400, detail="Range with this name already exists for this appraisal type")

        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(obj, key, value)

        return await appraisal_range_repo.update(db, obj)

    async def delete(self, db: AsyncSession, range_id: int):
        obj = await self.get_by_id(db, range_id)
        await appraisal_range_repo.delete(db, obj)
