"""
Category repository for database operations.

This module handles all direct database interactions
for the Category entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Category
from app.repositories.base_repository import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    """Repository for Category database operations."""

    def __init__(self):
        super().__init__(Category)

    @property
    def entity_name(self) -> str:
        return "Category"

    @property
    def id_field(self) -> str:
        return "id"