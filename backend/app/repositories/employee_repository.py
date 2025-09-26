"""
Employee repository for database operations.

This module handles all direct database interactions
for the Employee entity.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload

from app.models.employee import Employee


class EmployeeRepository:
    """Repository for Employee database operations."""

    @staticmethod
    async def get_by_id(db: AsyncSession, emp_id: int) -> Optional[Employee]:
        result = await db.execute(
            select(Employee).where(Employee.emp_id == emp_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[Employee]:
        result = await db.execute(
            select(Employee).where(Employee.emp_email == email)
        )
        return result.scalars().first()

    @staticmethod
    async def get_multi(
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by=None
    ) -> List[Employee]:
        query = select(Employee)
        if filters:
            query = query.where(and_(*filters))
        if order_by:
            query = query.order_by(order_by)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, employee: Employee) -> Employee:
        db.add(employee)
        await db.flush()
        await db.refresh(employee)
        return employee

    @staticmethod
    async def update(db: AsyncSession, employee: Employee) -> Employee:
        await db.flush()
        await db.refresh(employee)
        return employee

    @staticmethod
    async def delete(db: AsyncSession, employee: Employee) -> None:
        await db.delete(employee)
        await db.flush()
