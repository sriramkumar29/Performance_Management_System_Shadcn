"""
Goal template repository for database operations.

This module handles all direct database interactions
for the GoalTemplate entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import GoalTemplate
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