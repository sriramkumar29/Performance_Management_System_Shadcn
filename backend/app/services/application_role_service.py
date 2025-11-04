"""
Application role service for business logic.
"""

from typing import List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application_role import ApplicationRole
from app.schemas.application_role import ApplicationRoleCreate, ApplicationRoleUpdate
from app.services.base_service import BaseService
from app.repositories.application_role_repository import ApplicationRoleRepository
from app.exceptions.domain_exceptions import (
    EntityNotFoundError as DomainEntityNotFoundError,
    BusinessRuleViolationError,
    DuplicateEntryError
)
from app.utils.logger import get_logger, log_execution_time, build_log_context


class ApplicationRoleService(BaseService[ApplicationRole, ApplicationRoleCreate, ApplicationRoleUpdate]):
    """Service class for application role operations."""

    def __init__(self):
        super().__init__(ApplicationRole)
        self.repository = ApplicationRoleRepository()
        self.logger = get_logger(__name__)
        self.logger.debug("ApplicationRoleService initialized successfully")

    @property
    def entity_name(self) -> str:
        return "ApplicationRole"

    @property
    def id_field(self) -> str:
        return "app_role_id"

    @log_execution_time()
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: ApplicationRoleCreate,
        current_user: Optional[Any] = None
    ) -> ApplicationRole:
        """Create a new application role with validation."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_CREATE: Creating app role - Name: {obj_in.app_role_name}")

        try:
            # Check for duplicate name
            duplicate_exists = await self.repository.check_duplicate_name(db, obj_in.app_role_name)

            if duplicate_exists:
                error_msg = f"Application role '{obj_in.app_role_name}' already exists"
                self.logger.warning(f"{context}SERVICE_CREATE_DUPLICATE: {error_msg}")
                raise DuplicateEntryError(error_msg)

            # Create the role
            role_data = obj_in.model_dump()
            role = await self.repository.create(db, obj_data=role_data)

            self.logger.info(f"{context}SERVICE_CREATE_SUCCESS: Created app role - ID: {role.app_role_id}, Name: {role.app_role_name}")
            return role

        except DuplicateEntryError:
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_CREATE_ERROR: Failed to create app role, Error: {str(e)}")
            raise

    @log_execution_time()
    async def update(
        self,
        db: AsyncSession,
        *,
        app_role_id: int,
        obj_in: ApplicationRoleUpdate,
        current_user: Optional[Any] = None
    ) -> ApplicationRole:
        """Update an application role with validation."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_UPDATE: Updating app role - ID: {app_role_id}")

        try:
            # Get existing role
            role = await self.repository.get_by_id(db, app_role_id)

            if not role:
                self.logger.warning(f"{context}SERVICE_UPDATE_NOT_FOUND: App role not found - ID: {app_role_id}")
                raise DomainEntityNotFoundError(f"Application role {app_role_id} not found")

            # Check for duplicate name if name is being updated
            if obj_in.app_role_name and obj_in.app_role_name != role.app_role_name:
                duplicate_exists = await self.repository.check_duplicate_name(
                    db, obj_in.app_role_name, exclude_id=app_role_id
                )

                if duplicate_exists:
                    error_msg = f"Application role '{obj_in.app_role_name}' already exists"
                    self.logger.warning(f"{context}SERVICE_UPDATE_DUPLICATE: {error_msg}")
                    raise BusinessRuleViolationError(error_msg)

            # Update the role
            update_data = obj_in.model_dump(exclude_unset=True)
            updated_role = await self.repository.update(db, db_obj=role, obj_data=update_data)

            self.logger.info(f"{context}SERVICE_UPDATE_SUCCESS: Updated app role - ID: {app_role_id}")
            return updated_role

        except (DomainEntityNotFoundError, BusinessRuleViolationError):
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_UPDATE_ERROR: Failed to update app role {app_role_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def get_all(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[ApplicationRole]:
        """Get all application roles."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_ALL: Getting all roles")

        try:
            roles = await self.repository.get_all_roles(db, skip, limit)

            self.logger.info(f"{context}SERVICE_GET_ALL_SUCCESS: Retrieved {len(roles)} roles")
            return roles

        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_ALL_ERROR: Failed to get roles, Error: {str(e)}")
            raise

    @log_execution_time()
    async def get_with_stats(
        self,
        db: AsyncSession,
        app_role_id: int
    ) -> tuple:
        """Get application role with usage statistics."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_WITH_STATS: Getting app role with stats - ID: {app_role_id}")

        try:
            result = await self.repository.get_with_stats(db, app_role_id)

            if not result:
                self.logger.warning(f"{context}SERVICE_GET_WITH_STATS_NOT_FOUND: App role not found - ID: {app_role_id}")
                raise DomainEntityNotFoundError(f"Application role {app_role_id} not found")

            role, employee_count, header_count = result

            self.logger.info(f"{context}SERVICE_GET_WITH_STATS_SUCCESS: Role {app_role_id} - Employees: {employee_count}, Headers: {header_count}")
            return (role, employee_count, header_count)

        except DomainEntityNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_WITH_STATS_ERROR: Failed to get stats for app role {app_role_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def delete(
        self,
        db: AsyncSession,
        *,
        app_role_id: int,
        current_user: Optional[Any] = None
    ) -> bool:
        """
        Delete an application role.

        Note: This will CASCADE delete all goal template headers associated with this role.
        Should be used with caution.
        """
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_DELETE: Deleting app role - ID: {app_role_id}")

        try:
            # Get stats to log what will be affected
            result = await self.repository.get_with_stats(db, app_role_id)

            if not result:
                self.logger.warning(f"{context}SERVICE_DELETE_NOT_FOUND: App role not found - ID: {app_role_id}")
                raise DomainEntityNotFoundError(f"Application role {app_role_id} not found")

            role, employee_count, header_count = result

            # Warn if there are dependencies
            if employee_count > 0 or header_count > 0:
                self.logger.warning(f"{context}SERVICE_DELETE_HAS_DEPENDENCIES: App role {app_role_id} has {employee_count} employees and {header_count} headers")

            # Delete the role (cascade will handle template headers)
            await self.repository.delete(db, db_obj=role)

            self.logger.info(f"{context}SERVICE_DELETE_SUCCESS: Deleted app role {app_role_id}")
            return True

        except DomainEntityNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_DELETE_ERROR: Failed to delete app role {app_role_id}, Error: {str(e)}")
            raise
