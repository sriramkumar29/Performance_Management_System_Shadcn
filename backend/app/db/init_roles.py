"""
Initialize roles table with predefined roles.

This script seeds the roles table with the standard role hierarchy:
1. Employee (Level 1)
2. Lead (Level 2)
3. Manager (Level 3)
4. CEO (Level 4)
5. Admin (Level 5)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.role import Role
from app.constants import (
    ROLE_ID_EMPLOYEE, ROLE_ID_LEAD, ROLE_ID_MANAGER, ROLE_ID_CEO, ROLE_ID_ADMIN,
    ROLE_NAME_EMPLOYEE, ROLE_NAME_LEAD, ROLE_NAME_MANAGER, ROLE_NAME_CEO, ROLE_NAME_ADMIN
)
from app.utils.logger import get_database_logger

logger = get_database_logger()


async def init_roles(db: AsyncSession) -> None:
    """
    Initialize roles table with predefined roles.

    Args:
        db: Database session
    """
    try:
        logger.info("Initializing roles table...")

        # Define the roles with explicit IDs
        roles_data = [
            {"id": ROLE_ID_EMPLOYEE, "role_name": ROLE_NAME_EMPLOYEE},
            {"id": ROLE_ID_LEAD, "role_name": ROLE_NAME_LEAD},
            {"id": ROLE_ID_MANAGER, "role_name": ROLE_NAME_MANAGER},
            {"id": ROLE_ID_CEO, "role_name": ROLE_NAME_CEO},
            {"id": ROLE_ID_ADMIN, "role_name": ROLE_NAME_ADMIN},
        ]

        # Check if roles already exist
        from sqlalchemy import select
        result = await db.execute(select(Role))
        existing_roles = result.scalars().all()

        if existing_roles:
            logger.info(f"Roles table already has {len(existing_roles)} roles. Skipping initialization.")
            return

        # Insert roles
        for role_data in roles_data:
            role = Role(**role_data)
            db.add(role)
            logger.info(f"Created role: {role_data['role_name']} (ID: {role_data['id']})")

        await db.commit()
        logger.info("Roles table initialized successfully with 5 roles")

    except Exception as e:
        logger.error(f"Failed to initialize roles table: {str(e)}")
        await db.rollback()
        raise
