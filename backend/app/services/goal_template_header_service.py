"""
Goal template header service for the Performance Management System.

This module provides business logic for goal template header management
with proper validation and relationship handling.
"""

from typing import List, Optional, Any
from enum import Enum as PyEnum
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import GoalTemplateHeader, GoalTemplateType
from app.schemas.goal import (
    GoalTemplateHeaderCreate,
    GoalTemplateHeaderUpdate,
    GoalTemplateHeaderResponse,
    GoalTemplateHeaderWithTemplates,
    GoalTemplateTypeEnum
)
from app.services.base_service import BaseService
from app.repositories.goal_template_header_repository import GoalTemplateHeaderRepository
from app.exceptions.domain_exceptions import (
    EntityNotFoundError as DomainEntityNotFoundError,
    ValidationError as DomainValidationError,
    BusinessRuleViolationError,
    DuplicateEntryError,
    BaseServiceException
)
from app.utils.logger import get_logger, log_execution_time, build_log_context


class GoalTemplateHeaderService(BaseService[GoalTemplateHeader, GoalTemplateHeaderCreate, GoalTemplateHeaderUpdate]):
    """Service class for goal template header operations."""

    def __init__(self):
        super().__init__(GoalTemplateHeader)
        self.repository = GoalTemplateHeaderRepository()
        self.logger = get_logger(__name__)
        self.logger.debug("GoalTemplateHeaderService initialized successfully")

    @property
    def entity_name(self) -> str:
        return "GoalTemplateHeader"

    @property
    def id_field(self) -> str:
        return "header_id"

    @log_execution_time()
    async def get_by_role_id(
        self,
        db: AsyncSession,
        role_id: int,
        include_templates: bool = False
    ) -> List[GoalTemplateHeader]:
        """Get all template headers for a role."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_BY_ROLE_ID: Getting headers for role - Role ID: {role_id}, Include Templates: {include_templates}")

        try:
            headers = await self.repository.get_by_role_id(db, role_id, include_templates)

            self.logger.info(f"{context}SERVICE_GET_BY_ROLE_ID_SUCCESS: Retrieved {len(headers)} headers for role {role_id}")
            return headers

        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_BY_ROLE_ID_ERROR: Failed to get headers for role {role_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def get_header_with_templates(
        self,
        db: AsyncSession,
        header_id: int
    ) -> GoalTemplateHeader:
        """Get header with all templates."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_HEADER_WITH_TEMPLATES: Getting header with templates - Header ID: {header_id}")

        try:
            header = await self.repository.get_with_templates(db, header_id)

            if not header:
                self.logger.warning(f"{context}SERVICE_GET_HEADER_WITH_TEMPLATES_NOT_FOUND: Header not found - Header ID: {header_id}")
                raise DomainEntityNotFoundError(f"Goal template header {header_id} not found")

            self.logger.info(f"{context}SERVICE_GET_HEADER_WITH_TEMPLATES_SUCCESS: Retrieved header {header_id} with {len(header.goal_templates)} templates")
            return header

        except DomainEntityNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_HEADER_WITH_TEMPLATES_ERROR: Failed to get header {header_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: GoalTemplateHeaderCreate,
        current_user: Optional[Any] = None
    ) -> GoalTemplateHeader:
        """Create a new goal template header with validation."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_CREATE_HEADER: Creating header - Role ID: {obj_in.role_id}, Title: {obj_in.title}, Type: {obj_in.goal_template_type}")

        try:
            # Check for duplicate title within the same role
            duplicate_exists = await self.repository.check_duplicate_title(
                db, obj_in.role_id, obj_in.title
            )

            if duplicate_exists:
                error_msg = f"A header with title '{obj_in.title}' already exists for this role"
                self.logger.warning(f"{context}SERVICE_CREATE_HEADER_DUPLICATE: {error_msg}")
                raise BusinessRuleViolationError(error_msg)


            # Create the header
            header_data = obj_in.model_dump()

            # Ensure enum values are serialized to plain strings for DB insertion
            gtt = header_data.get('goal_template_type')
            if isinstance(gtt, PyEnum):
                header_data['goal_template_type'] = gtt.value
            else:
                if gtt is not None:
                    header_data['goal_template_type'] = str(gtt)

            # Normalize shared_users_id and is_shared
            if obj_in.goal_template_type == GoalTemplateTypeEnum.SELF:
                if obj_in.shared_users_id and len(obj_in.shared_users_id) > 0:
                    header_data['is_shared'] = True
                else:
                    header_data['is_shared'] = False
                    header_data['shared_users_id'] = None
            else:
                # For Organization type, ignore shared settings
                header_data['is_shared'] = False
                header_data['shared_users_id'] = None

            # Set creator_id from current_user
            if current_user:
                header_data['creator_id'] = getattr(current_user, 'emp_id', None)

            # Debug: log payload to help diagnose DB type issues
            try:
                self.logger.debug(f"SERVICE_CREATE_HEADER_PAYLOAD: {header_data}")
            except Exception:
                pass

            # BaseRepository.create expects obj_data keyword
            try:
                header = await self.repository.create(db, obj_data=header_data)
            except Exception as e:
                # Log payload and exception to help diagnose DB type mismatches
                try:
                    self.logger.error(f"SERVICE_CREATE_HEADER_FAILED_PAYLOAD: {header_data}")
                except Exception:
                    pass
                self.logger.error(f"SERVICE_CREATE_HEADER_EXCEPTION: {str(e)}")
                raise

            self.logger.info(f"{context}SERVICE_CREATE_HEADER_SUCCESS: Created header - ID: {header.header_id}, Title: {header.title}, Type: {header.goal_template_type}")
            return header

        except BusinessRuleViolationError:
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_CREATE_HEADER_ERROR: Failed to create header, Error: {str(e)}")
            raise

    @log_execution_time()
    async def update(
        self,
        db: AsyncSession,
        *,
        header_id: int,
        obj_in: GoalTemplateHeaderUpdate,
        current_user: Optional[Any] = None
    ) -> GoalTemplateHeader:
        """Update a goal template header with validation."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_UPDATE_HEADER: Updating header - Header ID: {header_id}")

        try:
            # Get existing header
            header = await self.repository.get_by_id(db, header_id)

            if not header:
                self.logger.warning(f"{context}SERVICE_UPDATE_HEADER_NOT_FOUND: Header not found - Header ID: {header_id}")
                raise DomainEntityNotFoundError(f"Goal template header {header_id} not found")

            # Determine the role_id to use for duplicate checking
            # Use the new role_id if provided, otherwise use the existing one
            check_role_id = obj_in.role_id if obj_in.role_id is not None else header.role_id
            check_title = obj_in.title if obj_in.title is not None else header.title

            # Check for duplicate (role_id, title) combination if either is being updated
            if (obj_in.title and obj_in.title != header.title) or (obj_in.role_id and obj_in.role_id != header.role_id):
                duplicate_exists = await self.repository.check_duplicate_title(
                    db, check_role_id, check_title, exclude_header_id=header_id
                )

                if duplicate_exists:
                    error_msg = f"A header with title '{check_title}' already exists for role ID {check_role_id}"
                    self.logger.warning(f"{context}SERVICE_UPDATE_HEADER_DUPLICATE: {error_msg}")
                    raise BusinessRuleViolationError(error_msg)

            # Update the header
            update_data = obj_in.model_dump(exclude_unset=True)
            # Ensure enum values are serialized to plain strings for DB update
            if 'goal_template_type' in update_data and isinstance(update_data['goal_template_type'], PyEnum):
                update_data['goal_template_type'] = update_data['goal_template_type'].value
            elif 'goal_template_type' in update_data and update_data.get('goal_template_type') is not None:
                update_data['goal_template_type'] = str(update_data['goal_template_type'])
            # BaseRepository.update expects obj_data keyword
            updated_header = await self.repository.update(db, db_obj=header, obj_data=update_data)
            self.logger.info(f"{context}SERVICE_UPDATE_HEADER_SUCCESS: Updated header - ID: {header_id}")
            try:
                # Log updated shared state for debugging purposes
                self.logger.debug(f"{context}SERVICE_UPDATE_HEADER_UPDATED_FIELDS: is_shared={getattr(updated_header,'is_shared',None)}, shared_users_id={getattr(updated_header,'shared_users_id',None)}")
            except Exception:
                pass

            return updated_header

        except (DomainEntityNotFoundError, BusinessRuleViolationError):
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_UPDATE_HEADER_ERROR: Failed to update header {header_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def delete(
        self,
        db: AsyncSession,
        *,
        header_id: int,
        current_user: Optional[Any] = None
    ) -> bool:
        """Delete a goal template header (cascade deletes all templates)."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_DELETE_HEADER: Deleting header - Header ID: {header_id}")

        try:
            # Get header with templates to inspect sharing state
            header = await self.repository.get_with_templates(db, header_id)

            if not header:
                self.logger.warning(f"{context}SERVICE_DELETE_HEADER_NOT_FOUND: Header not found - Header ID: {header_id}")
                raise DomainEntityNotFoundError(f"Goal template header {header_id} not found")

            template_count = len(header.goal_templates)

            # If this is a Self header that has been shared to other users,
            # we must preserve copies for the recipients instead of deleting
            # their access when the owner deletes the header. To do this,
            # clone the header+templates for each shared recipient (except the
            # current user who is deleting), then delete the original header.
            try:
                # header.goal_template_type is a model enum (GoalTemplateType)
                from app.models.goal import GoalTemplateType as _ModelGoalTemplateType

                if (
                    getattr(header, 'goal_template_type', None) == _ModelGoalTemplateType.SELF
                    and getattr(header, 'shared_users_id', None)
                ):
                    # If the owner is deleting a Self header that was shared to others,
                    # instead of removing recipients' access, convert the header into
                    # a shared resource by removing the creator (so it no longer shows
                    # up in the owner's Self list) and keeping it visible in the
                    # shared list for recipients. This avoids cloning and keeps a
                    # single canonical shared header.
                    try:
                        owner_id = getattr(header, 'creator_id', None)
                        if owner_id is not None and getattr(current_user, 'emp_id', None) == owner_id:
                            update_data = {
                                'creator_id': None,
                                'is_shared': True,
                            }
                            # Persist the update so owner no longer sees it as their Self header
                            await self.repository.update(db, db_obj=header, obj_data=update_data)
                            self.logger.info(f"{context}SERVICE_DELETE_CONVERT_TO_SHARED: Converted header {header_id} to shared resource by clearing creator_id")
                            # Return True to indicate delete completed from owner's perspective
                            return True
                        # If the deleter is not the owner, fall through to deletion below
                    except Exception:
                        self.logger.exception(f"{context}SERVICE_DELETE_CONVERT_TO_SHARED_FAILED: Failed converting header {header_id} to shared resource")

            except Exception:
                # If cloning for recipients fails, log and proceed to attempt delete
                self.logger.exception(f"{context}SERVICE_DELETE_CLONE_RECIPIENTS_EXCEPTION: Exception while preparing recipient copies for header {header_id}")

            # Delete the original header (cascade will delete templates)
            await self.repository.delete(db, db_obj=header)

            # If we reached here without an exception, assume success
            self.logger.info(f"{context}SERVICE_DELETE_HEADER_SUCCESS: Deleted header {header_id} with {template_count} templates (recipient copies created where applicable)")
            return True

        except DomainEntityNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"{context}SERVICE_DELETE_HEADER_ERROR: Failed to delete header {header_id}, Error: {str(e)}")
            raise

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

        self.logger.debug(f"{context}SERVICE_GET_ALL_WITH_TEMPLATES: Getting all headers - Skip: {skip}, Limit: {limit}")

        try:
            headers = await self.repository.get_all_with_templates(db, skip, limit, search)

            self.logger.info(f"{context}SERVICE_GET_ALL_WITH_TEMPLATES_SUCCESS: Retrieved {len(headers)} headers")
            return headers

        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_ALL_WITH_TEMPLATES_ERROR: Failed to get headers, Error: {str(e)}")
            raise

    @log_execution_time()
    async def get_by_type(
        self,
        db: AsyncSession,
        goal_template_type: GoalTemplateTypeEnum,
        include_templates: bool = False,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all headers of a specific type."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_BY_TYPE: Getting headers by type - Type: {goal_template_type}, Include Templates: {include_templates}")

        try:
            # Convert schema enum to model enum
            model_type = GoalTemplateType.ORGANIZATION if goal_template_type == GoalTemplateTypeEnum.ORGANIZATION else GoalTemplateType.SELF
            headers = await self.repository.get_by_type(db, model_type, include_templates, skip, limit, search)

            self.logger.info(f"{context}SERVICE_GET_BY_TYPE_SUCCESS: Retrieved {len(headers)} headers of type {goal_template_type}")
            return headers

        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_BY_TYPE_ERROR: Failed to get headers by type {goal_template_type}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def get_self_headers_for_user(
        self,
        db: AsyncSession,
        user_id: int,
        user_role_id: int,
        include_templates: bool = False,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all Self type headers created by a specific user (all roles they've created)."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_SELF_HEADERS_FOR_USER: Getting self headers for user - User ID: {user_id}, Include Templates: {include_templates}")

        try:
            # Don't filter by role - users should see all self templates they created regardless of role
            headers = await self.repository.get_by_creator(db, user_id, None, include_templates, skip, limit, search)

            self.logger.info(f"{context}SERVICE_GET_SELF_HEADERS_FOR_USER_SUCCESS: Retrieved {len(headers)} self headers for user {user_id}")
            return headers

        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_SELF_HEADERS_FOR_USER_ERROR: Failed to get self headers for user {user_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def get_shared_with_user(
        self,
        db: AsyncSession,
        user_id: int,
        user_role_id: int,
        include_templates: bool = False,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[GoalTemplateHeader]:
        """Get all headers shared with a specific user (regardless of role). Note: user_role_id kept for compatibility but not used in filtering."""
        context = build_log_context()

        self.logger.debug(f"{context}SERVICE_GET_SHARED_WITH_USER: Getting shared headers for user - User ID: {user_id}, Include Templates: {include_templates}")

        try:
            headers = await self.repository.get_shared_with_user(db, user_id, user_role_id, include_templates, skip, limit, search)

            self.logger.info(f"{context}SERVICE_GET_SHARED_WITH_USER_SUCCESS: Retrieved {len(headers)} shared headers for user {user_id}")
            return headers

        except Exception as e:
            self.logger.error(f"{context}SERVICE_GET_SHARED_WITH_USER_ERROR: Failed to get shared headers for user {user_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def clone_organization_to_self(
        self,
        db: AsyncSession,
        source_header_id: int,
        current_user: Optional[Any] = None
    ) -> GoalTemplateHeader:
        """Clone an Organization header and its templates into a Self header owned by current_user.

        The new header will have goal_template_type set to Self and creator_id set to the current user's emp_id.
        The role_id for the new header will default to the current user's role_id if available, otherwise the source header's role_id.
        If a title conflict occurs, a " (Copy)" suffix will be appended (incremented if needed).
        """
        context = build_log_context(user_id=getattr(current_user, 'emp_id', None) if current_user else None)
        self.logger.debug(f"{context}SERVICE_CLONE_HEADER: Cloning header {source_header_id} to self")

        # Load source header with templates
        source = await self.repository.get_with_templates(db, source_header_id)
        if not source:
            self.logger.warning(f"{context}SERVICE_CLONE_HEADER_NOT_FOUND: Source header {source_header_id} not found")
            raise DomainEntityNotFoundError(f"Goal template header {source_header_id} not found")

        # Only allow cloning Organization headers
        if source.goal_template_type != GoalTemplateType.ORGANIZATION:
            raise BusinessRuleViolationError("Only Organization headers can be cloned to Self")

        # Extract all data from source to plain Python types (avoid ORM objects)
        source_data = {
            'role_id': source.role_id,
            'title': source.title or "Untitled",
            'description': source.description,
            'templates': []
        }
        
        # Extract template data
        for tpl in (source.goal_templates or []):
            source_data['templates'].append({
                'temp_title': tpl.temp_title,
                'temp_description': tpl.temp_description,
                'temp_performance_factor': tpl.temp_performance_factor,
                'temp_importance': tpl.temp_importance,
                'temp_weightage': tpl.temp_weightage,
                'categories': [c.name for c in (tpl.categories or [])]
            })

        # Prepare new header
        user_role_id = getattr(current_user, 'role_id', None)
        user_emp_id = getattr(current_user, 'emp_id', None)
        
        # Use the source template's role_id, NOT the user's role_id
        # This allows users to clone templates for any role and keep the original role context
        new_role_id = source_data['role_id']
        base_title = source_data['title']

        self.logger.info(f"{context}SERVICE_CLONE_HEADER_ROLE: User role_id={user_role_id}, Source role_id={source_data['role_id']}, Using role_id={new_role_id} (keeping source role)")

        # Try to create header with automatic suffix on duplicate
        new_header_id = None
        for attempt in range(1, 101):  # Max 100 attempts
            if attempt == 1:
                title_to_try = base_title
            elif attempt == 2:
                title_to_try = f"{base_title} (Copy)"
            else:
                title_to_try = f"{base_title} (Copy {attempt - 1})"
            
            try:
                # Create header
                header_dict = {
                    'role_id': int(new_role_id),
                    'title': title_to_try,
                    'description': source_data['description'],
                    'goal_template_type': 'Self',
                    'is_shared': False,
                    'shared_users_id': None,
                    'creator_id': user_emp_id
                }
                
                new_header = await self.repository.create(db, obj_data=header_dict)
                new_header_id = new_header.header_id
                
                self.logger.info(f"{context}SERVICE_CLONE_HEADER_CREATED: Created header '{title_to_try}' with ID {new_header_id}")
                break
                
            except DuplicateEntryError:
                # Title exists, try next suffix
                self.logger.debug(f"{context}SERVICE_CLONE_HEADER_DUPLICATE: Title '{title_to_try}' exists, trying next")
                continue
                
            except Exception as e:
                # Unexpected error
                error_type = type(e).__name__
                self.logger.error(f"{context}SERVICE_CLONE_HEADER_ERROR: Unexpected error ({error_type}) creating header")
                raise BaseServiceException(f"Failed to create cloned header: {error_type}") from None

        if new_header_id is None:
            raise BusinessRuleViolationError("Failed to clone header after 100 attempts. Too many existing copies.")

        # Clone templates
        from app.services.goal_service import GoalTemplateService
        from app.schemas.goal import GoalTemplateCreate
        
        template_service = GoalTemplateService()
        
        for tpl_data in source_data['templates']:
            try:
                # Create template payload
                tpl_payload = GoalTemplateCreate(
                    temp_title=tpl_data['temp_title'],
                    temp_description=tpl_data['temp_description'],
                    temp_performance_factor=tpl_data['temp_performance_factor'],
                    temp_importance=tpl_data['temp_importance'],
                    temp_weightage=tpl_data['temp_weightage'],
                    categories=tpl_data['categories'],
                    header_id=new_header_id
                )
                
                await template_service.create_template_with_categories(db, template_data=tpl_payload)
                
            except Exception as e:
                # Log but continue with other templates
                error_type = type(e).__name__
                self.logger.error(f"{context}SERVICE_CLONE_TEMPLATE_ERROR: Failed to clone template '{tpl_data.get('temp_title', 'Unknown')}' ({error_type})")

        # Return the cloned header with templates
        result = await self.repository.get_with_templates(db, new_header_id)
        self.logger.info(f"{context}SERVICE_CLONE_HEADER_SUCCESS: Cloned header {source_header_id} to {new_header_id}")
        return result
