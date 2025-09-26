"""
Appraisal Goal repository for database operations.

This module handles all direct database interactions
for the AppraisalGoal entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import AppraisalGoal
from app.repositories.base_repository import BaseRepository


class AppraisalGoalRepository(BaseRepository[AppraisalGoal]):
    """Repository for AppraisalGoal database operations."""

    def __init__(self):
        super().__init__(AppraisalGoal)

    @property
    def entity_name(self) -> str:
        return "Appraisal Goal"

    @property
    def id_field(self) -> str:
        return "id"