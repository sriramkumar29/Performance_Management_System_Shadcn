from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_
from typing import List

from app.db.database import get_db
from app.models.goal import GoalTemplate, Goal, Category, AppraisalGoal
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

from app.routers.auth import get_current_user
from app.constants import (
    GOAL_NOT_FOUND,
    GOAL_TEMPLATE_NOT_FOUND, 
    APPRAISAL_GOAL_NOT_FOUND,
    get_entity_not_found_message
)

router = APIRouter(dependencies=[Depends(get_current_user)])


# Categories endpoints
@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new category."""
    
    # Check if category already exists
    result = await db.execute(select(Category).where(Category.name == category.name))
    existing_category = result.scalars().first()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    # Create new category
    db_category = Category(**category.model_dump())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    
    return db_category


@router.get("/categories", response_model=List[CategoryResponse])
async def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all categories."""
    
    result = await db.execute(select(Category).offset(skip).limit(limit))
    categories = result.scalars().all()
    
    return categories


# Goal Templates endpoints
@router.post("/templates", response_model=GoalTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_goal_template(
    goal_template: GoalTemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new goal template."""
    
    # Get or create categories
    categories = []
    for category_name in goal_template.categories:
        result = await db.execute(select(Category).where(Category.name == category_name))
        category = result.scalars().first()
        
        if not category:
            category = Category(name=category_name)
            db.add(category)
            await db.flush()
        
        categories.append(category)
    
    # Create new goal template
    db_goal_template = GoalTemplate(
        temp_title=goal_template.temp_title,
        temp_description=goal_template.temp_description,
        temp_performance_factor=goal_template.temp_performance_factor,
        temp_importance=goal_template.temp_importance,
        temp_weightage=goal_template.temp_weightage,
        categories=categories
    )
    
    db.add(db_goal_template)
    await db.commit()
    # Re-select with eager-loaded categories
    result = await db.execute(
        select(GoalTemplate).options(selectinload(GoalTemplate.categories)).where(GoalTemplate.temp_id == db_goal_template.temp_id)
    )
    loaded_template = result.scalars().first()
    
    return loaded_template


@router.get("/templates", response_model=List[GoalTemplateResponse])
async def read_goal_templates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all goal templates."""
    
    result = await db.execute(
        select(GoalTemplate).options(selectinload(GoalTemplate.categories)).offset(skip).limit(limit)
    )
    goal_templates = result.scalars().all()
    
    return goal_templates


@router.get("/templates/{template_id}", response_model=GoalTemplateResponse)
async def read_goal_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a goal template by ID."""
    
    result = await db.execute(
        select(GoalTemplate).options(selectinload(GoalTemplate.categories)).where(GoalTemplate.temp_id == template_id)
    )
    goal_template = result.scalars().first()
    
    if not goal_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GOAL_TEMPLATE_NOT_FOUND
        )
    
    return goal_template


@router.put("/templates/{template_id}", response_model=GoalTemplateResponse)
async def update_goal_template(
    template_id: int,
    goal_template: GoalTemplateUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a goal template."""
    
    result = await db.execute(select(GoalTemplate).where(GoalTemplate.temp_id == template_id))
    db_goal_template = result.scalars().first()
    
    if not db_goal_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GOAL_TEMPLATE_NOT_FOUND
        )
    
    # Update goal template fields
    update_data = goal_template.model_dump(exclude={"categories"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_goal_template, key, value)
    
    # Update categories if provided
    if goal_template.categories is not None:
        # Clear existing categories
        db_goal_template.categories = []
        
        # Add new categories
        for category_name in goal_template.categories:
            result = await db.execute(select(Category).where(Category.name == category_name))
            category = result.scalars().first()
            
            if not category:
                category = Category(name=category_name)
                db.add(category)
                await db.flush()
            
            db_goal_template.categories.append(category)
    
    await db.commit()
    await db.refresh(db_goal_template)
    
    return db_goal_template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a goal template."""
    
    result = await db.execute(select(GoalTemplate).where(GoalTemplate.temp_id == template_id))
    db_goal_template = result.scalars().first()
    
    if not db_goal_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GOAL_TEMPLATE_NOT_FOUND
        )
    
    await db.delete(db_goal_template)
    await db.commit()
    
    return None


# Goals endpoints
@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new goal."""
    
    # Check if goal template exists if provided
    if goal.goal_template_id:
        result = await db.execute(select(GoalTemplate).where(GoalTemplate.temp_id == goal.goal_template_id))
        goal_template = result.scalars().first()
        
        if not goal_template:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=GOAL_TEMPLATE_NOT_FOUND
            )
    
    # Validate category if provided
    if goal.category_id:
        result = await db.execute(select(Category).where(Category.id == goal.category_id))
        category = result.scalars().first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_entity_not_found_message("Category", goal.category_id)
            )
    
    # Create new goal
    db_goal = Goal(**goal.model_dump())
    db.add(db_goal)
    await db.commit()
    # Re-select with eager-loaded category to avoid async lazy load during serialization
    result = await db.execute(
        select(Goal).options(selectinload(Goal.category)).where(Goal.goal_id == db_goal.goal_id)
    )
    loaded_goal = result.scalars().first()
    return loaded_goal


@router.get("/", response_model=List[GoalResponse])
async def read_goals(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all goals."""
    
    result = await db.execute(
        select(Goal).options(selectinload(Goal.category)).offset(skip).limit(limit)
    )
    goals = result.scalars().all()
    
    return goals


@router.get("/{goal_id}", response_model=GoalResponse)
async def read_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a goal by ID."""
    
    result = await db.execute(
        select(Goal).options(selectinload(Goal.category)).where(Goal.goal_id == goal_id)
    )
    goal = result.scalars().first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GOAL_NOT_FOUND
        )
    
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal: GoalUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a goal."""
    
    result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
    db_goal = result.scalars().first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GOAL_NOT_FOUND
        )
    
    # Update goal
    update_data = goal.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_goal, key, value)
    
    await db.commit()
    # Re-select with eager-loaded category
    result = await db.execute(
        select(Goal).options(selectinload(Goal.category)).where(Goal.goal_id == db_goal.goal_id)
    )
    loaded_goal = result.scalars().first()
    
    return loaded_goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a goal."""
    
    # Eager load the goal with its relationships to avoid lazy loading issues
    result = await db.execute(
        select(Goal)
        .options(selectinload(Goal.category))
        .where(Goal.goal_id == goal_id)
    )
    db_goal = result.scalars().first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GOAL_NOT_FOUND
        )
    
    # Do not allow deleting a goal that is linked to any appraisal
    result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id))
    linked = result.scalars().first()
    if linked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete goal: it is linked to an appraisal"
        )
    
    await db.delete(db_goal)
    await db.commit()
    
    return None


# Appraisal Goals endpoints
@router.post("/appraisal-goals", response_model=AppraisalGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_appraisal_goal(
    appraisal_goal: AppraisalGoalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appraisal goal."""
    
    # Check if appraisal goal already exists
    result = await db.execute(
        select(AppraisalGoal).where(
            and_(
                AppraisalGoal.appraisal_id == appraisal_goal.appraisal_id,
                AppraisalGoal.goal_id == appraisal_goal.goal_id
            )
        )
    )
    existing_appraisal_goal = result.scalars().first()
    
    if existing_appraisal_goal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This goal is already assigned to this appraisal"
        )
    
    # Prevent attaching the same goal to a different appraisal
    result = await db.execute(
        select(AppraisalGoal).where(AppraisalGoal.goal_id == appraisal_goal.goal_id)
    )
    existing_link_any = result.scalars().first()
    if existing_link_any and existing_link_any.appraisal_id != appraisal_goal.appraisal_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal is already assigned to a different appraisal"
        )
    
    # Create new appraisal goal
    db_appraisal_goal = AppraisalGoal(**appraisal_goal.model_dump())
    db.add(db_appraisal_goal)
    await db.commit()
    
    # Re-select with eager-loaded relationships to avoid lazy loading issues
    result = await db.execute(
        select(AppraisalGoal)
        .options(
            selectinload(AppraisalGoal.goal)
            .selectinload(Goal.category)
        )
        .where(AppraisalGoal.id == db_appraisal_goal.id)
    )
    loaded_appraisal_goal = result.scalars().first()
    
    return loaded_appraisal_goal


@router.get("/appraisal-goals", response_model=List[AppraisalGoalResponse])
async def read_appraisal_goals(
    appraisal_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all appraisal goals, optionally filtered by appraisal ID."""
    
    query = select(AppraisalGoal)
    
    if appraisal_id:
        query = query.where(AppraisalGoal.appraisal_id == appraisal_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    appraisal_goals = result.scalars().all()
    
    return appraisal_goals


@router.get("/appraisal-goals/{appraisal_goal_id}", response_model=AppraisalGoalResponse)
async def read_appraisal_goal(
    appraisal_goal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get an appraisal goal by ID."""
    
    result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.id == appraisal_goal_id))
    appraisal_goal = result.scalars().first()
    
    if not appraisal_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APPRAISAL_GOAL_NOT_FOUND
        )
    
    return appraisal_goal


@router.put("/appraisal-goals/{appraisal_goal_id}", response_model=AppraisalGoalResponse)
async def update_appraisal_goal(
    appraisal_goal_id: int,
    appraisal_goal: AppraisalGoalUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an appraisal goal."""
    
    result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.id == appraisal_goal_id))
    db_appraisal_goal = result.scalars().first()
    
    if not db_appraisal_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APPRAISAL_GOAL_NOT_FOUND
        )
    
    # Update appraisal goal
    update_data = appraisal_goal.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_appraisal_goal, key, value)
    
    await db.commit()
    await db.refresh(db_appraisal_goal)
    
    return db_appraisal_goal


@router.delete("/appraisal-goals/{appraisal_goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appraisal_goal(
    appraisal_goal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an appraisal goal."""
    
    result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.id == appraisal_goal_id))
    db_appraisal_goal = result.scalars().first()
    
    if not db_appraisal_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APPRAISAL_GOAL_NOT_FOUND
        )
    
    # Delete the link record first
    goal_id = db_appraisal_goal.goal_id
    await db.delete(db_appraisal_goal)
    # Flush so subsequent queries see the deletion
    await db.flush()

    # If no other appraisal references this goal, delete the goal itself
    result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id))
    remaining_link = result.scalars().first()
    if not remaining_link:
        result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
        db_goal = result.scalars().first()
        if db_goal:
            await db.delete(db_goal)
    
    await db.commit()
    
    return None
