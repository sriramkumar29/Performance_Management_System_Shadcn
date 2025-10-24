"""
Roles router for the Performance Management System.

This module provides API endpoints for role management.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.models.role import Role
from app.schemas.role import RoleResponse
from app.dependencies.auth import get_current_active_user
from app.models.employee import Employee
from sqlalchemy import select

router = APIRouter()


@router.get("/", response_model=List[RoleResponse])
async def get_roles(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_active_user)
):
    """
    Get all available roles.

    Returns:
        List[RoleResponse]: List of all roles
    """
    result = await db.execute(select(Role).order_by(Role.id))
    roles = result.scalars().all()
    return roles
