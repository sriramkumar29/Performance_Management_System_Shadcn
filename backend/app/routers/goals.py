"""
Goals router for the Performance Management System.

This module provides REST API endpoints for goal and goal template management
with proper validation, error handling, and service layer integration.
"""

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.models.employee import Employee
from app.schemas.goal import (
    GoalTemplateCreate,
    GoalTemplateUpdate,
    GoalTemplateResponse,
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    CategoryCreate,
    CategoryResponse,
    AppraisalGoalCreate,
    AppraisalGoalUpdate,
    AppraisalGoalResponse
)
from app.routers.auth import get_current_user, get_current_active_user
from app.dependencies import (
    get_pagination_params,
    PaginationParams
)
from app.utils.logger import get_logger, log_execution_time, log_exception, build_log_context, sanitize_log_data
from app.exceptions.domain_exceptions import (
    BaseDomainException, BaseServiceException, BaseRepositoryException,
    map_domain_exception_to_http_status
)
from app.services.goal_service import (
    GoalService,
    GoalTemplateService, 
    CategoryService,
    AppraisalGoalService,
    
)

router = APIRouter(dependencies=[Depends(get_current_user)])
logger = get_logger(__name__)


# Dependency providers
def get_goal_template_service() -> GoalTemplateService:
    """Dependency to get goal template service instance."""
    return GoalTemplateService()


def get_goal_service() -> GoalService:
    """Dependency to get goal service instance."""
    return GoalService()


def get_category_service() -> CategoryService:
    """Dependency to get category service instance."""
    return CategoryService()


def get_appraisal_goal_service() -> AppraisalGoalService:
    """Dependency to get appraisal goal service instance."""
    return AppraisalGoalService()


# Categories endpoints
@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service),
    current_user: Employee = Depends(get_current_active_user)
) -> CategoryResponse:
    """
    Create a new category with proper error handling and logging.
    
    Args:
        category: Category creation data
        db: Database session
        category_service: Category service instance
        current_user: Current authenticated user
        
    Returns:
        CategoryResponse: Created category data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /categories - Name: {category.name}")
    
    try:
        db_category = await category_service.create(db, obj_in=category)
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Created category - ID: {db_category.id}")
        return CategoryResponse.model_validate(db_category)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create category - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating the category"
            }
        )


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    category_service: CategoryService = Depends(get_category_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[CategoryResponse]:
    """
    Get all categories with proper error handling and logging.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        category_service: Category service instance
        current_user: Current authenticated user
        
    Returns:
        List[CategoryResponse]: List of categories
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /categories - skip: {pagination.skip}, limit: {pagination.limit}")
    
    try:
        categories = await category_service.get_multi(
            db,
            skip=pagination.skip,
            limit=pagination.limit
        )
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(categories)} categories")
        return [CategoryResponse.model_validate(cat) for cat in categories]
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve categories - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving categories"
            }
        )


# Goal Templates endpoints
@router.post("/templates", response_model=GoalTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_template(
    goal_template: GoalTemplateCreate,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateResponse:
    """
    Create a new goal template with proper error handling and logging.
    
    Args:
        goal_template: Goal template creation data
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Returns:
        GoalTemplateResponse: Created goal template data with categories
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /templates - Title: {goal_template.temp_title}")
    
    try:
        db_template = await template_service.create_template_with_categories(
            db, 
            template_data=goal_template
        )
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Created goal template - ID: {db_template.temp_id}")
        return GoalTemplateResponse.model_validate(db_template)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create goal template - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating the goal template"
            }
        )


@router.get("/templates", response_model=List[GoalTemplateResponse])
async def read_goal_templates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user),
    template_service: GoalTemplateService = Depends(get_goal_template_service)
) -> List[GoalTemplateResponse]:
    """
    Get all goal templates with proper error handling and logging.
    
    Args:
        skip: Number of records to skip
        limit: Number of records to return
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List[GoalTemplateResponse]: List of goal templates with categories
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /templates - skip: {skip}, limit: {limit}")
    
    try:
        goal_templates = await template_service.get_goal_template(db, skip, limit)
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(goal_templates)} goal templates")
        return [GoalTemplateResponse.model_validate(template) for template in goal_templates]
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve goal templates - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving goal templates"
            }
        )


@router.get("/templates/{template_id}", response_model=GoalTemplateResponse)
async def read_goal_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateResponse:
    """
    Get a goal template by ID with proper error handling and logging.
    
    Args:
        template_id: Goal template ID
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Returns:
        GoalTemplateResponse: Goal template data with categories
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /templates/{template_id}")
    
    try:
        db_template = await template_service.get_template_with_categories(db, template_id)
        
        logger.info(f"{context}API_SUCCESS: Retrieved goal template - ID: {template_id}")
        return GoalTemplateResponse.model_validate(db_template)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve goal template {template_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": f"An unexpected error occurred while retrieving goal template {template_id}"
            }
        )


@router.put("/templates/{template_id}", response_model=GoalTemplateResponse)
async def update_goal_template(
    template_id: int,
    goal_template: GoalTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateResponse:
    """
    Update a goal template with proper error handling and logging.
    
    Args:
        template_id: Goal template ID
        goal_template: Goal template update data
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Returns:
        GoalTemplateResponse: Updated goal template data with categories
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /templates/{template_id}")
    
    try:
        updated_template = await template_service.update_template_with_categories(
            db,
            template_id=template_id,
            template_data=goal_template
        )
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Updated goal template - ID: {template_id}")
        return GoalTemplateResponse.model_validate(updated_template)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update goal template {template_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": f"An unexpected error occurred while updating goal template {template_id}"
            }
        )


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete a goal template with proper error handling and logging.
    
    Args:
        template_id: Goal template ID
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /templates/{template_id}")
    
    try:
        await template_service.delete(db, entity_id=template_id)
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Deleted goal template - ID: {template_id}")
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to delete goal template {template_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": f"An unexpected error occurred while deleting goal template {template_id}"
            }
        )


# Goals endpoints
@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalResponse:
    """
    Create a new goal with proper error handling and logging.
    
    Args:
        goal: Goal creation data
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        GoalResponse: Created goal data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /goals - Title: {goal.goal_title}")
    
    try:
        db_goal = await goal_service.create(db, obj_in=goal, current_user=current_user)
        await db.commit()
        await db.refresh(db_goal)
        
        # For now, create response without loading category relationship
        response_data = GoalResponse(
            goal_id=db_goal.goal_id,
            goal_template_id=db_goal.goal_template_id,
            category_id=db_goal.category_id,
            goal_title=db_goal.goal_title,
            goal_description=db_goal.goal_description,
            goal_performance_factor=db_goal.goal_performance_factor,
            goal_importance=db_goal.goal_importance,
            goal_weightage=db_goal.goal_weightage,
            category=None  # Set to None for now to avoid relationship loading issues
        )
        
        logger.info(f"{context}API_SUCCESS: Created goal - ID: {db_goal.goal_id}")
        return response_data
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create goal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating the goal"
            }
        )


@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[GoalResponse]:
    """
    Get all goals with proper error handling and logging.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        List[GoalResponse]: List of goals
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /goals - skip: {pagination.skip}, limit: {pagination.limit}")
    
    try:
        goals = await goal_service.get_multi(
            db,
            skip=pagination.skip,
            limit=pagination.limit
        )
        
        logger.info(f"{context}API_SUCCESS: Retrieved {len(goals)} goals")
        return [GoalResponse.model_validate(goal) for goal in goals]
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve goals - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving goals"
            }
        )


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalResponse:
    """
    Get a goal by ID with proper error handling and logging.
    
    Args:
        goal_id: Goal ID
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        GoalResponse: Goal data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /goals/{goal_id}")
    
    try:
        db_goal = await goal_service.get_by_id_or_404(db, goal_id)
        
        logger.info(f"{context}API_SUCCESS: Retrieved goal - ID: {goal_id}")
        return GoalResponse.model_validate(db_goal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to retrieve goal {goal_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": f"An unexpected error occurred while retrieving goal {goal_id}"
            }
        )


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalResponse:
    """
    Update a goal with proper error handling and logging.
    
    Args:
        goal_id: Goal ID
        goal: Goal update data
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        GoalResponse: Updated goal data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: PUT /goals/{goal_id}")
    
    try:
        db_goal = await goal_service.get_by_id_or_404(db, goal_id)
        await goal_service.update(db, db_obj=db_goal, obj_in=goal)
        await db.commit()
        
        # Reload the goal with relationships for the response
        final_goal = await goal_service.get_by_id_or_404(db, goal_id, load_relationships=["category"])
        
        logger.info(f"{context}API_SUCCESS: Updated goal - ID: {goal_id}")
        return GoalResponse.model_validate(final_goal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to update goal {goal_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": f"An unexpected error occurred while updating goal {goal_id}"
            }
        )


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete a goal with proper error handling and logging.
    
    Args:
        goal_id: Goal ID
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: DELETE /goals/{goal_id}")
    
    try:
        await goal_service.delete(db, entity_id=goal_id)
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Deleted goal - ID: {goal_id}")
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to delete goal {goal_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": f"An unexpected error occurred while deleting goal {goal_id}"
            }
        )


# Appraisal Goals endpoints
@router.post("/appraisal-goals", response_model=AppraisalGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_goal(
    appraisal_goal: AppraisalGoalCreate,
    db: AsyncSession = Depends(get_db),
    appraisal_goal_service: AppraisalGoalService = Depends(get_appraisal_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalGoalResponse:
    """
    Create a new appraisal goal with proper error handling and logging.
    
    Args:
        appraisal_goal: Appraisal goal creation data
        db: Database session
        appraisal_goal_service: Appraisal goal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalGoalResponse: Created appraisal goal data
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: POST /appraisal-goals - {sanitize_log_data(appraisal_goal.model_dump())}")
    
    try:
        db_appraisal_goal = await appraisal_goal_service.create(db, obj_in=appraisal_goal)
        await db.commit()
        
        logger.info(f"{context}API_SUCCESS: Created appraisal goal with ID: {db_appraisal_goal.appraisal_goal_id}")
        return AppraisalGoalResponse.model_validate(db_appraisal_goal)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        await db.rollback()
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_ERROR: {e.__class__.__name__} - {e.message}")
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": e.message,
                "details": e.details
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        await db.rollback()
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to create appraisal goal - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while creating the appraisal goal"
            }
        )