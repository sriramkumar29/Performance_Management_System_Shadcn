"""
Goal template header repository for database operations.

This module handles all direct database interactions
for the GoalTemplateHeader entity.
"""

import json
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, cast, func, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import selectinload

from app.models.goal import GoalTemplateHeader, GoalTemplate, GoalTemplateType
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, log_execution_time


class GoalTemplateHeaderRepository(BaseRepository[GoalTemplateHeader]):
    """Repository for GoalTemplateHeader database operations with comprehensive logging."""

    def __init__(self):
        super().__init__(GoalTemplateHeader)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Goal Template Header"

    @property
    def id_field(self) -> str:
        return "header_id"

    @log_execution_time()
    async def get_by_role_id(
        self,
        db: AsyncSession,
        role_id: int,
        load_templates: bool = False
    ) -> List[GoalTemplateHeader]:
        """Get all template headers for a specific role."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_GET_BY_ROLE_ID: Getting headers for role - Role ID: {role_id}, Load Templates: {load_templates}")

        try:
            query = select(GoalTemplateHeader).where(GoalTemplateHeader.role_id == role_id)

            if load_templates:
                query = query.options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )

            result = await db.execute(query)
            headers = list(result.scalars().all())

            self.logger.debug(f"{context}REPO_GET_BY_ROLE_ID_SUCCESS: Retrieved {len(headers)} headers for role {role_id}")
            return headers

        except Exception as e:
            error_msg = f"Error getting headers by role_id {role_id}"
            self.logger.error(f"{context}REPO_GET_BY_ROLE_ID_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"role_id": role_id, "original_error": str(e)})

    @log_execution_time()
    async def get_with_templates(
        self,
        db: AsyncSession,
        header_id: int
    ) -> Optional[GoalTemplateHeader]:
        """Get header with all its templates loaded."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_GET_WITH_TEMPLATES: Getting header with templates - Header ID: {header_id}")

        try:
            query = (
                select(GoalTemplateHeader)
                .where(GoalTemplateHeader.header_id == header_id)
                .options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )
            )
            result = await db.execute(query)
            header = result.scalars().first()

            if header:
                self.logger.debug(f"{context}REPO_GET_WITH_TEMPLATES_SUCCESS: Retrieved header {header_id} with {len(header.goal_templates)} templates")
            else:
                self.logger.debug(f"{context}REPO_GET_WITH_TEMPLATES_NOT_FOUND: Header {header_id} not found")

            return header

        except Exception as e:
            error_msg = f"Error getting header {header_id} with templates"
            self.logger.error(f"{context}REPO_GET_WITH_TEMPLATES_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"header_id": header_id, "original_error": str(e)})

    @log_execution_time()
    async def get_all_with_templates(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all headers with their templates."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_GET_ALL_WITH_TEMPLATES: Getting all headers - Skip: {skip}, Limit: {limit}")

        try:
            query = select(GoalTemplateHeader).options(
                selectinload(GoalTemplateHeader.goal_templates)
                .selectinload(GoalTemplate.categories)
            )

            # Apply search filter if provided
            if search:
                like_term = f"%{search}%"
                query = query.where(
                    or_(
                        GoalTemplateHeader.title.ilike(like_term),
                        GoalTemplateHeader.description.ilike(like_term)
                    )
                )

            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            headers = list(result.scalars().all())

            self.logger.debug(f"{context}REPO_GET_ALL_WITH_TEMPLATES_SUCCESS: Retrieved {len(headers)} headers")
            return headers

        except Exception as e:
            error_msg = "Error getting all headers with templates"
            self.logger.error(f"{context}REPO_GET_ALL_WITH_TEMPLATES_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"skip": skip, "limit": limit, "original_error": str(e)})

    @log_execution_time()
    async def check_duplicate_title(
        self,
        db: AsyncSession,
        role_id: int,
        title: str,
        exclude_header_id: Optional[int] = None
    ) -> bool:
        """Check if a header with the same title exists for the role."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_CHECK_DUPLICATE_TITLE: Checking duplicate - Role ID: {role_id}, Title: {title}, Exclude: {exclude_header_id}")

        try:
            query = select(GoalTemplateHeader).where(
                GoalTemplateHeader.role_id == role_id,
                GoalTemplateHeader.title == title
            )

            if exclude_header_id:
                query = query.where(GoalTemplateHeader.header_id != exclude_header_id)

            result = await db.execute(query)
            exists = result.scalars().first() is not None

            self.logger.debug(f"{context}REPO_CHECK_DUPLICATE_TITLE_RESULT: Duplicate exists: {exists}")
            return exists

        except Exception as e:
            error_msg = "Error checking duplicate title"
            self.logger.error(f"{context}REPO_CHECK_DUPLICATE_TITLE_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"role_id": role_id, "title": title, "original_error": str(e)})

    @log_execution_time()
    async def get_by_type(
        self,
        db: AsyncSession,
        goal_template_type: GoalTemplateType,
        load_templates: bool = False,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all headers of a specific type (Organization or Self)."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_GET_BY_TYPE: Getting headers by type - Type: {goal_template_type}, Load Templates: {load_templates}")

        try:
            query = select(GoalTemplateHeader).where(GoalTemplateHeader.goal_template_type == goal_template_type)

            if search:
                like_term = f"%{search}%"
                query = query.where(
                    or_(
                        GoalTemplateHeader.title.ilike(like_term),
                        GoalTemplateHeader.description.ilike(like_term)
                    )
                )

            if load_templates:
                query = query.options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )

            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            headers = list(result.scalars().all())

            self.logger.debug(f"{context}REPO_GET_BY_TYPE_SUCCESS: Retrieved {len(headers)} headers of type {goal_template_type}")
            return headers

        except Exception as e:
            error_msg = f"Error getting headers by type {goal_template_type}"
            self.logger.error(f"{context}REPO_GET_BY_TYPE_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"goal_template_type": str(goal_template_type), "original_error": str(e)})

    @log_execution_time()
    async def get_by_creator(
        self,
        db: AsyncSession,
        creator_id: int,
        role_id: Optional[int],
        load_templates: bool = False,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all headers created by a specific user with type Self. If role_id is None, returns all roles."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_GET_BY_CREATOR: Getting headers by creator - Creator ID: {creator_id}, Role ID: {role_id}, Load Templates: {load_templates}")

        try:
            # Get all Self headers created by this user
            query = select(GoalTemplateHeader).where(
                GoalTemplateHeader.creator_id == creator_id,
                GoalTemplateHeader.goal_template_type == GoalTemplateType.SELF
            )
            
            # Optionally filter by role if role_id is provided
            if role_id is not None:
                query = query.where(GoalTemplateHeader.role_id == role_id)

            if search:
                like_term = f"%{search}%"
                query = query.where(
                    or_(
                        GoalTemplateHeader.title.ilike(like_term),
                        GoalTemplateHeader.description.ilike(like_term)
                    )
                )

            if load_templates:
                query = query.options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )

            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            headers = list(result.scalars().all())

            role_info = f"with role {role_id}" if role_id is not None else "for all roles"
            self.logger.debug(f"{context}REPO_GET_BY_CREATOR_SUCCESS: Retrieved {len(headers)} headers for creator {creator_id} {role_info}")
            return headers

        except Exception as e:
            error_msg = f"Error getting headers by creator {creator_id}"
            self.logger.error(f"{context}REPO_GET_BY_CREATOR_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"creator_id": creator_id, "role_id": role_id, "original_error": str(e)})

    @log_execution_time()
    async def get_shared_with_user(
        self,
        db: AsyncSession,
        user_id: int,
        role_id: int,
        load_templates: bool = False,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all headers shared with a specific user. Note: role_id parameter kept for compatibility but not used."""
        context = build_log_context()

        self.logger.debug(f"{context}REPO_GET_SHARED_WITH_USER: Getting headers shared with user - User ID: {user_id}, Load Templates: {load_templates}")

        try:
            # Query headers where:
            # - shared_users_id array contains the user_id (read-only shared headers)
            # This returns headers that other users have shared with this user
            # Use JSONB containment operator @> to check if user_id is in the JSON array
            # NOTE: We do NOT filter by role_id because templates of any role can be shared with any user
            query = select(GoalTemplateHeader).where(
                func.cast(GoalTemplateHeader.shared_users_id, JSONB).op('@>')(
                    cast([user_id], JSONB)
                )
            )

            if search:
                like_term = f"%{search}%"
                query = query.where(
                    or_(
                        GoalTemplateHeader.title.ilike(like_term),
                        GoalTemplateHeader.description.ilike(like_term)
                    )
                )

            query = query.offset(skip).limit(limit)

            if load_templates:
                query = query.options(
                    selectinload(GoalTemplateHeader.goal_templates)
                    .selectinload(GoalTemplate.categories)
                )

            result = await db.execute(query)
            headers = list(result.scalars().all())

            self.logger.debug(f"{context}REPO_GET_SHARED_WITH_USER_SUCCESS: Retrieved {len(headers)} headers shared with user {user_id}")
            return headers

        except Exception as e:
            error_msg = f"Error getting headers shared with user {user_id}"
            self.logger.error(f"{context}REPO_GET_SHARED_WITH_USER_ERROR: {error_msg}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"user_id": user_id, "original_error": str(e)})
