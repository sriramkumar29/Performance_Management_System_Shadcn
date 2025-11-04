"""
Goal template headers router for the Performance Management System.

This module provides REST API endpoints for goal template header management
with proper validation, error handling, and service layer integration.
"""

from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.database import get_db
from app.models.employee import Employee
from app.schemas.goal import (
    GoalTemplateHeaderCreate,
    GoalTemplateHeaderUpdate,
    GoalTemplateHeaderResponse,
    GoalTemplateHeaderWithTemplates,
    GoalTemplateTypeEnum
)
from app.routers.auth import get_current_user, get_current_active_user
from app.utils.logger import get_logger, log_execution_time, build_log_context
from app.exceptions.domain_exceptions import (
    BaseDomainException,
    map_domain_exception_to_http_status
)
from app.services.goal_template_header_service import GoalTemplateHeaderService

router = APIRouter(dependencies=[Depends(get_current_user)])
logger = get_logger(__name__)


# Dependency provider
def get_header_service() -> GoalTemplateHeaderService:
    """Dependency to get goal template header service instance."""
    return GoalTemplateHeaderService()


@router.post("/", response_model=GoalTemplateHeaderResponse, status_code=status.HTTP_201_CREATED)
@log_execution_time()
async def create_header(
    header_data: GoalTemplateHeaderCreate,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateHeaderResponse:
    """
    Create a new goal template header for a role.

    Args:
        header_data: Header creation data
        db: Database session
        service: Header service instance
        current_user: Current authenticated user

    Returns:
        GoalTemplateHeaderResponse: Created header

    Raises:
        HTTPException: If creation fails or duplicate title exists
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_CREATE_HEADER: Creating header - Role ID: {header_data.role_id}, Title: {header_data.title}")

    try:
        header = await service.create(db, obj_in=header_data, current_user=current_user)

        logger.info(f"{context}ROUTER_CREATE_HEADER_SUCCESS: Created header - ID: {header.header_id}")
        return GoalTemplateHeaderResponse.model_validate(header)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_CREATE_HEADER_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_CREATE_HEADER_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/role/{role_id}", response_model=List[GoalTemplateHeaderWithTemplates])
@log_execution_time()
async def get_headers_by_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[GoalTemplateHeaderWithTemplates]:
    """
    Get all template headers for a specific role with their templates.

    Args:
        role_id: Role ID to filter by
        db: Database session
        service: Header service instance
        current_user: Current authenticated user

    Returns:
        List[GoalTemplateHeaderWithTemplates]: List of headers with templates

    Raises:
        HTTPException: If retrieval fails
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_GET_HEADERS_BY_ROLE: Getting headers for role - Role ID: {role_id}")

    try:
        headers = await service.get_by_role_id(db, role_id, include_templates=True)

        logger.info(f"{context}ROUTER_GET_HEADERS_BY_ROLE_SUCCESS: Retrieved {len(headers)} headers")
        return [GoalTemplateHeaderWithTemplates.model_validate(h) for h in headers]

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_GET_HEADERS_BY_ROLE_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_GET_HEADERS_BY_ROLE_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/{header_id}", response_model=GoalTemplateHeaderWithTemplates)
@log_execution_time()
async def get_header(
    header_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateHeaderWithTemplates:
    """
    Get a specific header with all its templates.

    Args:
        header_id: Header ID
        db: Database session
        service: Header service instance
        current_user: Current authenticated user

    Returns:
        GoalTemplateHeaderWithTemplates: Header with templates

    Raises:
        HTTPException: If header not found or retrieval fails
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_GET_HEADER: Getting header - Header ID: {header_id}")

    try:
        header = await service.get_header_with_templates(db, header_id)

        logger.info(f"{context}ROUTER_GET_HEADER_SUCCESS: Retrieved header {header_id}")
        return GoalTemplateHeaderWithTemplates.model_validate(header)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_GET_HEADER_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_GET_HEADER_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/", response_model=List[GoalTemplateHeaderWithTemplates])
@log_execution_time()
async def get_all_headers(
    skip: int = 0,
    limit: int = 100,
    filter_type: Optional[str] = Query(None, description="Filter by type: 'organization', 'self', or 'shared'"),
    search: Optional[str] = Query(None, description="Optional search term to filter by title or description"),
    application_role_id: Optional[int] = Query(None, description="Filter by application role (job position)"),
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> List[GoalTemplateHeaderWithTemplates]:
    """
    Get all template headers with their templates, with optional filtering.

    Now supports filtering by application_role_id (job position) instead of system role.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        filter_type: Optional filter - 'organization', 'self', or 'shared'
        search: Optional search term to filter by title or description
        application_role_id: Optional filter by application role (job position)
        db: Database session
        service: Header service instance
        current_user: Current authenticated user

    Returns:
        List[GoalTemplateHeaderWithTemplates]: List of headers with templates

    Raises:
        HTTPException: If retrieval fails
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_GET_ALL_HEADERS: Getting headers - Skip: {skip}, Limit: {limit}, Filter: {filter_type}, App Role ID: {application_role_id}")

    try:
        # If application_role_id is provided, filter by it
        if application_role_id:
            headers = await service.get_by_application_role_id(
                db,
                application_role_id,
                include_templates=True,
                skip=skip,
                limit=limit,
                search=search
            )
        # Apply filtering based on filter_type — always pass pagination and search so results are coordinated
        elif filter_type == "organization":
            headers = await service.get_by_type(
                db,
                GoalTemplateTypeEnum.ORGANIZATION,
                include_templates=True,
                skip=skip,
                limit=limit,
                search=search,
            )
        elif filter_type == "self":
            logger.debug(f"{context}ROUTER_GET_SELF_HEADERS: User emp_id={current_user.emp_id}, role_id={current_user.role_id}")
            headers = await service.get_self_headers_for_user(
                db,
                current_user.emp_id,
                current_user.role_id,
                include_templates=True,
                skip=skip,
                limit=limit,
                search=search,
            )
        elif filter_type == "shared":
            logger.debug(f"{context}ROUTER_GET_SHARED_HEADERS: User emp_id={current_user.emp_id}, role_id={current_user.role_id}")
            headers = await service.get_shared_with_user(
                db,
                current_user.emp_id,
                current_user.role_id,
                include_templates=True,
                skip=skip,
                limit=limit,
                search=search,
            )
        else:
            # No filter, get all headers
            headers = await service.get_all_with_templates(db, skip=skip, limit=limit, search=search)

        logger.info(f"{context}ROUTER_GET_ALL_HEADERS_SUCCESS: Retrieved {len(headers)} headers")
        return [GoalTemplateHeaderWithTemplates.model_validate(h) for h in headers]

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_GET_ALL_HEADERS_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_GET_ALL_HEADERS_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.put("/{header_id}", response_model=GoalTemplateHeaderResponse)
@log_execution_time()
async def update_header(
    header_id: int,
    header_data: GoalTemplateHeaderUpdate,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateHeaderResponse:
    """
    Update a goal template header.

    Args:
        header_id: Header ID to update
        header_data: Header update data
        db: Database session
        service: Header service instance
        current_user: Current authenticated user

    Returns:
        GoalTemplateHeaderResponse: Updated header

    Raises:
        HTTPException: If header not found or update fails
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_UPDATE_HEADER: Updating header - Header ID: {header_id}")

    try:
        # Log incoming update payload for debugging
        logger.debug(f"{context}ROUTER_UPDATE_HEADER_PAYLOAD: {header_data.model_dump()}")
        header = await service.update(db, header_id=header_id, obj_in=header_data, current_user=current_user)

        logger.info(f"{context}ROUTER_UPDATE_HEADER_SUCCESS: Updated header {header_id}")
        return GoalTemplateHeaderResponse.model_validate(header)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_UPDATE_HEADER_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_UPDATE_HEADER_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/{header_id}/clone-to-self", response_model=GoalTemplateHeaderResponse, status_code=status.HTTP_201_CREATED)
@log_execution_time()
async def clone_header_to_self(
    header_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> GoalTemplateHeaderResponse:
    """
    Clone an Organization header (and its templates) into a Self header owned by the current user.

    This creates a new header of type Self, sets creator_id to the current user,
    and duplicates all templates (and their categories) under the new header.
    If a header with the same role_id+title exists, the title will be suffixed with " (Copy)" to avoid unique constraint violations.
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_CLONE_HEADER_TO_SELF: Cloning header {header_id} to Self for user {getattr(current_user,'emp_id',None)}")

    try:
        new_header = await service.clone_organization_to_self(db, header_id, current_user)
        logger.info(f"{context}ROUTER_CLONE_HEADER_TO_SELF_SUCCESS: Cloned header to {new_header.header_id}")
        return GoalTemplateHeaderResponse.model_validate(new_header)

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        # Use e.message directly to avoid async context issues with str(e)
        error_detail = getattr(e, 'message', 'An error occurred')
        logger.error(f"{context}ROUTER_CLONE_HEADER_TO_SELF_ERROR: {error_detail}")
        raise HTTPException(status_code=status_code, detail=error_detail)
    except Exception as e:
        # Extract safe error info without calling str()
        exc_type = type(e).__name__
        error_detail = getattr(e, 'message', f'{exc_type} occurred')
        logger.error(f"{context}ROUTER_CLONE_HEADER_TO_SELF_UNEXPECTED_ERROR: {error_detail}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.delete("/{header_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_execution_time()
async def delete_header(
    header_id: int,
    db: AsyncSession = Depends(get_db),
    service: GoalTemplateHeaderService = Depends(get_header_service),
    current_user: Employee = Depends(get_current_active_user)
) -> None:
    """
    Delete a goal template header and all its templates (cascade).

    Args:
        header_id: Header ID to delete
        db: Database session
        service: Header service instance
        current_user: Current authenticated user

    Returns:
        None

    Raises:
        HTTPException: If header not found or deletion fails
    """
    context = build_log_context(user_id=current_user.emp_id if current_user else None)

    logger.info(f"{context}ROUTER_DELETE_HEADER: Deleting header - Header ID: {header_id}")

    try:
        success = await service.delete(db, header_id=header_id, current_user=current_user)

        if not success:
            logger.error(f"{context}ROUTER_DELETE_HEADER_FAILED: Failed to delete header {header_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete header")

        logger.info(f"{context}ROUTER_DELETE_HEADER_SUCCESS: Deleted header {header_id}")

    except BaseDomainException as e:
        status_code = map_domain_exception_to_http_status(e)
        logger.error(f"{context}ROUTER_DELETE_HEADER_ERROR: {str(e)}")
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"{context}ROUTER_DELETE_HEADER_UNEXPECTED_ERROR: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
