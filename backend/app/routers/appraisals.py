"""
Appraisal router for the Performance Management System.

This module provides REST API endpoints for appraisal management
with proper validation, error handling, and service layer integration.
"""

from fastapi import APIRouter, Depends, status, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.models.employee import Employee
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import Goal, AppraisalGoal, Category
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
from app.services.appraisal_service import AppraisalService
from app.routers.auth import get_current_user, get_current_active_user
from app.dependencies import (
    get_pagination_params,
    validate_positive_integer,
    PaginationParams
)
from app.exceptions import ValidationError, EntityNotFoundError

router = APIRouter(dependencies=[Depends(get_current_user)])


class AddGoalsRequest(BaseModel):
    """Request model for adding goals to an appraisal."""
    goal_ids: List[int]


def get_appraisal_service() -> AppraisalService:
    """Dependency to get appraisal service instance."""
    return AppraisalService()


@router.post("/", response_model=AppraisalResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal(
    appraisal_data: AppraisalCreate,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalResponse:
    """
    Create a new appraisal.
    
    Args:
        appraisal_data: Appraisal creation data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Created appraisal data
        
    Raises:
        EntityNotFoundError: If referenced entities not found
        ValidationError: If validation fails
        WeightageValidationError: If goal weightage is invalid
    """
    db_appraisal = await appraisal_service.create_appraisal(
        db,
        appraisal_data=appraisal_data
    )
    await db.commit()
    
    return AppraisalResponse.model_validate(db_appraisal)


@router.get("/", response_model=List[AppraisalResponse])
async def get_appraisals(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[AppraisalStatus] = None,
    appraisee_id: Optional[int] = None,
    appraiser_id: Optional[int] = None,
    reviewer_id: Optional[int] = None,
    appraisal_type_id: Optional[int] = None,
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[AppraisalResponse]:
    """
    Get appraisals with filtering.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        status_filter: Filter by appraisal status
        appraisee_id: Filter by appraisee ID
        appraiser_id: Filter by appraiser ID
        reviewer_id: Filter by reviewer ID
        appraisal_type_id: Filter by appraisal type ID
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        List[AppraisalResponse]: List of appraisals
    """
    appraisals = await appraisal_service.get_appraisals_with_filters(
        db,
        skip=pagination.skip,
        limit=pagination.limit,
        status=status_filter,
        appraisee_id=appraisee_id,
        appraiser_id=appraiser_id,
        reviewer_id=reviewer_id,
        appraisal_type_id=appraisal_type_id
    )
    
    return [AppraisalResponse.model_validate(appraisal) for appraisal in appraisals]


@router.get("/{appraisal_id}", response_model=AppraisalWithGoals)
async def get_appraisal_by_id(
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Get appraisal by ID with goals.
    
    Args:
        appraisal_id: Appraisal ID
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Appraisal with goals
        
    Raises:
        EntityNotFoundError: If appraisal not found
    """
    db_appraisal = await appraisal_service.get_appraisal_with_goals(
        db,
        appraisal_id
    )
    
    return AppraisalWithGoals.model_validate(db_appraisal)


@router.put("/{appraisal_id}", response_model=AppraisalResponse)
async def update_appraisal(
    appraisal_data: AppraisalUpdate,
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalResponse:
    """
    Update an appraisal.
    
    Args:
        appraisal_id: Appraisal ID
        appraisal_data: Updated appraisal data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Updated appraisal
        
    Raises:
        EntityNotFoundError: If appraisal not found
    """
    db_appraisal = await appraisal_service.get_by_id_or_404(db, appraisal_id)
    
    updated_appraisal = await appraisal_service.update(
        db,
        db_obj=db_appraisal,
        obj_in=appraisal_data
    )
    
    await db.commit()
    
    return AppraisalResponse.model_validate(updated_appraisal)


@router.put("/{appraisal_id}/status", response_model=AppraisalResponse)
async def update_appraisal_status(
    appraisal_id: int = Path(..., gt=0),
    status_update: AppraisalStatusUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalResponse:
    """
    Update appraisal status.
    
    Args:
        appraisal_id: Appraisal ID
        status_update: New status data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Updated appraisal
        
    Raises:
        HTTPException: If appraisal not found, status transition is invalid, or validation fails
    """
    db_appraisal = await appraisal_service.update_appraisal_status(
        db,
        appraisal_id=appraisal_id,
        new_status=status_update.status
    )
    
    return AppraisalResponse.model_validate(db_appraisal)


@router.put("/{appraisal_id}/self-assessment", response_model=AppraisalWithGoals)
async def update_self_assessment(
    appraisal_id: int = Path(..., gt=0),
    assessment_data: SelfAssessmentUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Update self assessment for appraisal goals.
    
    Args:
        appraisal_id: Appraisal ID
        assessment_data: Self assessment data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        EntityNotFoundError: If appraisal or goal not found
        ValidationError: If appraisal not in correct status or rating invalid
    """
    try:
        db_appraisal = await appraisal_service.update_self_assessment(
            db,
            appraisal_id=appraisal_id,
            goals_data=assessment_data.goals
        )
        await db.commit()
        
        return AppraisalWithGoals.model_validate(db_appraisal)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{appraisal_id}/appraiser-evaluation", response_model=AppraisalWithGoals)
async def update_appraiser_evaluation(
    appraisal_id: int = Path(..., gt=0),
    evaluation_data: AppraiserEvaluationUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Update appraiser evaluation for appraisal goals and overall assessment.
    
    Args:
        appraisal_id: Appraisal ID
        evaluation_data: Appraiser evaluation data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        EntityNotFoundError: If appraisal or goal not found
        ValidationError: If appraisal not in correct status or rating invalid
    """
    try:
        db_appraisal = await appraisal_service.update_appraiser_evaluation(
            db,
            appraisal_id=appraisal_id,
            goals_data=evaluation_data.goals,
            appraiser_overall_comments=evaluation_data.appraiser_overall_comments,
            appraiser_overall_rating=evaluation_data.appraiser_overall_rating
        )
        await db.commit()
        
        return AppraisalWithGoals.model_validate(db_appraisal)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{appraisal_id}/reviewer-evaluation", response_model=AppraisalWithGoals)
async def update_reviewer_evaluation(
    appraisal_id: int = Path(..., gt=0),
    evaluation_data: ReviewerEvaluationUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Update reviewer evaluation for overall assessment.
    
    Args:
        appraisal_id: Appraisal ID
        evaluation_data: Reviewer evaluation data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        EntityNotFoundError: If appraisal not found
        ValidationError: If appraisal not in correct status or rating invalid
    """
    try:
        db_appraisal = await appraisal_service.update_reviewer_evaluation(
            db,
            appraisal_id=appraisal_id,
            reviewer_overall_comments=evaluation_data.reviewer_overall_comments,
            reviewer_overall_rating=evaluation_data.reviewer_overall_rating
        )
        await db.commit()
        
        return AppraisalWithGoals.model_validate(db_appraisal)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{appraisal_id}/goals", response_model=AppraisalWithGoals)
async def add_goals_to_appraisal(
    request: AddGoalsRequest,
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Add goals to an appraisal.
    
    Args:
        appraisal_id: Appraisal ID
        goal_ids: List of goal IDs to add
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        EntityNotFoundError: If appraisal or goals not found
        ValidationError: If goal IDs are invalid
    """
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload  
    from app.models.goal import AppraisalGoal, Goal, Category
    from app.exceptions import EntityNotFoundError
    
    # Add each goal to the appraisal if it doesn't already exist
    for goal_id in request.goal_ids:
        existing_check = await db.execute(
            select(AppraisalGoal).where(
                AppraisalGoal.appraisal_id == appraisal_id,
                AppraisalGoal.goal_id == goal_id
            )
        )
        
        if not existing_check.scalars().first():
            appraisal_goal = AppraisalGoal(
                appraisal_id=appraisal_id,
                goal_id=goal_id
            )
            db.add(appraisal_goal)
    
    await db.commit()
    
    # Get the updated appraisal with relationships
    result = await db.execute(
        select(Appraisal)
        .where(Appraisal.appraisal_id == appraisal_id)
        .options(
            selectinload(Appraisal.appraisal_goals)
            .selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
    )
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise EntityNotFoundError("Appraisal", appraisal_id)
    
    return AppraisalWithGoals.model_validate(db_appraisal)


@router.post("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def add_single_goal_to_appraisal(
    appraisal_id: int = Path(..., gt=0),
    goal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Add a single goal to an appraisal.
    
    Args:
        appraisal_id: Appraisal ID
        goal_id: Goal ID to add
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        EntityNotFoundError: If appraisal or goal not found
    """
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    from app.models.goal import AppraisalGoal, Goal, Category
    from app.exceptions import EntityNotFoundError
    
    # Check if the goal already exists for this appraisal
    existing_check = await db.execute(
        select(AppraisalGoal).where(
            AppraisalGoal.appraisal_id == appraisal_id,
            AppraisalGoal.goal_id == goal_id
        )
    )
    
    if not existing_check.scalars().first():
        # Add the goal to the appraisal
        appraisal_goal = AppraisalGoal(
            appraisal_id=appraisal_id,
            goal_id=goal_id
        )
        db.add(appraisal_goal)
        await db.commit()
    
    # Get the updated appraisal with relationships
    result = await db.execute(
        select(Appraisal)
        .where(Appraisal.appraisal_id == appraisal_id)
        .options(
            selectinload(Appraisal.appraisal_goals)
            .selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
    )
    db_appraisal = result.scalars().first()
    
    if not db_appraisal:
        raise EntityNotFoundError("Appraisal", appraisal_id)
    
    return AppraisalWithGoals.model_validate(db_appraisal)


@router.delete("/{appraisal_id}/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_goal_from_appraisal(
    appraisal_id: int = Path(..., gt=0),
    goal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Remove a goal from an appraisal.
    
    Args:
        appraisal_id: Appraisal ID
        goal_id: Goal ID to remove
        db: Database session
        current_user: Current authenticated user
        
    Raises:
        EntityNotFoundError: If appraisal goal not found
    """
    from sqlalchemy.future import select
    from app.models.goal import AppraisalGoal
    from app.exceptions import EntityNotFoundError
    
    # Find the appraisal goal to delete
    result = await db.execute(
        select(AppraisalGoal).where(
            AppraisalGoal.appraisal_id == appraisal_id,
            AppraisalGoal.goal_id == goal_id
        )
    )
    appraisal_goal = result.scalars().first()
    
    if not appraisal_goal:
        raise EntityNotFoundError("Appraisal Goal", f"appraisal_id={appraisal_id}, goal_id={goal_id}")
    
    await db.delete(appraisal_goal)
    await db.commit()


@router.delete("/{appraisal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal(
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete an appraisal.
    
    Args:
        appraisal_id: Appraisal ID
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Raises:
        EntityNotFoundError: If appraisal not found
    """
    await appraisal_service.delete(db, entity_id=appraisal_id)
    await db.commit()