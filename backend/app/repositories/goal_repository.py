"""
Goal repository for database operations.

This module handles all direct database interactions
for the Goal entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.models.goal import goal_categories, Category
from sqlalchemy.future import select
from sqlalchemy import delete, insert
from sqlalchemy.orm import selectinload
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, log_execution_time


class GoalRepository(BaseRepository[Goal]):
    """Repository for Goal database operations with comprehensive logging."""

    def __init__(self):
        super().__init__(Goal)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Goal"

    @property
    def id_field(self) -> str:
        return "goal_id"

    @log_execution_time()
    async def create_with_categories(self, db: AsyncSession, *, obj_data: dict, category_ids: Optional[List[int]] = None) -> Goal:
        """Create a new goal and attach category associations."""
        context = build_log_context()
        title = obj_data.get("goal_title", "unknown")

        self.logger.debug(f"{context}REPO_CREATE_WITH_CATEGORIES: Creating goal - Title: {title}, Categories: {category_ids}")

        try:
            db_goal = Goal(**obj_data)
            db.add(db_goal)
            await db.flush()

            if category_ids:
                for cid in category_ids:
                    await db.execute(insert(goal_categories).values(goal_id=db_goal.goal_id, category_id=cid))
                await db.flush()

            await db.refresh(db_goal)
            self.logger.info(f"{context}REPO_CREATE_WITH_CATEGORIES_SUCCESS: Created goal - ID: {db_goal.goal_id}")
            return db_goal

        except Exception as e:
            await db.rollback()
            self.logger.error(f"{context}REPO_CREATE_WITH_CATEGORIES_ERROR: Failed to create goal - Error: {str(e)}")
            raise RepositoryException("Error creating goal with categories", details={"title": title, "original_error": str(e)})

    @log_execution_time()
    async def update_categories(self, db: AsyncSession, goal: Goal, category_ids: Optional[List[int]] = None) -> None:
        """Replace category associations for a goal."""
        context = build_log_context()
        gid = getattr(goal, self.id_field)

        self.logger.debug(f"{context}REPO_UPDATE_GOAL_CATEGORIES: Updating categories for goal {gid} -> {category_ids}")

        try:
            # Delete existing associations
            await db.execute(delete(goal_categories).where(goal_categories.c.goal_id == gid))

            # Insert new associations
            if category_ids:
                for cid in category_ids:
                    await db.execute(insert(goal_categories).values(goal_id=gid, category_id=cid))

            await db.flush()
            self.logger.info(f"{context}REPO_UPDATE_GOAL_CATEGORIES_SUCCESS: Updated categories for goal {gid}")

        except Exception as e:
            await db.rollback()
            self.logger.error(f"{context}REPO_UPDATE_GOAL_CATEGORIES_ERROR: Failed updating categories for goal {gid} - {str(e)}")
            raise RepositoryException("Error updating goal categories", details={"goal_id": gid, "original_error": str(e)})

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, entity_id: int, *, load_relationships: Optional[List[str]] = None) -> Optional[Goal]:
        # Override to allow eager loading of categories relationship
        query = select(self.model).where(getattr(self.model, self.id_field) == entity_id)

        if load_relationships:
            for rel in load_relationships:
                query = query.options(selectinload(getattr(self.model, rel)))

        result = await db.execute(query)
        return result.scalars().first()
