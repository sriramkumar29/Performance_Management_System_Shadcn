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

from app.routers.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def add_goal_to_appraisal(
    appraisal_id: int,
    goal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Add a goal to an appraisal with weightage validation."""
    
    # Check if appraisal exists
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Check if appraisal is in Draft status (only allow adding goals in Draft)
    if db_appraisal.status != AppraisalStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add goals when appraisal is in {db_appraisal.status} status. Goals can only be added in Draft status."
        )
    
    # Check if goal exists
    result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
    db_goal = result.scalars().first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    # Ensure the goal is not already assigned to another appraisal
    result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id))
    existing_link_any = result.scalars().first()
    if existing_link_any and existing_link_any.appraisal_id != appraisal_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal is already assigned to a different appraisal"
        )
    
    # Check if goal is already in this appraisal
    result = await db.execute(
        select(AppraisalGoal).where(
            and_(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
    )
    existing_appraisal_goal = result.scalars().first()
    
    if existing_appraisal_goal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal is already added to this appraisal"
        )
    
    # Calculate current total weightage for this appraisal
    result = await db.execute(
        select(func.sum(Goal.goal_weightage)).select_from(
            AppraisalGoal.__table__.join(Goal.__table__)
        ).where(AppraisalGoal.appraisal_id == appraisal_id)
    )
    current_total_weightage = result.scalar() or 0
    
    # Check if adding this goal would exceed 100% weightage
    new_total_weightage = current_total_weightage + db_goal.goal_weightage
    if new_total_weightage > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add goal. Total weightage would exceed 100%. Current: {current_total_weightage}%, Goal: {db_goal.goal_weightage}%, New Total: {new_total_weightage}%"
        )
    
    # Add goal to appraisal
    appraisal_goal = AppraisalGoal(
        appraisal_id=appraisal_id,
        goal_id=goal_id
    )
    db.add(appraisal_goal)
    await db.commit()
    # Re-select with eager-loaded nested relations for safe serialization
    result = await db.execute(
        select(Appraisal)
        .options(
            selectinload(Appraisal.appraisal_goals)
            .selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
        .where(Appraisal.appraisal_id == db_appraisal.appraisal_id)
    )
    loaded_appraisal = result.scalars().first()
    
    return loaded_appraisal


@router.delete("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def remove_goal_from_appraisal(
    appraisal_id: int,
    goal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Remove a goal from an appraisal."""
    
    # Check if appraisal exists
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Check if appraisal is in Draft status (only allow removing goals in Draft)
    if db_appraisal.status != AppraisalStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove goals when appraisal is in {db_appraisal.status} status. Goals can only be removed in Draft status."
        )
    
    # Find and remove the appraisal goal
    result = await db.execute(
        select(AppraisalGoal).where(
            and_(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
    )
    appraisal_goal = result.scalars().first()
    
    if not appraisal_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found in this appraisal"
        )
    
    # Delete the appraisal-goal link first
    await db.delete(appraisal_goal)
    # Flush to ensure subsequent queries see the deletion within this transaction
    await db.flush()

    # If this goal is no longer linked to any appraisal, delete the goal itself
    result = await db.execute(
        select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id)
    )
    remaining_link = result.scalars().first()
    if not remaining_link:
        # Safe to delete the goal row
        result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
        db_goal = result.scalars().first()
        if db_goal:
            await db.delete(db_goal)

    # Commit deletions
    await db.commit()
    # Re-select with eager-loaded nested relations for safe serialization
    result = await db.execute(
        select(Appraisal)
        .options(
            selectinload(Appraisal.appraisal_goals)
            .selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
        .where(Appraisal.appraisal_id == db_appraisal.appraisal_id)
    )
    loaded_appraisal = result.scalars().first()
    
    return loaded_appraisal


@router.get("/{appraisal_id}/weightage-summary")
async def get_appraisal_weightage_summary(
    appraisal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get weightage summary for an appraisal."""
    
    # Check if appraisal exists
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Calculate current total weightage
    result = await db.execute(
        select(func.sum(Goal.goal_weightage)).select_from(
            AppraisalGoal.__table__.join(Goal.__table__)
        ).where(AppraisalGoal.appraisal_id == appraisal_id)
    )
    current_total_weightage = result.scalar() or 0
    
    # Get individual goal weightages
    result = await db.execute(
        select(Goal.goal_id, Goal.goal_title, Goal.goal_weightage).select_from(
            AppraisalGoal.__table__.join(Goal.__table__)
        ).where(AppraisalGoal.appraisal_id == appraisal_id)
    )
    goals = result.fetchall()
    
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


@router.get("/categories", response_model=List[dict])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all categories for dropdown selection."""
    
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    
    return [
        {
            "id": category.id,
            "name": category.name
        }
        for category in categories
    ]
