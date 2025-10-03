"""
Goal repository for database operations.

This module handles all direct database interactions
for the Goal entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
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
