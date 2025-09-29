"""
Category repository for database operations.

This module handles all direct database interactions
for the Category entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

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

    async def get_by_name(
        self,
        db: AsyncSession,
        name: str
    ) -> Optional[Category]:
        """Get category by name."""
        result = await db.execute(
            select(Category).where(Category.name == name)
        )
        return result.scalars().first()

    async def get_or_create_by_name(
        self,
        db: AsyncSession,
        name: str
    ) -> Category:
        """Get category by name or create if it doesn't exist."""
        category = await self.get_by_name(db, name)
        if not category:
            category = Category(name=name)
            db.add(category)
            await db.flush()
            await db.refresh(category)
        return category
    
    async def get_categories(self, db: AsyncSession) -> List[Category]:
        """Get all categories."""
        result = await db.execute(select(Category).order_by(Category.name))
        return result.scalars().all()