from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_
from typing import List, Dict
from datetime import date

from app.db.database import get_db
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.employee import Employee
from app.models.goal import Goal, AppraisalGoal
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.schemas.appraisal import (
    AppraisalCreate,
    AppraisalUpdate,
    AppraisalResponse,
    AppraisalWithGoals,
    AppraisalStatusUpdate,
    SelfAssessmentUpdate,
    AppraiserEvaluationUpdate,
    ReviewerEvaluationUpdate
)

from app.routers.auth import get_current_user

# router = APIRouter(dependencies=[Depends(get_current_user)])
router = APIRouter()

@router.post("/", response_model=AppraisalWithGoals, status_code=status.HTTP_201_CREATED)
async def create_appraisal(
    appraisal: AppraisalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal."""
    
    # Check if employees exist
    for emp_id, role in [
        (appraisal.appraisee_id, "Appraisee"),
        (appraisal.appraiser_id, "Appraiser"),
        (appraisal.reviewer_id, "Reviewer")
    ]:
        result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
        employee = result.scalars().first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{role} not found"
            )
    
    # Check if appraisal type exists
    result = await db.execute(select(AppraisalType).where(AppraisalType.id == appraisal.appraisal_type_id))
    appraisal_type = result.scalars().first()
    
    if not appraisal_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appraisal type not found"
        )
    
    # Check if appraisal range exists if provided
    if appraisal.appraisal_type_range_id:
        result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == appraisal.appraisal_type_range_id))
        appraisal_range = result.scalars().first()
        
        if not appraisal_range:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appraisal range not found"
            )
        
        # Check if range belongs to the selected type
        if appraisal_range.appraisal_type_id != appraisal.appraisal_type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appraisal range does not belong to the selected appraisal type"
            )
    
    # Check if goals exist
    goals = []
    if appraisal.goal_ids:
        for goal_id in appraisal.goal_ids:
            result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
            goal = result.scalars().first()
            
            if not goal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Goal with ID {goal_id} not found"
                )
            
            goals.append(goal)
    
    # Check if total weightage is 100% only when creating in a non-draft status
    # Drafts are allowed to have incomplete weightage and even zero goals
    if goals and appraisal.status != AppraisalStatus.DRAFT:
        total_weightage = sum(goal.goal_weightage for goal in goals)
        if total_weightage != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total weightage must be 100%, but got {total_weightage}%"
            )
    
    # Create new appraisal
    db_appraisal = Appraisal(
        appraisee_id=appraisal.appraisee_id,
        appraiser_id=appraisal.appraiser_id,
        reviewer_id=appraisal.reviewer_id,
        appraisal_type_id=appraisal.appraisal_type_id,
        appraisal_type_range_id=appraisal.appraisal_type_range_id,
        start_date=appraisal.start_date,
        end_date=appraisal.end_date,
        status=appraisal.status
    )
    
    db.add(db_appraisal)
    await db.flush()
    
    # Create appraisal goals
    for goal in goals:
        db_appraisal_goal = AppraisalGoal(
            appraisal_id=db_appraisal.appraisal_id,
            goal_id=goal.goal_id
        )
        db.add(db_appraisal_goal)
    
    await db.commit()
    # Re-select with eager-loaded nested relations
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


@router.get("/", response_model=List[AppraisalResponse])
async def read_appraisals(
    appraisee_id: int = None,
    appraiser_id: int = None,
    reviewer_id: int = None,
    status: AppraisalStatus = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """Get all appraisals, optionally filtered by appraisee, appraiser, reviewer, or status."""
    
    query = select(Appraisal)
    
    if appraisee_id:
        query = query.where(Appraisal.appraisee_id == appraisee_id)
    
    if appraiser_id:
        query = query.where(Appraisal.appraiser_id == appraiser_id)
    
    if reviewer_id:
        query = query.where(Appraisal.reviewer_id == reviewer_id)
    
    if status:
        query = query.where(Appraisal.status == status)
    
    result = await db.execute(query.offset(skip).limit(limit))
    appraisals = result.scalars().all()
    print("\nAppraisals fetched:", appraisals)  # Debugging line
    return appraisals


@router.get("/{appraisal_id}", response_model=AppraisalWithGoals)
async def read_appraisal(
    appraisal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal by ID."""
    
    result = await db.execute(
        select(Appraisal)
        .options(
            selectinload(Appraisal.appraisal_goals)
            .selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
        .where(Appraisal.appraisal_id == appraisal_id)
    )
    appraisal = result.scalars().first()
    
    if not appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    return appraisal


@router.put("/{appraisal_id}", response_model=AppraisalResponse)
async def update_appraisal(
    appraisal_id: int,
    appraisal: AppraisalUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal."""
    
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Check if employees exist if updating
    for field, emp_id, role in [
        ("appraisee_id", appraisal.appraisee_id, "Appraisee"),
        ("appraiser_id", appraisal.appraiser_id, "Appraiser"),
        ("reviewer_id", appraisal.reviewer_id, "Reviewer")
    ]:
        if getattr(appraisal, field) is not None:
            result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
            employee = result.scalars().first()
            
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{role} not found"
                )
    
    # Check if appraisal type exists if updating
    if appraisal.appraisal_type_id is not None:
        result = await db.execute(select(AppraisalType).where(AppraisalType.id == appraisal.appraisal_type_id))
        appraisal_type = result.scalars().first()
        
        if not appraisal_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appraisal type not found"
            )
    
    # Check if appraisal range exists if updating
    if appraisal.appraisal_type_range_id is not None:
        result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == appraisal.appraisal_type_range_id))
        appraisal_range = result.scalars().first()
        
        if not appraisal_range:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appraisal range not found"
            )
        
        # Check if range belongs to the selected type
        type_id = appraisal.appraisal_type_id if appraisal.appraisal_type_id is not None else db_appraisal.appraisal_type_id
        if appraisal_range.appraisal_type_id != type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Appraisal range does not belong to the selected appraisal type"
            )
    
    # Update appraisal
    update_data = appraisal.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_appraisal, key, value)
    
    await db.commit()
    await db.refresh(db_appraisal)
    
    return db_appraisal


@router.delete("/{appraisal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal(
    appraisal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal."""
    
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    await db.delete(db_appraisal)
    await db.commit()
    
    return None




@router.put("/{appraisal_id}/status", response_model=AppraisalResponse)
async def update_appraisal_status(
    appraisal_id: int,
    status_update: AppraisalStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal's status."""
    
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Validate status transition
    current_status = db_appraisal.status
    new_status = status_update.status
    
    # Define valid transitions
    valid_transitions = {
        AppraisalStatus.DRAFT: [AppraisalStatus.SUBMITTED],
        AppraisalStatus.SUBMITTED: [AppraisalStatus.APPRAISEE_SELF_ASSESSMENT],
        AppraisalStatus.APPRAISEE_SELF_ASSESSMENT: [AppraisalStatus.APPRAISER_EVALUATION],
        AppraisalStatus.APPRAISER_EVALUATION: [AppraisalStatus.REVIEWER_EVALUATION],
        AppraisalStatus.REVIEWER_EVALUATION: [AppraisalStatus.COMPLETE],
        AppraisalStatus.COMPLETE: []
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {current_status} to {new_status}"
        )

    # If transitioning to SUBMITTED, enforce goals exist and total weightage == 100
    if new_status == AppraisalStatus.SUBMITTED:
        # Sum goal weightage for this appraisal
        total_res = await db.execute(
            select(func.coalesce(func.sum(Goal.goal_weightage), 0))
            .select_from(AppraisalGoal)
            .join(Goal, AppraisalGoal.goal_id == Goal.goal_id)
            .where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        total_weightage = total_res.scalar() or 0

        count_res = await db.execute(
            select(func.count(AppraisalGoal.id))
            .where(AppraisalGoal.appraisal_id == appraisal_id)
        )
        goal_count = count_res.scalar() or 0

        if goal_count == 0 or total_weightage != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cannot submit appraisal: must have goals totalling 100% weightage"
                ),
            )

    # Update status
    db_appraisal.status = new_status
    await db.commit()
    await db.refresh(db_appraisal)
    
    return db_appraisal


@router.put("/{appraisal_id}/self-assessment", response_model=AppraisalWithGoals)
async def update_self_assessment(
    appraisal_id: int,
    assessment: SelfAssessmentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update self assessment for an appraisal."""
    
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Check if appraisal is in the correct status
    if db_appraisal.status != AppraisalStatus.APPRAISEE_SELF_ASSESSMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update self assessment when appraisal is in {db_appraisal.status} status"
        )
    
    # Update self assessment for each goal
    for goal_id, data in assessment.goals.items():
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
                detail=f"Goal with ID {goal_id} not found in this appraisal"
            )
        
        if "self_comment" in data:
            appraisal_goal.self_comment = data["self_comment"]
        
        if "self_rating" in data:
            appraisal_goal.self_rating = data["self_rating"]
    
    await db.commit()
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


@router.put("/{appraisal_id}/appraiser-evaluation", response_model=AppraisalWithGoals)
async def update_appraiser_evaluation(
    appraisal_id: int,
    evaluation: AppraiserEvaluationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update appraiser evaluation for an appraisal."""
    
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Check if appraisal is in the correct status
    if db_appraisal.status != AppraisalStatus.APPRAISER_EVALUATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update appraiser evaluation when appraisal is in {db_appraisal.status} status"
        )
    
    # Update appraiser evaluation for each goal
    for goal_id, data in evaluation.goals.items():
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
                detail=f"Goal with ID {goal_id} not found in this appraisal"
            )
        
        if "appraiser_comment" in data:
            appraisal_goal.appraiser_comment = data["appraiser_comment"]
        
        if "appraiser_rating" in data:
            appraisal_goal.appraiser_rating = data["appraiser_rating"]
    
    # Update overall comments and rating
    if evaluation.appraiser_overall_comments is not None:
        db_appraisal.appraiser_overall_comments = evaluation.appraiser_overall_comments
    
    if evaluation.appraiser_overall_rating is not None:
        db_appraisal.appraiser_overall_rating = evaluation.appraiser_overall_rating
    
    await db.commit()
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


@router.put("/{appraisal_id}/reviewer-evaluation", response_model=AppraisalWithGoals)
async def update_reviewer_evaluation(
    appraisal_id: int,
    evaluation: ReviewerEvaluationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update reviewer evaluation for an appraisal."""
    
    result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appraisal not found"
        )
    
    # Check if appraisal is in the correct status
    if db_appraisal.status != AppraisalStatus.REVIEWER_EVALUATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update reviewer evaluation when appraisal is in {db_appraisal.status} status"
        )
    
    # Update overall comments and rating
    if evaluation.reviewer_overall_comments is not None:
        db_appraisal.reviewer_overall_comments = evaluation.reviewer_overall_comments
    
    if evaluation.reviewer_overall_rating is not None:
        db_appraisal.reviewer_overall_rating = evaluation.reviewer_overall_rating
    
    await db.commit()
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
