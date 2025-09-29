from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_
from typing import List

from app.db.database import get_db
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import Goal, AppraisalGoal, Category
from app.schemas.appraisal import AppraisalWithGoals
from app.services.appraisal_service import AppraisalService

from app.routers.auth import get_current_user
from app.constants import (
    APPRAISAL_NOT_FOUND,
    GOAL_NOT_FOUND,
    GOAL_NOT_IN_APPRAISAL
)

router = APIRouter(dependencies=[Depends(get_current_user)])

def get_appraisal_service() -> AppraisalService:
    """Dependency to get appraisal service instance."""
    return AppraisalService()


@router.post("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def add_goal_to_appraisal(
    appraisal_id: int,
    goal_id: int,
    appraisal_service = Depends(get_appraisal_service),  # Assuming appraisal_service is provided via dependency injection
    db: AsyncSession = Depends(get_db)
):
    """Add a goal to an appraisal with weightage validation."""
    
    # Check if appraisal exists
    db_appraisal = await appraisal_service.get_appraisal(appraisal_id)

    # Check if goal exists
    db_goal = await appraisal_service.get_goal_by_id(goal_id)

    # Ensure the goal is not already assigned to another appraisal
    await appraisal_service.check_goal_not_already_in_appraisal(db, appraisal_id, goal_id)

    # Check if goal is already in this appraisal
    await appraisal_service.check_goal_in_appraisal(db, appraisal_id, goal_id)

    # Calculate current total weightage for this appraisal
    await appraisal_service.check_total_weightage(db, appraisal_id, db_goal)

    # Add goal to appraisal
    await appraisal_service.add_goal_to_appraisal(db, appraisal_id, goal_id)

    # Re-select with eager-loaded nested relations for safe serialization
    return await appraisal_service.load_appraisal(db, appraisal_id, db_appraisal)


@router.delete("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def remove_goal_from_appraisal(
    appraisal_id: int,
    goal_id: int,
    appraisal_service = Depends(get_appraisal_service),
    db: AsyncSession = Depends(get_db)
):
    """Remove a goal from an appraisal."""

    # Check if appraisal exists
    db_appraisal = await appraisal_service.get_appraisal(appraisal_id)
    
    # Find and remove the appraisal goal
    await appraisal_service.remove_goal_from_appraisal(db, appraisal_id, goal_id)

    # Delete the appraisal-goal link first
    await appraisal_service.if_no_link_exists_delete_appraisal(db, goal_id)

    # Re-select with eager-loaded nested relations for safe serialization
    return await appraisal_service.load_appraisal(db, appraisal_id, db_appraisal)

    # # Check if appraisal exists
    # result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    # db_appraisal = result.scalars().first()
    
    # if not db_appraisal:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail=APPRAISAL_NOT_FOUND
    #     )
    
    # # Check if appraisal is in Draft status (only allow removing goals in Draft)
    # if db_appraisal.status != AppraisalStatus.DRAFT:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail=f"Cannot remove goals when appraisal is in {db_appraisal.status} status. Goals can only be removed in Draft status."
    #     )

    # # Find and remove the appraisal goal
    # result = await db.execute(
    #     select(AppraisalGoal).where(
    #         and_(
    #             AppraisalGoal.appraisal_id == appraisal_id,
    #             AppraisalGoal.goal_id == goal_id
    #         )
    #     )
    # )
    # appraisal_goal = result.scalars().first()
    
    # if not appraisal_goal:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail=GOAL_NOT_IN_APPRAISAL
    #     )

    # # Delete the appraisal-goal link first
    # await db.delete(appraisal_goal)
    # # Flush to ensure subsequent queries see the deletion within this transaction
    # await db.flush()

    # # If this goal is no longer linked to any appraisal, delete the goal itself
    # result = await db.execute(
    #     select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id)
    # )
    # remaining_link = result.scalars().first()
    # if not remaining_link:
    #     # Safe to delete the goal row
    #     result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
    #     db_goal = result.scalars().first()
    #     if db_goal:
    #         await db.delete(db_goal)

    # # Commit deletions
    # await db.commit()

    # Re-select with eager-loaded nested relations for safe serialization
    # result = await db.execute(
    #     select(Appraisal)
    #     .options(
    #         selectinload(Appraisal.appraisal_goals)
    #         .selectinload(AppraisalGoal.goal)
    #         .selectinload(Goal.category)
    #     )
    #     .where(Appraisal.appraisal_id == db_appraisal.appraisal_id)
    # )
    # loaded_appraisal = result.scalars().first()
    
    # return loaded_appraisal


@router.get("/{appraisal_id}/weightage-summary")
async def get_appraisal_weightage_summary(
    appraisal_id: int,
    appraisal_service = Depends(get_appraisal_service),
    db: AsyncSession = Depends(get_db)
):
    """Get weightage summary for an appraisal."""
    
    # Check if appraisal exists
    await appraisal_service.check_if_appraisal_exist(db, appraisal_id)

    # Calculate current total weightage
    current_total_weightage = appraisal_service.calculate_current_total_weightage(db, appraisal_id)
    
    # Get individual goal weightages
    goals = appraisal_service.get_individual_goal_weightages(db, appraisal_id)
    
    return {
        "appraisal_id": appraisal_id,
        "total_weightage": current_total_weightage,
        "remaining_weightage": 100 - current_total_weightage,
        "can_add_more_goals": current_total_weightage < 100,
        "goals": [
            {
                "goal_id": goal.goal_id,
                "goal_title": goal.goal_title,
                "weightage": goal.goal_weightage
            }
            for goal in goals
        ]
    }

    # Check if appraisal exists
    # result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    # db_appraisal = result.scalars().first()
    
    # if not db_appraisal:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail=APPRAISAL_NOT_FOUND
    #     )
    
    # # Calculate current total weightage
    # result = await db.execute(
    #     select(func.sum(Goal.goal_weightage)).select_from(
    #         AppraisalGoal.__table__.join(Goal.__table__)
    #     ).where(AppraisalGoal.appraisal_id == appraisal_id)
    # )
    # current_total_weightage = result.scalar() or 0


    # # Get individual goal weightages
    # result = await db.execute(
    #     select(Goal.goal_id, Goal.goal_title, Goal.goal_weightage).select_from(
    #         AppraisalGoal.__table__.join(Goal.__table__)
    #     ).where(AppraisalGoal.appraisal_id == appraisal_id)
    # )
    # goals = result.fetchall()



@router.get("/categories", response_model=List[dict])
async def get_categories(db: AsyncSession = Depends(get_db), appraisal_service = Depends(get_appraisal_service)):
    """Get all categories for dropdown selection."""
    
    # result = await db.execute(select(Category).order_by(Category.name))
    # categories = result.scalars().all()

    categories = await appraisal_service.get_categories(db)
    
    return [
        {
            "id": category.id,
            "name": category.name
        }
        for category in categories
    ]
