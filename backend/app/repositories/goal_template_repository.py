"""
Goal template repository for database operations.

This module handles all direct database interactions
for the GoalTemplate entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, insert

from app.models.goal import GoalTemplate, Category, goal_template_categories
from app.repositories.base_repository import BaseRepository


class GoalTemplateRepository(BaseRepository[GoalTemplate]):
    """Repository for GoalTemplate database operations."""

    def __init__(self):
        super().__init__(GoalTemplate)

    @property
    def entity_name(self) -> str:
        return "Goal Template"

    @property
    def id_field(self) -> str:
        return "temp_id"

    async def get_goal_template(self, db: AsyncSession, skip: int, limit: int) -> Optional[GoalTemplate]:
        result = await db.execute(
            select(GoalTemplate)
            .options(selectinload(GoalTemplate.categories))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_with_categories(
        self,
        db: AsyncSession,
        template_id: int
    ) -> Optional[GoalTemplate]:
        """Get a goal template with categories loaded."""
        query = (
            select(GoalTemplate)
            .options(selectinload(GoalTemplate.categories))
            .where(GoalTemplate.temp_id == template_id)
        )
        
        result = await db.execute(query)
        return result.scalars().first()

    async def create_with_categories(
        self,
        db: AsyncSession,
        *,
        template_data: dict,
        categories: List[Category]
    ) -> GoalTemplate:
        """Create a new goal template with category relationships."""
        db_template = GoalTemplate(
            temp_title=template_data.get("temp_title"),
            temp_description=template_data.get("temp_description"),
            temp_performance_factor=template_data.get("temp_performance_factor"),
            temp_importance=template_data.get("temp_importance"),
            temp_weightage=template_data.get("temp_weightage"),
            categories=categories
        )
        
        db.add(db_template)
        await db.flush()
        await db.refresh(db_template)
        return db_template

    async def update_template_categories(
        self,
        db: AsyncSession,
        template: GoalTemplate,
        categories: List[Category]
    ) -> None:
        """Update the categories associated with a template."""
        # Delete existing associations
        await db.execute(
            delete(goal_template_categories).where(
                goal_template_categories.c.template_id == template.temp_id
            )
        )
        
        # Insert associations for provided categories
        for category in categories:
            await db.execute(
                insert(goal_template_categories).values(
                    template_id=template.temp_id,
                    category_id=category.id
                )
            )
        await db.flush()

    async def get_or_create_category(
        self,
        db: AsyncSession,
        category_name: str
    ) -> Category:
        """Get an existing category or create a new one."""
        result = await db.execute(
            select(Category).where(Category.name == category_name)
        )
        category = result.scalars().first()
        
        if not category:
            category = Category(name=category_name)
            db.add(category)
            await db.flush()
            await db.refresh(category)
        
        return category