from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.models.appraisal_type import AppraisalType, AppraisalRange


class AppraisalTypeRepository:
    """Repository for AppraisalType operations."""

    async def get_by_id(self, db: AsyncSession, type_id: int) -> Optional[AppraisalType]:
        result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
        return result.scalars().first()

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[AppraisalType]:
        result = await db.execute(select(AppraisalType).where(AppraisalType.name == name))
        return result.scalars().first()

    async def get_all(self, db: AsyncSession, skip: int, limit: int) -> List[AppraisalType]:
        result = await db.execute(select(AppraisalType).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj: AppraisalType) -> AppraisalType:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    async def update(self, db: AsyncSession, obj: AppraisalType) -> AppraisalType:
        await db.commit()
        await db.refresh(obj)
        return obj

    async def delete(self, db: AsyncSession, obj: AppraisalType):
        await db.delete(obj)
        await db.commit()


class AppraisalRangeRepository:
    """Repository for AppraisalRange operations."""

    async def get_by_id(self, db: AsyncSession, range_id: int) -> Optional[AppraisalRange]:
        result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
        return result.scalars().first()

    async def get_by_name_and_type(self, db: AsyncSession, appraisal_type_id: int, name: str) -> Optional[AppraisalRange]:
        result = await db.execute(
            select(AppraisalRange).where(
                (AppraisalRange.appraisal_type_id == appraisal_type_id) &
                (AppraisalRange.name == name)
            )
        )
        return result.scalars().first()

    async def get_all(self, db: AsyncSession, appraisal_type_id: Optional[int], skip: int, limit: int) -> List[AppraisalRange]:
        query = select(AppraisalRange)
        if appraisal_type_id:
            query = query.where(AppraisalRange.appraisal_type_id == appraisal_type_id)
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj: AppraisalRange) -> AppraisalRange:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    async def update(self, db: AsyncSession, obj: AppraisalRange) -> AppraisalRange:
        await db.commit()
        await db.refresh(obj)
        return obj

    async def delete(self, db: AsyncSession, obj: AppraisalRange):
        await db.delete(obj)
        await db.commit()
