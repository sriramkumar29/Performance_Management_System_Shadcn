"""
Appraisal router for the Performance Management System.

This module provides REST API endpoints for appraisal management
with proper validation, error handling, and service layer integration.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.database import get_db
from app.models.employee import Employee
from app.models.appraisal import AppraisalStatus
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

router = APIRouter(dependencies=[Depends(get_current_user)])


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
    appraisal_id: int = Depends(validate_positive_integer),
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
    db_appraisal = await appraisal_service.get_by_id_or_404(
        db,
        appraisal_id,
        load_relationships=["appraisal_goals"]
    )
    
    return AppraisalWithGoals.model_validate(db_appraisal)


@router.put("/{appraisal_id}/status", response_model=AppraisalResponse)
async def update_appraisal_status(
    appraisal_id: int = Depends(validate_positive_integer),
    status_data: AppraisalStatusUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalResponse:
    """
    Update appraisal status.
    
    Args:
        appraisal_id: Appraisal ID
        status_data: New status data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Updated appraisal
        
    Raises:
        EntityNotFoundError: If appraisal not found
        StatusTransitionError: If status transition is invalid
        ValidationError: If validation fails
    """
    db_appraisal = await appraisal_service.update_appraisal_status(
        db,
        appraisal_id=appraisal_id,
        new_status=status_data.status
    )
    await db.commit()
    
    return AppraisalResponse.model_validate(db_appraisal)


@router.put("/{appraisal_id}/self-assessment", response_model=AppraisalWithGoals)
async def update_self_assessment(
    appraisal_id: int = Depends(validate_positive_integer),
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
    db_appraisal = await appraisal_service.update_self_assessment(
        db,
        appraisal_id=appraisal_id,
        goals_data=assessment_data.goals
    )
    await db.commit()
    
    return AppraisalWithGoals.model_validate(db_appraisal)


@router.post("/{appraisal_id}/goals", response_model=AppraisalWithGoals)
async def add_goals_to_appraisal(
    appraisal_id: int = Depends(validate_positive_integer),
    goal_ids: List[int] = ...,
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
    # Validate goal IDs
    from app.dependencies import validate_ids_list
    validated_goal_ids = validate_ids_list(goal_ids, "Goal IDs")
    
    db_appraisal = await appraisal_service.add_goals_to_appraisal(
        db,
        appraisal_id=appraisal_id,
        goal_ids=validated_goal_ids
    )
    await db.commit()
    
    return AppraisalWithGoals.model_validate(db_appraisal)


@router.delete("/{appraisal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal(
    appraisal_id: int = Depends(validate_positive_integer),
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