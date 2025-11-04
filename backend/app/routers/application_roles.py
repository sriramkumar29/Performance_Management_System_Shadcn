"""
Application roles router for the Performance Management System.
"""

from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.models.employee import Employee
from app.schemas.application_role import (
    ApplicationRoleCreate,
    ApplicationRoleUpdate,
    ApplicationRoleResponse,
    ApplicationRoleWithStats
)
from app.routers.auth import get_current_user, get_current_active_user
from app.utils.logger import get_logger, log_execution_time, build_log_context
from app.exceptions.domain_exceptions import (
    BaseDomainException,
    map_domain_exception_to_http_status
)
from app.services.application_role_service import ApplicationRoleService

router = APIRouter(dependencies=[Depends(get_current_user)])
logger = get_logger(__name__)


def get_app_role_service() -> ApplicationRoleService:
    """Dependency to get application role service instance."""
    return ApplicationRoleService()


@router.post("/", response_model=ApplicationRoleResponse, status_code=status.HTTP_201_CREATED)
@log_execution_time()
async def create_application_role(
    role_data: ApplicationRoleCreate,
    db: AsyncSession = Depends(get_db),
    service: ApplicationRoleService = Depends(get_app_role_service),
    current_user: Employee = Depends(get_current_active_user)
) -> ApplicationRoleResponse:
    """
    Create a new application role (admin only).

    Application roles represent job positions (e.g., Developer, QA Engineer)
    and are used for organizing goal templates.
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_CREATE_APP_ROLE: Creating - Name: {role_data.app_role_name}")

    try:
        # TODO: Add admin-only check
        role = await service.create(db, obj_in=role_data, current_user=current_user)

        logger.info(f"{context}ROUTER_CREATE_APP_ROLE_SUCCESS: Created - ID: {role.app_role_id}")
        return ApplicationRoleResponse.model_validate(role)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_CREATE_APP_ROLE_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_CREATE_APP_ROLE_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/", response_model=List[ApplicationRoleResponse])
@log_execution_time()
async def get_application_roles(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    service: ApplicationRoleService = Depends(get_app_role_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[ApplicationRoleResponse]:
    """
    Get all application roles.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_GET_APP_ROLES: Getting all roles")

    try:
        roles = await service.get_all(db, skip=skip, limit=limit)

        logger.info(f"{context}ROUTER_GET_APP_ROLES_SUCCESS: Retrieved {len(roles)} roles")
        return [ApplicationRoleResponse.model_validate(r) for r in roles]

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_GET_APP_ROLES_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_GET_APP_ROLES_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/{app_role_id}", response_model=ApplicationRoleResponse)
@log_execution_time()
async def get_application_role(
    app_role_id: int,
    db: AsyncSession = Depends(get_db),
    service: ApplicationRoleService = Depends(get_app_role_service),
    current_user: Employee = Depends(get_current_active_user)
) -> ApplicationRoleResponse:
    """Get a specific application role by ID."""
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_GET_APP_ROLE: Getting - ID: {app_role_id}")

    try:
        role = await service.get_by_id(db, app_role_id)

        logger.info(f"{context}ROUTER_GET_APP_ROLE_SUCCESS: Retrieved role {app_role_id}")
        return ApplicationRoleResponse.model_validate(role)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_GET_APP_ROLE_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_GET_APP_ROLE_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/{app_role_id}/stats", response_model=ApplicationRoleWithStats)
@log_execution_time()
async def get_application_role_with_stats(
    app_role_id: int,
    db: AsyncSession = Depends(get_db),
    service: ApplicationRoleService = Depends(get_app_role_service),
    current_user: Employee = Depends(get_current_active_user)
) -> ApplicationRoleWithStats:
    """Get application role with usage statistics (employee count, template count)."""
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_GET_APP_ROLE_STATS: Getting stats - ID: {app_role_id}")

    try:
        role, employee_count, header_count = await service.get_with_stats(db, app_role_id)

        response_data = ApplicationRoleResponse.model_validate(role).model_dump()
        response_data['employee_count'] = employee_count
        response_data['template_header_count'] = header_count

        logger.info(f"{context}ROUTER_GET_APP_ROLE_STATS_SUCCESS: Role {app_role_id} - Employees: {employee_count}, Headers: {header_count}")
        return ApplicationRoleWithStats(**response_data)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_GET_APP_ROLE_STATS_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_GET_APP_ROLE_STATS_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.put("/{app_role_id}", response_model=ApplicationRoleResponse)
@log_execution_time()
async def update_application_role(
    app_role_id: int,
    role_data: ApplicationRoleUpdate,
    db: AsyncSession = Depends(get_db),
    service: ApplicationRoleService = Depends(get_app_role_service),
    current_user: Employee = Depends(get_current_active_user)
) -> ApplicationRoleResponse:
    """Update an application role (admin only)."""
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_UPDATE_APP_ROLE: Updating - ID: {app_role_id}")

    try:
        # TODO: Add admin-only check
        role = await service.update(db, app_role_id=app_role_id, obj_in=role_data, current_user=current_user)

        logger.info(f"{context}ROUTER_UPDATE_APP_ROLE_SUCCESS: Updated role {app_role_id}")
        return ApplicationRoleResponse.model_validate(role)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_UPDATE_APP_ROLE_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_UPDATE_APP_ROLE_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.delete("/{app_role_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_execution_time()
async def delete_application_role(
    app_role_id: int,
    db: AsyncSession = Depends(get_db),
    service: ApplicationRoleService = Depends(get_app_role_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete an application role (admin only).

    Warning: This will CASCADE delete all goal template headers associated with this role.
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_DELETE_APP_ROLE: Deleting - ID: {app_role_id}")

    try:
        # TODO: Add admin-only check
        success = await service.delete(db, app_role_id=app_role_id, current_user=current_user)

        if not success:
            logger.error(f"{context}ROUTER_DELETE_APP_ROLE_FAILED: Failed to delete role {app_role_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete role")

        logger.info(f"{context}ROUTER_DELETE_APP_ROLE_SUCCESS: Deleted role {app_role_id}")

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_DELETE_APP_ROLE_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_DELETE_APP_ROLE_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
