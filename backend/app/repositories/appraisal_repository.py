from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, func

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import AppraisalGoal
from app.models.goal import Goal
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType, AppraisalRange


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

    async def get_with_goals_and_relationships(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]:
        """Get an appraisal with all its goals and nested relationships loaded."""
        query = (
            select(Appraisal)
            .where(Appraisal.appraisal_id == appraisal_id)
            .options(
                selectinload(Appraisal.appraisal_goals)
                .selectinload(AppraisalGoal.goal)
                .selectinload(Goal.category),
                selectinload(Appraisal.appraisal_type)
            )
        )
        
        result = await db.execute(query)
        return result.scalars().first()

    async def update_appraisal_goal_self_assessment(
        self, 
        db: AsyncSession, 
        appraisal_goal: AppraisalGoal, 
        self_comment: Optional[str] = None, 
        self_rating: Optional[int] = None
    ) -> None:
        """Update self assessment fields for an appraisal goal."""
        if self_comment is not None:
            appraisal_goal.self_comment = self_comment
        if self_rating is not None:
            appraisal_goal.self_rating = self_rating
        await db.flush()

    async def update_appraisal_goal_appraiser_evaluation(
        self, 
        db: AsyncSession, 
        appraisal_goal: AppraisalGoal, 
        appraiser_comment: Optional[str] = None, 
        appraiser_rating: Optional[int] = None
    ) -> None:
        """Update appraiser evaluation fields for an appraisal goal."""
        if appraiser_comment is not None:
            appraisal_goal.appraiser_comment = appraiser_comment
        if appraiser_rating is not None:
            appraisal_goal.appraiser_rating = appraiser_rating
        await db.flush()

    async def update_appraisal_status(self, db: AsyncSession, appraisal: Appraisal, new_status: AppraisalStatus) -> None:
        """Update appraisal status."""
        appraisal.status = new_status
        await db.flush()

    async def update_overall_appraiser_evaluation(
        self, 
        db: AsyncSession, 
        appraisal: Appraisal, 
        overall_comments: Optional[str] = None, 
        overall_rating: Optional[int] = None
    ) -> None:
        """Update overall appraiser evaluation."""
        if overall_comments is not None:
            appraisal.appraiser_overall_comments = overall_comments
        if overall_rating is not None:
            appraisal.appraiser_overall_rating = overall_rating
        await db.flush()

    async def update_overall_reviewer_evaluation(
        self, 
        db: AsyncSession, 
        appraisal: Appraisal, 
        overall_comments: Optional[str] = None, 
        overall_rating: Optional[int] = None
    ) -> None:
        """Update overall reviewer evaluation."""
        if overall_comments is not None:
            appraisal.reviewer_overall_comments = overall_comments
        if overall_rating is not None:
            appraisal.reviewer_overall_rating = overall_rating
        await db.flush()

    async def get_employee_by_id(self, db: AsyncSession, emp_id: int) -> Optional[Employee]:
        """Get employee by ID."""
        result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
        return result.scalars().first()

    async def get_appraisal_type_by_id(self, db: AsyncSession, type_id: int) -> Optional[AppraisalType]:
        """Get appraisal type by ID."""
        result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
        return result.scalars().first()

    async def get_appraisal_range_by_id(self, db: AsyncSession, range_id: int) -> Optional[AppraisalRange]:
        """Get appraisal range by ID."""
        result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
        return result.scalars().first()

    async def get_goal_by_id(self, db: AsyncSession, goal_id: int) -> Optional[Goal]:
        """Get goal by ID."""
        result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
        return result.scalars().first()

    async def get_goals_by_ids(self, db: AsyncSession, goal_ids: List[int]) -> List[Goal]:
        """Get multiple goals by their IDs."""
        result = await db.execute(select(Goal).where(Goal.goal_id.in_(goal_ids)))
        return result.scalars().all()

    async def find_appraisal_goal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        """Find an appraisal goal by appraisal and goal IDs."""
        result = await db.execute(
            select(AppraisalGoal).where(
                and_(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
        )
        return result.scalars().first()
    
    async def get_existing_appraisal_goal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        """Get existing appraisal goal by appraisal and goal IDs."""
        result = await db.execute(
            select(AppraisalGoal).where(
                and_(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
        )
        return result.scalars().first()

    async def add_appraisal_goal(self, db: AsyncSession, appraisal_goal: AppraisalGoal) -> None:
        db.add(appraisal_goal)
        await db.flush()
        # Persist the new appraisal_goal and commit the transaction
        await db.commit()
        # Refresh to ensure the object has up-to-date attributes (ids, defaults)
        await db.refresh(appraisal_goal)


    async def update_appraisal_goal(self, db: AsyncSession, appraisal_id: int) -> AppraisalGoal:
        query =  select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
        query = query.options(
            selectinload(Appraisal.appraisal_goals)
            .selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
        result = await db.execute(query)
        return result.scalars().first()
    
    async def get_appraisal_goal_by_id(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        result = await db.execute(
            select(AppraisalGoal).where(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
        appraisal_goal = result.scalars().first()
        return appraisal_goal

    async def remove_appraisal_goal(self, db: AsyncSession, appraisal_goal: AppraisalGoal) -> None:
        # Capture identifying fields before delete since the instance will be
        # detached/expired after deletion and attribute access may raise.
        try:
            aid = appraisal_goal.appraisal_id
            gid = appraisal_goal.goal_id
        except Exception:
            aid = None
            gid = None

        try:
            print("Deleting appraisal goal...")
            await db.delete(appraisal_goal)
            print("Flushing...") 
            await db.flush()  # Refresh from DB after deletion
            print("Committing delete...")
            await db.commit()

            # Expire the session identity map so any cached Appraisal/AppraisalGoal
            # instances will be reloaded from the DB on next access. Use run_sync
            # to call the synchronous Session.expire_all on the underlying sync
            # Session safely from AsyncSession.
            try:
                print("Expiring session identity map...") 
                await db.run_sync(lambda sync_session: sync_session.expire_all())
            except Exception as e: 
                from app.exceptions.custom_exceptions import InternalServerError
                raise InternalServerError(f"Failed to expire session after deleting appraisal goal: {e}")

            # Log the deletion using the captured identifiers
            print(f"Deleted appraisal goal: {aid}-{gid}")
        except Exception as exc:
            # Log the exception details for debugging, then re-raise so global
            # handlers can convert to HTTP 500 responses as usual.
            print(f"Exception in remove_appraisal_goal: {exc.__class__.__name__} - {exc}")
            raise


    async def get_appraisal_by_id(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]:
        result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
        return result.scalars().first()

    async def get_appraisal_goal(self, db: AsyncSession, goal_id: int) -> Optional[AppraisalGoal]:
        result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id))
        return result.scalars().first()

    async def get_appraisal_goal_by_id(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        result = await db.execute(
            select(AppraisalGoal).where(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
        return result.scalars().first()
    

    async def calculate_total_weightage(self, db: AsyncSession, appraisal_id: int) -> int:
        result = await db.execute(
            select(func.sum(Goal.goal_weightage)).select_from(
                AppraisalGoal.__table__.join(Goal.__table__)
            ).where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        return result.scalar() or 0
    
    async def load_appraisal(self, db: AsyncSession, db_appraisal: Appraisal) -> Appraisal:
        """Reload an appraisal with all its goals and nested relationships loaded."""
        query = (
            select(Appraisal)
            .options(
                selectinload(Appraisal.appraisal_goals)
                .selectinload(AppraisalGoal.goal)
                .selectinload(Goal.category)
            )
            .where(Appraisal.appraisal_id == db_appraisal.appraisal_id)
        )
        
        result = await db.execute(query)
        return result.scalars().first()
    
    async def delete_goal(self, db: AsyncSession, goal: Goal) -> None:
        await db.delete(goal)
        await db.commit()

    async def get_individual_goal_weightages(self, db: AsyncSession, appraisal_id: int) -> Goal:
        query = (
            select(Goal.goal_id, Goal.goal_title, Goal.goal_weightage).select_from(
                AppraisalGoal.__table__.join(Goal.__table__)
            ).where(AppraisalGoal.appraisal_id == appraisal_id)
        )

        result = await db.execute(query)
        return result.fetchall()
    