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
from app.utils.logger import get_logger, build_log_context, sanitize_log_data
from app.exceptions.domain_exceptions import (
    BaseDomainException, map_domain_exception_to_http_status
)

from app.routers.auth import get_current_user
from app.constants import (
    APPRAISAL_NOT_FOUND,
    GOAL_NOT_FOUND,
    GOAL_NOT_IN_APPRAISAL
)

router = APIRouter(dependencies=[Depends(get_current_user)])
logger = get_logger(__name__)

def get_appraisal_service() -> AppraisalService:
    """Dependency to get appraisal service instance."""
    return AppraisalService()


@router.post("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def add_goal_to_appraisal(
    appraisal_id: int,
    goal_id: int,
    appraisal_service = Depends(get_appraisal_service),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Add a goal to an appraisal with weightage validation.
    
    Args:
        appraisal_id: ID of the appraisal to add goal to
        goal_id: ID of the goal to add
        appraisal_service: Appraisal service instance
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /appraisals/{appraisal_id}/goals/{goal_id} - Add goal to appraisal")
    
    try:
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
        result = await appraisal_service.load_appraisal(db, appraisal_id, db_appraisal)
        
        logger.info(f"{context}API_SUCCESS: Added goal {goal_id} to appraisal {appraisal_id}")
        return result
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        raise HTTPException(status_code=status_code, detail=e.message)
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to add goal {goal_id} to appraisal {appraisal_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while adding the goal to appraisal"
        )


@router.delete("/{appraisal_id}/goals/{goal_id}", response_model=AppraisalWithGoals)
async def remove_goal_from_appraisal(
    appraisal_id: int,
    goal_id: int,
    appraisal_service = Depends(get_appraisal_service),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Remove a goal from an appraisal.
    
    Args:
        appraisal_id: ID of the appraisal to remove goal from
        goal_id: ID of the goal to remove
        appraisal_service: Appraisal service instance
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        AppraisalWithGoals: Updated appraisal with goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /appraisals/{appraisal_id}/goals/{goal_id} - Remove goal from appraisal")
    
    try:
        # Check if appraisal exists
        db_appraisal = await appraisal_service.get_appraisal(appraisal_id)
        
        # Find and remove the appraisal goal
        await appraisal_service.remove_goal_from_appraisal(db, appraisal_id, goal_id)

        # Delete the appraisal-goal link first
        await appraisal_service.if_no_link_exists_delete_appraisal(db, goal_id)

        # Re-select with eager-loaded nested relations for safe serialization
        result = await appraisal_service.load_appraisal(db, appraisal_id, db_appraisal)
        
        logger.info(f"{context}API_SUCCESS: Removed goal {goal_id} from appraisal {appraisal_id}")
        return result
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        raise HTTPException(status_code=status_code, detail=e.message)
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to remove goal {goal_id} from appraisal {appraisal_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while removing the goal from appraisal"
        )


@router.get("/{appraisal_id}/weightage-summary")
async def get_appraisal_weightage_summary(
    appraisal_id: int,
    appraisal_service = Depends(get_appraisal_service),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get weightage summary for an appraisal.
    
    Args:
        appraisal_id: ID of the appraisal to get weightage summary for
        appraisal_service: Appraisal service instance
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        dict: Weightage summary with total, remaining, and individual goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /appraisals/{appraisal_id}/weightage-summary")
    
    try:
        # Check if appraisal exists
        await appraisal_service.check_if_appraisal_exist(db, appraisal_id)

        # Calculate current total weightage
        current_total_weightage = appraisal_service.calculate_current_total_weightage(db, appraisal_id)
        
        # Get individual goal weightages
        goals = appraisal_service.get_individual_goal_weightages(db, appraisal_id)
        
        result = {
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
        
        logger.info(f"{context}API_SUCCESS: Retrieved weightage summary for appraisal {appraisal_id} - Total: {current_total_weightage}%")
        return result
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        raise HTTPException(status_code=status_code, detail=e.message)
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get weightage summary for appraisal {appraisal_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving the weightage summary"
        )



@router.get("/categories", response_model=List[dict])
async def get_categories(
    db: AsyncSession = Depends(get_db), 
    appraisal_service = Depends(get_appraisal_service),
    current_user = Depends(get_current_user)
):
    """
    Get all categories for dropdown selection.
    
    Args:
        db: Database session
        appraisal_service: Appraisal service instance
        current_user: Current authenticated user
        
    Returns:
        List[dict]: List of categories with id and name
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /categories")
    
    try:
        categories = await appraisal_service.get_categories(db)
        
        result = [
            {
                "id": category.id,
                "name": category.name
            }
            for category in categories
        ]
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(result)} categories")
        return result
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        raise HTTPException(status_code=status_code, detail=e.message)
        
    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve categories - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving categories"
        )
