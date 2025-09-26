from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, func

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import AppraisalGoal
from app.models.goal import Goal


class AppraisalRepository:
    """Repository for appraisal-related database operations."""

    async def create(self, db: AsyncSession, appraisal: Appraisal) -> Appraisal:
        db.add(appraisal)
        await db.flush()
        await db.refresh(appraisal)
        return appraisal

    async def get_by_id(self, db: AsyncSession, appraisal_id: int, load_relationships: Optional[list] = None) -> Optional[Appraisal]:
        query = select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
        if load_relationships:
            for rel in load_relationships:
                query = query.options(selectinload(rel))
        result = await db.execute(query)
        return result.scalars().first()

    async def get_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[list] = None
    ) -> List[Appraisal]:
        query = select(Appraisal).options(
            selectinload(Appraisal.appraisal_goals),
            selectinload(Appraisal.appraisal_type)
        )
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(Appraisal.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def add_goal_to_appraisal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> None:
        existing = await db.execute(
            select(AppraisalGoal).where(
                and_(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
        )
        if not existing.scalars().first():
            db.add(AppraisalGoal(appraisal_id=appraisal_id, goal_id=goal_id))
        await db.flush()

    async def get_weightage_and_count(self, db: AsyncSession, appraisal_id: int) -> tuple[int, int]:
        total_res = await db.execute(
            select(func.coalesce(func.sum(Goal.goal_weightage), 0))
            .select_from(AppraisalGoal)
            .join(Goal, AppraisalGoal.goal_id == Goal.goal_id)
            .where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        total_weightage = total_res.scalar() or 0

        count_res = await db.execute(
            select(func.count(AppraisalGoal.id)).where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        goal_count = count_res.scalar() or 0

        return total_weightage, goal_count
