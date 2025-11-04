"""
Application role repository for database operations.
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.application_role import ApplicationRole
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, log_execution_time


class ApplicationRoleRepository(BaseRepository[ApplicationRole]):
    """Repository for ApplicationRole database operations."""

    def __init__(self):
        super().__init__(ApplicationRole)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Application Role"

    @property
    def id_field(self) -> str:
        return "app_role_id"

    @log_execution_time()
    async def get_by_name(
        self,
        db: AsyncSession,
        name: str
    ) -> Optional[ApplicationRole]:
        """Get application role by name."""
        context = build_log_context()
        self.logger.debug(f"{context}REPO_GET_BY_NAME: Getting app role - Name: {name}")

        try:
            query = select(ApplicationRole).where(ApplicationRole.app_role_name == name)
            result = await db.execute(query)
            role = result.scalars().first()

            if role:
                self.logger.debug(f"{context}REPO_GET_BY_NAME_SUCCESS: Found app role {role.app_role_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_NAME_NOT_FOUND: App role '{name}' not found")

            return role

        except Exception as e:
            error_msg = f"Error getting app role by name '{name}'"
            self.logger.error(f"{context}REPO_GET_BY_NAME_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"name": name, "original_error": str(e)})

    @log_execution_time()
    async def get_all_roles(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[ApplicationRole]:
        """Get all application roles ordered by name."""
        context = build_log_context()
        self.logger.debug(f"{context}REPO_GET_ALL: Getting all roles")

        try:
            query = select(ApplicationRole).order_by(ApplicationRole.app_role_name).offset(skip).limit(limit)
            result = await db.execute(query)
            roles = list(result.scalars().all())

            self.logger.debug(f"{context}REPO_GET_ALL_SUCCESS: Retrieved {len(roles)} roles")
            return roles

        except Exception as e:
            error_msg = "Error getting all application roles"
            self.logger.error(f"{context}REPO_GET_ALL_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def check_duplicate_name(
        self,
        db: AsyncSession,
        name: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if an application role with the same name exists."""
        context = build_log_context()
        self.logger.debug(f"{context}REPO_CHECK_DUPLICATE: Checking duplicate - Name: {name}")

        try:
            query = select(ApplicationRole).where(ApplicationRole.app_role_name == name)

            if exclude_id:
                query = query.where(ApplicationRole.app_role_id != exclude_id)

            result = await db.execute(query)
            exists = result.scalars().first() is not None

            self.logger.debug(f"{context}REPO_CHECK_DUPLICATE_RESULT: Duplicate exists: {exists}")
            return exists

        except Exception as e:
            error_msg = "Error checking duplicate application role name"
            self.logger.error(f"{context}REPO_CHECK_DUPLICATE_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"name": name, "original_error": str(e)})

    @log_execution_time()
    async def get_with_stats(
        self,
        db: AsyncSession,
        app_role_id: int
    ) -> Optional[tuple]:
        """Get application role with employee and template counts."""
        context = build_log_context()
        self.logger.debug(f"{context}REPO_GET_WITH_STATS: Getting app role with stats - ID: {app_role_id}")

        try:
            # Get the role
            role = await self.get_by_id(db, app_role_id)
            if not role:
                return None

            # Count employees
            from app.models.employee import Employee
            employee_count_query = select(func.count(Employee.emp_id)).where(
                Employee.application_role_id == app_role_id
            )
            employee_count_result = await db.execute(employee_count_query)
            employee_count = employee_count_result.scalar() or 0

            # Count template headers
            from app.models.goal import GoalTemplateHeader
            header_count_query = select(func.count(GoalTemplateHeader.header_id)).where(
                GoalTemplateHeader.application_role_id == app_role_id
            )
            header_count_result = await db.execute(header_count_query)
            header_count = header_count_result.scalar() or 0

            self.logger.debug(f"{context}REPO_GET_WITH_STATS_SUCCESS: Role {app_role_id} - Employees: {employee_count}, Headers: {header_count}")
            return (role, employee_count, header_count)

        except Exception as e:
            error_msg = f"Error getting app role with stats for ID {app_role_id}"
            self.logger.error(f"{context}REPO_GET_WITH_STATS_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"app_role_id": app_role_id, "original_error": str(e)})
