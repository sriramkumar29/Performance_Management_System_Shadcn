"""
Goals router for the Performance Management System.

This module provides REST API endpoints for goal and goal template management
with proper validation, error handling, and service layer integration.
"""

from fastapi import APIRouter, Depends, status
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
from app.services.goal_service import (
    GoalService,
    GoalTemplateService, 
    CategoryService,
    AppraisalGoalService
)

router = APIRouter(dependencies=[Depends(get_current_user)])


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
    Create a new category.
    
    Args:
        category: Category creation data
        db: Database session
        category_service: Category service instance
        current_user: Current authenticated user
        
    Returns:
        CategoryResponse: Created category data
    """
    db_category = await category_service.create(db, obj_in=category)
    await db.commit()
    
    return CategoryResponse.model_validate(db_category)


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    category_service: CategoryService = Depends(get_category_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[CategoryResponse]:
    """
    Get all categories.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        category_service: Category service instance
        current_user: Current authenticated user
        
    Returns:
        List[CategoryResponse]: List of categories
    """
    categories = await category_service.get_multi(
        db,
        skip=pagination.skip,
        limit=pagination.limit
    )
    
    return [CategoryResponse.model_validate(cat) for cat in categories]


# Goal Templates endpoints
@router.post("/templates", response_model=GoalTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_template(
    goal_template: GoalTemplateCreate,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateResponse:
    """
    Create a new goal template.
    
    Args:
        goal_template: Goal template creation data
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Returns:
        GoalTemplateResponse: Created goal template data with categories
        
    Raises:
        ValidationError: If template data is invalid
    """
    db_template = await template_service.create_template_with_categories(
        db, 
        template_data=goal_template
    )
    await db.commit()
    
    return GoalTemplateResponse.model_validate(db_template)


@router.get("/templates", response_model=List[GoalTemplateResponse])
async def read_goal_templates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
) -> List[GoalTemplateResponse]:
    """
    Get all goal templates.
    
    Args:
        skip: Number of records to skip
        limit: Number of records to return
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List[GoalTemplateResponse]: List of goal templates with categories
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.goal import GoalTemplate
    
    result = await db.execute(
        select(GoalTemplate)
        .options(selectinload(GoalTemplate.categories))
        .offset(skip)
        .limit(limit)
    )
    goal_templates = result.scalars().all()
    
    return [GoalTemplateResponse.model_validate(template) for template in goal_templates]


@router.get("/templates/{template_id}", response_model=GoalTemplateResponse)
async def read_goal_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateResponse:
    """
    Get a goal template by ID.
    
    Args:
        template_id: Goal template ID
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Returns:
        GoalTemplateResponse: Goal template data with categories
        
    Raises:
        EntityNotFoundError: If goal template not found
    """
    db_template = await template_service.get_template_with_categories(db, template_id)
    return GoalTemplateResponse.model_validate(db_template)


@router.put("/templates/{template_id}", response_model=GoalTemplateResponse)
async def update_goal_template(
    template_id: int,
    goal_template: GoalTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateResponse:
    """
    Update a goal template.
    
    Args:
        template_id: Goal template ID
        goal_template: Goal template update data
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Returns:
        GoalTemplateResponse: Updated goal template data with categories
        
    Raises:
        EntityNotFoundError: If goal template not found
    """
    updated_template = await template_service.update_template_with_categories(
        db,
        template_id=template_id,
        template_data=goal_template
    )
    await db.commit()
    
    return GoalTemplateResponse.model_validate(updated_template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    template_service: GoalTemplateService = Depends(get_goal_template_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete a goal template.
    
    Args:
        template_id: Goal template ID
        db: Database session
        template_service: Goal template service instance
        current_user: Current authenticated user
        
    Raises:
        EntityNotFoundError: If goal template not found
    """
    await template_service.delete(db, entity_id=template_id)
    await db.commit()


# Goals endpoints
@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalResponse:
    """
    Create a new goal.
    
    Args:
        goal: Goal creation data
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        GoalResponse: Created goal data
    """
    db_goal = await goal_service.create(db, obj_in=goal)
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
    
    return response_data


@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    db: AsyncSession = Depends(get_db),
    pagination: PaginationParams = Depends(get_pagination_params),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[GoalResponse]:
    """
    Get all goals.
    
    Args:
        db: Database session
        pagination: Pagination parameters
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        List[GoalResponse]: List of goals
    """
    goals = await goal_service.get_multi(
        db,
        skip=pagination.skip,
        limit=pagination.limit
    )
    
    return [GoalResponse.model_validate(goal) for goal in goals]


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalResponse:
    """
    Get a goal by ID.
    
    Args:
        goal_id: Goal ID
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        GoalResponse: Goal data
        
    Raises:
        EntityNotFoundError: If goal not found
    """
    db_goal = await goal_service.get_by_id_or_404(db, goal_id)
    
    return GoalResponse.model_validate(db_goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalResponse:
    """
    Update a goal.
    
    Args:
        goal_id: Goal ID
        goal: Goal update data
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Returns:
        GoalResponse: Updated goal data
        
    Raises:
        EntityNotFoundError: If goal not found
    """
    db_goal = await goal_service.get_by_id_or_404(db, goal_id)
    updated_goal = await goal_service.update(db, db_obj=db_goal, obj_in=goal)
    await db.commit()
    
    return GoalResponse.model_validate(updated_goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    goal_service: GoalService = Depends(get_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete a goal.
    
    Args:
        goal_id: Goal ID
        db: Database session
        goal_service: Goal service instance
        current_user: Current authenticated user
        
    Raises:
        EntityNotFoundError: If goal not found
    """
    await goal_service.delete(db, entity_id=goal_id)
    await db.commit()


# Appraisal Goals endpoints
@router.post("/appraisal-goals", response_model=AppraisalGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_goal(
    appraisal_goal: AppraisalGoalCreate,
    db: AsyncSession = Depends(get_db),
    appraisal_goal_service: AppraisalGoalService = Depends(get_appraisal_goal_service),
    current_user: Employee = Depends(get_current_active_user)
) -> AppraisalGoalResponse:
    """
    Create a new appraisal goal.
    
    Args:
        appraisal_goal: Appraisal goal creation data
        db: Database session
        appraisal_goal_service: Appraisal goal service instance
        current_user: Current authenticated user
        
    Returns:
        AppraisalGoalResponse: Created appraisal goal data
    """
    db_appraisal_goal = await appraisal_goal_service.create(db, obj_in=appraisal_goal)
    await db.commit()
    
    return AppraisalGoalResponse.model_validate(db_appraisal_goal)