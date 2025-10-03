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
from app.exceptions import BaseCustomException

from app.db.database import get_db
from app.utils.logger import get_logger, build_log_context, sanitize_log_data
from app.exceptions.domain_exceptions import BaseDomainException, map_domain_exception_to_http_status
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

# Initialize logger
logger = get_logger(__name__)


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
    Create a new appraisal with comprehensive logging and error handling.
    
    Args:
        appraisal_data: Appraisal creation data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Created appraisal data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST / - Create appraisal - Type: {appraisal_data.appraisal_type_id}, Appraisee: {appraisal_data.appraisee_id}")
    
    try:
        db_appraisal = await appraisal_service.create_appraisal(
            db,
            appraisal_data=appraisal_data
        )
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Created appraisal with ID: {db_appraisal.appraisal_id}")
        return AppraisalResponse.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create appraisal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating appraisal"
            }
        )


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
    Get appraisals with filtering and comprehensive logging.
    
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
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET / - Get appraisals - skip: {pagination.skip}, limit: {pagination.limit}, filters: status={status_filter}, appraisee={appraisee_id}")
    
    try:
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
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(appraisals)} appraisals")
        return [AppraisalResponse.model_validate(appraisal) for appraisal in appraisals]
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get appraisals - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving appraisals"
            }
        )


@router.get("/{appraisal_id}", response_model=AppraisalWithGoals)
async def get_appraisal_by_id(
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Get appraisal by ID with goals and comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /{appraisal_id} - Get appraisal by ID")
    
    try:
        db_appraisal = await appraisal_service.get_appraisal_with_goals(
            db,
            appraisal_id
        )
        
        logger.info(f"{context}API_SUCCESS: Retrieved appraisal with goals - ID: {appraisal_id}")
        return AppraisalWithGoals.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get appraisal by ID - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving appraisal"
            }
        )


@router.put("/{appraisal_id}", response_model=AppraisalResponse)
async def update_appraisal(
    appraisal_data: AppraisalUpdate,
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalResponse:
    """
    Update an appraisal with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        appraisal_data: Updated appraisal data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Updated appraisal
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /{appraisal_id} - Update appraisal")
    
    try:
        db_appraisal = await appraisal_service.get_by_id_or_404(db, appraisal_id)
        
        updated_appraisal = await appraisal_service.update(
            db,
            db_obj=db_appraisal,
            obj_in=appraisal_data
        )
        
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Updated appraisal - ID: {appraisal_id}")
        return AppraisalResponse.model_validate(updated_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update appraisal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating appraisal"
            }
        )


@router.put("/{appraisal_id}/status", response_model=AppraisalResponse)
async def update_appraisal_status(
    appraisal_id: int = Path(..., gt=0),
    status_update: AppraisalStatusUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalResponse:
    """
    Update appraisal status with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        status_update: New status data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalResponse: Updated appraisal
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /{appraisal_id}/status - Update status to: {status_update.status}")
    
    try:
        db_appraisal = await appraisal_service.update_appraisal_status(
            db,
            appraisal_id=appraisal_id,
            new_status=status_update.status
        )
        
        logger.info(f"{context}API_SUCCESS: Updated appraisal status - ID: {appraisal_id}, Status: {status_update.status}")
        return AppraisalResponse.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update appraisal status - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating appraisal status"
            }
        )


@router.put("/{appraisal_id}/self-assessment", response_model=AppraisalWithGoals)
async def update_self_assessment(
    appraisal_id: int = Path(..., gt=0),
    assessment_data: SelfAssessmentUpdate = ...,
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Update self assessment for appraisal goals with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        assessment_data: Self assessment data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /{appraisal_id}/self-assessment - Update self assessment - Goals count: {len(assessment_data.goals)}")
    
    try:
        db_appraisal = await appraisal_service.update_self_assessment(
            db,
            appraisal_id=appraisal_id,
            goals_data=assessment_data.goals
        )
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Updated self assessment - Appraisal ID: {appraisal_id}")
        return AppraisalWithGoals.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update self assessment - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating self assessment"
            }
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
    Update appraiser evaluation for appraisal goals and overall assessment with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        evaluation_data: Appraiser evaluation data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /{appraisal_id}/appraiser-evaluation - Update appraiser evaluation - Goals count: {len(evaluation_data.goals)}")
    
    try:
        db_appraisal = await appraisal_service.update_appraiser_evaluation(
            db,
            appraisal_id=appraisal_id,
            goals_data=evaluation_data.goals,
            appraiser_overall_comments=evaluation_data.appraiser_overall_comments,
            appraiser_overall_rating=evaluation_data.appraiser_overall_rating
        )
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Updated appraiser evaluation - Appraisal ID: {appraisal_id}")
        return AppraisalWithGoals.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update appraiser evaluation - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating appraiser evaluation"
            }
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
    Update reviewer evaluation for overall assessment with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        evaluation_data: Reviewer evaluation data
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /{appraisal_id}/reviewer-evaluation - Update reviewer evaluation")
    
    try:
        db_appraisal = await appraisal_service.update_reviewer_evaluation(
            db,
            appraisal_id=appraisal_id,
            reviewer_overall_comments=evaluation_data.reviewer_overall_comments,
            reviewer_overall_rating=evaluation_data.reviewer_overall_rating
        )
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Updated reviewer evaluation - Appraisal ID: {appraisal_id}")
        return AppraisalWithGoals.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update reviewer evaluation - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while updating reviewer evaluation"
            }
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
    Add goals to an appraisal with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        request: Request containing goal IDs to add
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload  
    from app.models.goal import AppraisalGoal, Goal, Category
    from app.exceptions import EntityNotFoundError
    
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /{appraisal_id}/goals - Add goals to appraisal - Goals count: {len(request.goal_ids)}")
    
    try:
        # Add each goal to the appraisal if it doesn't already exist
        goals_added = 0
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
                goals_added += 1
        
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
        
        logger.info(f"{context}API_SUCCESS: Added {goals_added} goals to appraisal - Appraisal ID: {appraisal_id}")
        return AppraisalWithGoals.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to add goals to appraisal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while adding goals to appraisal"
            }
        )


@router.post("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def add_single_goal_to_appraisal(
    appraisal_id: int = Path(..., gt=0),
    goal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalWithGoals:
    """
    Add a single goal to an appraisal with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        goal_id: Goal ID to add
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /{appraisal_id}/goals/{goal_id} - Add single goal to appraisal")
    
    try:
        # Check if the goal already exists for this appraisal
        await appraisal_service.add_single_goal_to_appraisal(db, appraisal_id=appraisal_id, goal_id=goal_id)
        
        db_appraisal = await appraisal_service.update_appraisal_goal(db, appraisal_id)
        
        logger.info(f"{context}API_SUCCESS: Added single goal to appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        return AppraisalWithGoals.model_validate(db_appraisal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to add single goal to appraisal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while adding goal to appraisal"
            }
        )


@router.delete("/{appraisal_id}/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_goal_from_appraisal(
    appraisal_id: int = Path(..., gt=0),
    goal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Remove a goal from an appraisal with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        goal_id: Goal ID to remove
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /{appraisal_id}/goals/{goal_id} - Remove goal from appraisal")
    
    try:
        await appraisal_service.remove_goal_from_appraisal(db, appraisal_id, goal_id)
        
        logger.info(f"{context}API_SUCCESS: Removed goal from appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to remove goal from appraisal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while removing goal from appraisal"
            }
        )


@router.delete("/{appraisal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal(
    appraisal_id: int = Path(..., gt=0),
    db: AsyncSession = Depends(get_db),
    appraisal_service: AppraisalService = Depends(get_appraisal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete an appraisal with comprehensive logging.
    
    Args:
        appraisal_id: Appraisal ID
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /{appraisal_id} - Delete appraisal")
    
    try:
        await appraisal_service.delete(db, entity_id=appraisal_id)
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Deleted appraisal - ID: {appraisal_id}")
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - {str(e)}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to delete appraisal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while deleting appraisal"
            }
        )