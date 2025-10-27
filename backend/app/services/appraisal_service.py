"""
Appraisal service for the Performance Management System.

This module provides business logic for appraisal-related operations
with proper validation and status transition management.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.goal import AppraisalGoal
from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import Goal, AppraisalGoal
from app.schemas.appraisal import AppraisalCreate, AppraisalUpdate
from app.services.base_service import BaseService
from app.repositories.appraisal_repository import AppraisalRepository
from app.repositories.category_repository import CategoryRepository
from app.exceptions import (
    EntityNotFoundError,
    ValidationError,
    BadRequestError,
    StatusTransitionError,
    WeightageValidationError
)
from app.constants import ENTITY_APPRAISAL_TYPE, ENTITY_APPRAISAL_RANGE
from app.constants import (
    APPRAISAL_TYPE_NOT_FOUND,
    APPRAISAL_RANGE_NOT_FOUND,
    APPRAISAL_RANGE_MISMATCH,
    CANNOT_SUBMIT_WITHOUT_GOALS,
    ROLE_APPRAISEE,
    ROLE_APPRAISER,
    ROLE_REVIEWER,
    ENTITY_APPRAISAL_GOAL
)
from app.exceptions.domain_exceptions import (
    BaseServiceException, BaseRepositoryException, BusinessRuleViolationError,
    UnauthorizedActionError, ValidationError as DomainValidationError,
    EntityNotFoundError as DomainEntityNotFoundError
)
from app.utils.logger import (
    get_logger, log_execution_time, log_exception, 
    log_business_operation, build_log_context, sanitize_log_data
)
from app.services.employee_service import EmployeeService
from app.utils.email import send_email_sync, send_email_background
import asyncio


class AppraisalService(BaseService):
    """Service class for appraisal operations."""
    
    def __init__(self):
        super().__init__(Appraisal)
        self.repository = AppraisalRepository()
        self.category_repository = CategoryRepository()
        self.logger = get_logger(f"app.services.{self.__class__.__name__}")
        self.logger.debug("AppraisalService initialized successfully")
    
    @property
    def entity_name(self) -> str:
        return "Appraisal"
    
    @property
    def id_field(self) -> str:
        return "appraisal_id"
    
    @property
    def _valid_transitions(self) -> Dict[AppraisalStatus, List[AppraisalStatus]]:
        """Define valid status transitions for appraisals."""
        return {
            AppraisalStatus.DRAFT: [AppraisalStatus.SUBMITTED],
            AppraisalStatus.SUBMITTED: [AppraisalStatus.APPRAISEE_SELF_ASSESSMENT],
            AppraisalStatus.APPRAISEE_SELF_ASSESSMENT: [AppraisalStatus.APPRAISER_EVALUATION],
            AppraisalStatus.APPRAISER_EVALUATION: [AppraisalStatus.REVIEWER_EVALUATION],
            AppraisalStatus.REVIEWER_EVALUATION: [AppraisalStatus.COMPLETE],
            AppraisalStatus.COMPLETE: []  # No transitions from complete
        }
    
    @log_execution_time()
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Appraisal:
        """Get appraisal by ID or raise 404 error with proper logging."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get appraisal by ID - ID: {entity_id}, Load relationships: {load_relationships}")
        
        try:
            appraisal = await self.repository.get_by_id(db, entity_id, load_relationships)
            
            if not appraisal:
                error_msg = f"{self.entity_name} with ID {entity_id} not found"
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved appraisal with ID: {entity_id}")
            return appraisal
            
        except DomainEntityNotFoundError as e:
            # Re-raise domain exceptions
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "get_by_id_or_404")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to retrieve appraisal with ID {entity_id}"
            log_exception(self.logger, e, context, "get_by_id_or_404", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: Appraisal,
        obj_in: AppraisalUpdate
    ) -> Appraisal:
        """Update an appraisal with the provided data and proper error handling."""
        context = build_log_context()
        safe_data = sanitize_log_data(obj_in.model_dump(exclude_unset=True))
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update appraisal - ID: {db_obj.appraisal_id}, Data: {safe_data}")
        
        try:
            # Convert Pydantic model to dict, excluding unset values
            update_data = obj_in.model_dump(exclude_unset=True)
            
            # Apply business logic hooks
            update_data = await self.before_update(db, db_obj, update_data)
            
            # Update fields
            updated_fields = []
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
                    updated_fields.append(field)
            
            # Flush changes
            await db.flush()
            await db.refresh(db_obj)
            
            # Apply after-update hook
            db_obj = await self.after_update(db, db_obj, db_obj, update_data)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated appraisal {db_obj.appraisal_id}, fields: {updated_fields}")
            return db_obj
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "update")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to update appraisal {db_obj.appraisal_id}"
            log_exception(self.logger, e, context, "update", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def create_appraisal(
        self,
        db: AsyncSession,
        *,
        appraisal_data: AppraisalCreate
    ) -> Appraisal:
        """Create a new appraisal with comprehensive validation and proper error handling."""
        context = build_log_context()
        safe_data = sanitize_log_data(appraisal_data.model_dump())
        
        self.logger.info(f"{context}SERVICE_REQUEST: Create appraisal - Data: {safe_data}")
        
        try:
            # Validate all employees exist
            await self._validate_employees(db, appraisal_data)
            
            # Validate appraisal type and range
            await self._validate_appraisal_type_and_range(db, appraisal_data)
            
            # Validate goals exist and belong to appraisee
            await self._validate_and_get_goals(db, appraisal_data)
            
            # Create appraisal
            obj_data = appraisal_data.model_dump()
            goal_ids = obj_data.pop("goal_ids", [])
            
            db_appraisal = Appraisal(**obj_data)
            db_appraisal = await self.repository.create(db, db_appraisal)
            
            # Add goals to appraisal
            if goal_ids:
                await self._add_goals_to_appraisal(db, db_appraisal, goal_ids)
            
            await db.refresh(db_appraisal)
            # Send notification email to appraisee in background (non-blocking)
            try:
                # Resolve appraisee email
                employee_service = EmployeeService()
                appraisee = await employee_service.get_by_id(db, db_appraisal.appraisee_id)
                if appraisee and getattr(appraisee, "emp_email", None):
                    subject = f"New Appraisal Created - ID {db_appraisal.appraisal_id}"
                    # Build template context
                    # Determine related names and counts (safe access)
                    appraisal_type_name = None
                    try:
                        appraisal_type_name = getattr(db_appraisal.appraisal_type, "name", None)
                    except Exception:
                        appraisal_type_name = None

                    appraiser_name = None
                    try:
                        appraiser_name = getattr(db_appraisal.appraiser, "emp_name", None)
                    except Exception:
                        appraiser_name = None

                    reviewer_name = None
                    try:
                        reviewer_name = getattr(db_appraisal.reviewer, "emp_name", None)
                    except Exception:
                        reviewer_name = None

                    # compute goals_count using repository to avoid lazy-loading
                    goals_count = None
                    try:
                        _tw, goals_count = await self.repository.get_weightage_and_count(db, db_appraisal.appraisal_id)
                    except Exception:
                        goals_count = None

                    template_context = {
                        "appraisee_name": appraisee.emp_name,
                        "appraisal_id": db_appraisal.appraisal_id,
                        "start_date": db_appraisal.start_date,
                        "end_date": db_appraisal.end_date,
                        "appraisal_type": appraisal_type_name,
                        "status": getattr(getattr(db_appraisal, "status", None), "value", getattr(db_appraisal, "status", None)),
                        "appraiser_name": appraiser_name,
                        "reviewer_name": reviewer_name,
                        "goals_count": goals_count,
                        "created_at": getattr(db_appraisal, "created_at", None),
                        # Provide a URL if BASE_PATH or frontend available; left empty as a placeholder
                        "appraisal_url": None
                    }
                    # Schedule background send (doesn't block)
                    try:
                        self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_created email to {appraisee.emp_email} for appraisal {db_appraisal.appraisal_id}")
                        asyncio.create_task(send_email_background(subject=subject, template_name="appraisal_created.html", context=template_context, to=appraisee.emp_email))
                    except RuntimeError:
                        # No running loop (e.g., called outside of request); fall back to thread executor via loop.run_in_executor
                        self.logger.info(f"{context}EMAIL_SCHEDULE_FALLBACK: Running send_email_background synchronously for {appraisee.emp_email}")
                        loop = asyncio.new_event_loop()
                        loop.run_until_complete(send_email_background(subject=subject, template_name="appraisal_created.html", context=template_context, to=appraisee.emp_email))

            except Exception as e:
                # Ensure email failures do not prevent appraisal creation
                log_exception(self.logger, e, context, "create_appraisal", "Email send scheduling failed")

            self.logger.info(f"{context}SERVICE_SUCCESS: Created appraisal with ID: {db_appraisal.appraisal_id}")
            return db_appraisal
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "create_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = "Failed to create appraisal"
            log_exception(self.logger, e, context, "create_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def update_appraisal_status(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        new_status: AppraisalStatus
    ) -> Appraisal:
        """Update appraisal status with validation and proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update appraisal status - ID: {appraisal_id}, New Status: {new_status}")
        
        try:
            # Get appraisal by ID with relationships
            db_appraisal = await self.get_by_id_or_404(
                db, 
                appraisal_id,
                load_relationships=["appraisal_type"]
            )
            
            # Validate status transition
            current_status = db_appraisal.status
            
            # Allow idempotent updates (same status can be set again)
            if current_status == new_status:
                self.logger.info(f"{context}SERVICE_INFO: No status change needed - already {new_status}")
                return db_appraisal
            
            # Check if transition is valid
            if new_status not in self._valid_transitions.get(current_status, []):
                error_msg = f"Invalid status transition from {current_status} to {new_status}"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
            
            # Special validation for SUBMITTED status
            if new_status == AppraisalStatus.SUBMITTED:
                await self._validate_submission_requirements_direct(db, appraisal_id)
            
            # Update status using repository
            await self.repository.update_appraisal_status(db, db_appraisal, new_status)
            await db.commit()
            await db.refresh(db_appraisal)

            # Send notification emails for certain status transitions (non-blocking)
            try:
                employee_service = EmployeeService()
                # Precompute goals_count using repository to avoid lazy-loading
                # relationships (which can trigger DB IO in threads without
                # the async/greenlet context and raise MissingGreenlet).
                try:
                    _total_weightage, goals_count = await self.repository.get_weightage_and_count(db, appraisal_id)
                except Exception:
                    goals_count = None

                # Notify appraiser when appraisal moves to APPRAISER_EVALUATION
                if new_status == AppraisalStatus.APPRAISER_EVALUATION and getattr(db_appraisal, "appraiser_id", None):
                    appraiser = await employee_service.get_by_id(db, db_appraisal.appraiser_id)
                    if appraiser and getattr(appraiser, "emp_email", None):
                        subject = f"Appraisal ready for your evaluation - ID {db_appraisal.appraisal_id}"
                        # Compose richer template context for status change
                        appraisal_type_name = None
                        try:
                            appraisal_type_name = getattr(db_appraisal.appraisal_type, "name", None)
                        except Exception:
                            appraisal_type_name = None

                        appraiser_name = None
                        try:
                            appraiser_name = getattr(appraiser, "emp_name", None)
                        except Exception:
                            appraiser_name = None

                        # use precomputed goals_count
                        goals_count = goals_count

                        template_context = {
                            "appraisee_name": getattr(db_appraisal, "appraisee_name", None) or None,
                            "appraisal_id": db_appraisal.appraisal_id,
                            "start_date": db_appraisal.start_date,
                            "end_date": db_appraisal.end_date,
                            "appraisal_type": appraisal_type_name,
                            "status": getattr(getattr(db_appraisal, "status", None), "value", getattr(db_appraisal, "status", None)),
                            "appraiser_name": appraiser_name,
                            "reviewer_name": getattr(db_appraisal, "reviewer_name", None) or None,
                            "goals_count": goals_count,
                            "updated_at": getattr(db_appraisal, "updated_at", None),
                            "appraisal_url": None
                        }
                        try:
                            self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_status_changed email to appraiser {appraiser.emp_email} for appraisal {db_appraisal.appraisal_id} (status={new_status})")
                            asyncio.create_task(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=appraiser.emp_email))
                        except RuntimeError:
                            self.logger.info(f"{context}EMAIL_SCHEDULE_FALLBACK: Running send_email_background synchronously for {appraiser.emp_email}")
                            loop = asyncio.new_event_loop()
                            loop.run_until_complete(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=appraiser.emp_email))

                # Notify reviewer when appraisal moves to REVIEWER_EVALUATION
                if new_status == AppraisalStatus.REVIEWER_EVALUATION and getattr(db_appraisal, "reviewer_id", None):
                    reviewer = await employee_service.get_by_id(db, db_appraisal.reviewer_id)
                    if reviewer and getattr(reviewer, "emp_email", None):
                        subject = f"Appraisal ready for review - ID {db_appraisal.appraisal_id}"
                        # Reviewer notification context
                        appraisal_type_name = None
                        try:
                            appraisal_type_name = getattr(db_appraisal.appraisal_type, "name", None)
                        except Exception:
                            appraisal_type_name = None

                        template_context = {
                            "appraisee_name": getattr(db_appraisal, "appraisee_name", None) or None,
                            "appraisal_id": db_appraisal.appraisal_id,
                            "start_date": db_appraisal.start_date,
                            "end_date": db_appraisal.end_date,
                            "appraisal_type": appraisal_type_name,
                            "status": getattr(getattr(db_appraisal, "status", None), "value", getattr(db_appraisal, "status", None)),
                            "appraiser_name": getattr(db_appraisal, "appraiser_name", None) or None,
                            "reviewer_name": getattr(reviewer, "emp_name", None),
                            "goals_count": goals_count,
                            "updated_at": getattr(db_appraisal, "updated_at", None),
                            "appraisal_url": None
                        }
                        try:
                            self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_status_changed email to reviewer {reviewer.emp_email} for appraisal {db_appraisal.appraisal_id} (status={new_status})")
                            asyncio.create_task(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=reviewer.emp_email))
                        except RuntimeError:
                            self.logger.info(f"{context}EMAIL_SCHEDULE_FALLBACK: Running send_email_background synchronously for {reviewer.emp_email}")
                            loop = asyncio.new_event_loop()
                            loop.run_until_complete(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=reviewer.emp_email))
                    # Additionally notify appraisee and appraiser that the appraisal progressed to reviewer evaluation
                    # (some workflows expect both parties to be aware when review starts)
                    try:
                        # Appraisee
                        if getattr(db_appraisal, "appraisee_id", None):
                            appraisee = await employee_service.get_by_id(db, db_appraisal.appraisee_id)
                            if appraisee and getattr(appraisee, "emp_email", None):
                                subj_a = f"Your appraisal moved to Reviewer Evaluation - ID {db_appraisal.appraisal_id}"
                                tmpl_ctx_a = dict(template_context)
                                tmpl_ctx_a.update({
                                    "appraisee_name": getattr(appraisee, "emp_name", None) or None
                                })
                                try:
                                    self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_status_changed email to appraisee {appraisee.emp_email} for appraisal {db_appraisal.appraisal_id} (status={new_status})")
                                    asyncio.create_task(send_email_background(subject=subj_a, template_name="appraisal_status_changed.html", context=tmpl_ctx_a, to=appraisee.emp_email))
                                except RuntimeError:
                                    loop = asyncio.new_event_loop()
                                    loop.run_until_complete(send_email_background(subject=subj_a, template_name="appraisal_status_changed.html", context=tmpl_ctx_a, to=appraisee.emp_email))

                        # Appraiser
                        if getattr(db_appraisal, "appraiser_id", None):
                            appraiser = await employee_service.get_by_id(db, db_appraisal.appraiser_id)
                            if appraiser and getattr(appraiser, "emp_email", None):
                                subj_b = f"Appraisal moved to Reviewer Evaluation - ID {db_appraisal.appraisal_id}"
                                tmpl_ctx_b = dict(template_context)
                                tmpl_ctx_b.update({
                                    "appraiser_name": getattr(appraiser, "emp_name", None) or None
                                })
                                try:
                                    self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_status_changed email to appraiser {appraiser.emp_email} for appraisal {db_appraisal.appraisal_id} (status={new_status})")
                                    asyncio.create_task(send_email_background(subject=subj_b, template_name="appraisal_status_changed.html", context=tmpl_ctx_b, to=appraiser.emp_email))
                                except RuntimeError:
                                    loop = asyncio.new_event_loop()
                                    loop.run_until_complete(send_email_background(subject=subj_b, template_name="appraisal_status_changed.html", context=tmpl_ctx_b, to=appraiser.emp_email))
                    except Exception as e:
                        # Log but don't interrupt main flow
                        self.logger.warning(f"{context}EMAIL_NOTIFY_PARTIES_FAILED: Failed scheduling additional notifications for reviewer-evaluation - {e}")

                # Notify both appraisee and appraiser when appraisal completes
                if new_status == AppraisalStatus.COMPLETE:
                    # Appraisee
                    if getattr(db_appraisal, "appraisee_id", None):
                        appraisee = await employee_service.get_by_id(db, db_appraisal.appraisee_id)
                        if appraisee and getattr(appraisee, "emp_email", None):
                            subject = f"Your appraisal is complete - ID {db_appraisal.appraisal_id}"
                            # Appraisee completion notification context
                            template_context = {
                                "appraisee_name": getattr(appraisee, "emp_name", None) or None,
                                "appraisal_id": db_appraisal.appraisal_id,
                                "start_date": db_appraisal.start_date,
                                "end_date": db_appraisal.end_date,
                                "appraisal_type": getattr(db_appraisal.appraisal_type, "name", None),
                                "status": getattr(getattr(db_appraisal, "status", None), "value", getattr(db_appraisal, "status", None)),
                                "appraiser_name": getattr(db_appraisal, "appraiser_name", None) or None,
                                "reviewer_name": getattr(db_appraisal, "reviewer_name", None) or None,
                                "goals_count": goals_count,
                                "updated_at": getattr(db_appraisal, "updated_at", None),
                                "appraisal_url": None
                            }
                            try:
                                self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_status_changed (complete) email to appraisee {appraisee.emp_email} for appraisal {db_appraisal.appraisal_id}")
                                asyncio.create_task(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=appraisee.emp_email))
                            except RuntimeError:
                                self.logger.info(f"{context}EMAIL_SCHEDULE_FALLBACK: Running send_email_background synchronously for {appraisee.emp_email}")
                                loop = asyncio.new_event_loop()
                                loop.run_until_complete(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=appraisee.emp_email))

                    # Appraiser
                    if getattr(db_appraisal, "appraiser_id", None):
                        appraiser = await employee_service.get_by_id(db, db_appraisal.appraiser_id)
                        if appraiser and getattr(appraiser, "emp_email", None):
                            subject = f"Appraisal completed - ID {db_appraisal.appraisal_id}"
                            # Appraiser completion notification context
                            template_context = {
                                "appraisee_name": getattr(db_appraisal, "appraisee_name", None) or None,
                                "appraisal_id": db_appraisal.appraisal_id,
                                "start_date": db_appraisal.start_date,
                                "end_date": db_appraisal.end_date,
                                "appraisal_type": getattr(db_appraisal.appraisal_type, "name", None),
                                "status": getattr(getattr(db_appraisal, "status", None), "value", getattr(db_appraisal, "status", None)),
                                "appraiser_name": getattr(db_appraisal, "appraiser_name", None) or None,
                                "reviewer_name": getattr(db_appraisal, "reviewer_name", None) or None,
                                "goals_count": goals_count,
                                "updated_at": getattr(db_appraisal, "updated_at", None),
                                "appraisal_url": None
                            }
                            try:
                                self.logger.info(f"{context}EMAIL_SCHEDULE: Scheduling appraisal_status_changed (complete) email to appraiser {appraiser.emp_email} for appraisal {db_appraisal.appraisal_id}")
                                asyncio.create_task(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=appraiser.emp_email))
                            except RuntimeError:
                                self.logger.info(f"{context}EMAIL_SCHEDULE_FALLBACK: Running send_email_background synchronously for {appraiser.emp_email}")
                                loop = asyncio.new_event_loop()
                                loop.run_until_complete(send_email_background(subject=subject, template_name="appraisal_status_changed.html", context=template_context, to=appraiser.emp_email))

            except Exception as e:
                # Ensure email failures do not prevent status update
                log_exception(self.logger, e, context, "update_appraisal_status", "Email scheduling failed")

            self.logger.info(f"{context}SERVICE_SUCCESS: Updated appraisal {appraisal_id} status from {current_status} to {new_status}")
            return db_appraisal
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "update_appraisal_status")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to update appraisal status for ID {appraisal_id}"
            log_exception(self.logger, e, context, "update_appraisal_status", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def get_appraisals_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AppraisalStatus] = None,
        appraisee_id: Optional[int] = None,
        appraiser_id: Optional[int] = None,
        reviewer_id: Optional[int] = None,
        appraisal_type_id: Optional[int] = None
    ) -> List[Appraisal]:
        """Get appraisals with filtering and proper error handling."""
        context = build_log_context()
        filter_info = {
            "skip": skip, "limit": limit, "status": status,
            "appraisee_id": appraisee_id, "appraiser_id": appraiser_id,
            "reviewer_id": reviewer_id, "appraisal_type_id": appraisal_type_id
        }
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get appraisals with filters - {filter_info}")
        
        try:
            filters = []
            
            if status:
                filters.append(Appraisal.status == status)
            
            if appraisee_id:
                filters.append(Appraisal.appraisee_id == appraisee_id)
            
            if appraiser_id:
                filters.append(Appraisal.appraiser_id == appraiser_id)
            
            if reviewer_id:
                filters.append(Appraisal.reviewer_id == reviewer_id)
            
            if appraisal_type_id:
                filters.append(Appraisal.appraisal_type_id == appraisal_type_id)
            
            appraisals = await self.repository.get_with_filters(
                db, skip=skip, limit=limit, filters=filters
            )
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(appraisals)} appraisals with filters")
            return appraisals
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "get_appraisals_with_filters")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = "Failed to retrieve appraisals with filters"
            log_exception(self.logger, e, context, "get_appraisals_with_filters", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def add_goals_to_appraisal(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        goal_ids: List[int]
    ) -> Appraisal:
        """Add goals to an existing appraisal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Add goals to appraisal - Appraisal ID: {appraisal_id}, Goal IDs: {goal_ids}")
        
        try:
            db_appraisal = await self.get_by_id_or_404(
                db, 
                appraisal_id,
                load_relationships=["appraisal_goals"]
            )
            
            # Validate goals exist and belong to appraisee
            await self._validate_goal_ids(db, goal_ids)
            
            # Add goals to appraisal using batch processing
            goals_added = await self._add_goals_to_appraisal(db, db_appraisal, goal_ids)
            
            await db.refresh(db_appraisal)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Added {goals_added} goals to appraisal {appraisal_id} (requested: {len(goal_ids)}, duplicates: {len(goal_ids) - goals_added})")
            return db_appraisal
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "add_goals_to_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to add goals to appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "add_goals_to_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def update_self_assessment(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        goals_data: Dict[int, Dict[str, Any]]
    ) -> Appraisal:
        """Update self assessment for appraisal goals with proper error handling."""
        context = build_log_context()
        safe_goals_data = sanitize_log_data(goals_data)
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update self assessment - Appraisal ID: {appraisal_id}, Goals: {safe_goals_data}")
        
        try:
            db_appraisal = await self.get_by_id_or_404(
                db, 
                appraisal_id,
                load_relationships=["appraisal_goals"]
            )
            
            # Validate appraisal is in correct status
            if db_appraisal.status != AppraisalStatus.APPRAISEE_SELF_ASSESSMENT:
                error_msg = f"Appraisal must be in 'Appraisee Self Assessment' status, current: {db_appraisal.status}"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
            
            # Update goal assessments
            updated_goals = []
            for goal_id, goal_data in goals_data.items():
                appraisal_goal = await self.repository.find_appraisal_goal(db, db_appraisal.appraisal_id, goal_id)
                
                if not appraisal_goal:
                    raise DomainEntityNotFoundError(f"Goal {goal_id} not found in appraisal {appraisal_id}")
                
                self_comment = goal_data.get("self_comment")
                self_rating = goal_data.get("self_rating")
                
                if self_rating is not None and not 1 <= self_rating <= 5:
                    raise DomainValidationError("Rating must be between 1 and 5")
                
                await self.repository.update_appraisal_goal_self_assessment(
                    db, appraisal_goal, self_comment, self_rating
                )
                updated_goals.append(goal_id)
            
            await db.flush()
            
            # Reload with all necessary relationships for the response
            result = await self.get_appraisal_with_goals(db, appraisal_id)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated self assessment for appraisal {appraisal_id}, goals: {updated_goals}")
            return result
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "update_self_assessment")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to update self assessment for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "update_self_assessment", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def update_appraiser_evaluation(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        goals_data: Dict[int, Dict[str, Any]],
        appraiser_overall_comments: Optional[str] = None,
        appraiser_overall_rating: Optional[int] = None
    ) -> Appraisal:
        """Update appraiser evaluation for appraisal goals and overall assessment with proper error handling."""
        context = build_log_context()
        safe_goals_data = sanitize_log_data(goals_data)
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update appraiser evaluation - Appraisal ID: {appraisal_id}, Goals: {safe_goals_data}")
        
        try:
            db_appraisal = await self.get_by_id_or_404(
                db, 
                appraisal_id,
                load_relationships=["appraisal_goals"]
            )
            
            # Validate appraisal is in correct status
            if db_appraisal.status != AppraisalStatus.APPRAISER_EVALUATION:
                error_msg = f"Appraisal must be in 'Appraiser Evaluation' status, current: {db_appraisal.status}"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
            
            # Update goal evaluations
            updated_goals = []
            for goal_id, goal_data in goals_data.items():
                appraisal_goal = await self.repository.find_appraisal_goal(db, db_appraisal.appraisal_id, goal_id)
                
                if not appraisal_goal:
                    raise DomainEntityNotFoundError(f"Goal {goal_id} not found in appraisal {appraisal_id}")
                
                appraiser_comment = goal_data.get("appraiser_comment")
                appraiser_rating = goal_data.get("appraiser_rating")
                
                if appraiser_rating is not None and not 1 <= appraiser_rating <= 5:
                    raise DomainValidationError("Rating must be between 1 and 5")
                
                await self.repository.update_appraisal_goal_appraiser_evaluation(
                    db, appraisal_goal, appraiser_comment, appraiser_rating
                )
                updated_goals.append(goal_id)
            
            # Update overall appraiser evaluation
            if appraiser_overall_rating is not None and not 1 <= appraiser_overall_rating <= 5:
                raise DomainValidationError("Overall rating must be between 1 and 5")
            
            await self.repository.update_overall_appraiser_evaluation(
                db, db_appraisal, appraiser_overall_comments, appraiser_overall_rating
            )
            
            await db.flush()
            
            # Reload with all necessary relationships for the response
            result = await self.get_appraisal_with_goals(db, appraisal_id)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated appraiser evaluation for appraisal {appraisal_id}, goals: {updated_goals}")
            return result
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "update_appraiser_evaluation")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to update appraiser evaluation for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "update_appraiser_evaluation", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def update_reviewer_evaluation(
        self,
        db: AsyncSession,
        *,
        appraisal_id: int,
        reviewer_overall_comments: Optional[str] = None,
        reviewer_overall_rating: Optional[int] = None
    ) -> Appraisal:
        """Update reviewer evaluation for overall assessment with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update reviewer evaluation - Appraisal ID: {appraisal_id}, Rating: {reviewer_overall_rating}")
        
        try:
            db_appraisal = await self.get_by_id_or_404(
                db, 
                appraisal_id,
                load_relationships=["appraisal_goals"]
            )
            
            # Validate appraisal is in correct status
            if db_appraisal.status != AppraisalStatus.REVIEWER_EVALUATION:
                error_msg = f"Appraisal must be in 'Reviewer Evaluation' status, current: {db_appraisal.status}"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
            
            # Update overall reviewer evaluation
            if reviewer_overall_rating is not None and not 1 <= reviewer_overall_rating <= 5:
                raise DomainValidationError("Overall rating must be between 1 and 5")
            
            await self.repository.update_overall_reviewer_evaluation(
                db, db_appraisal, reviewer_overall_comments, reviewer_overall_rating
            )
            
            await db.flush()
            
            # Reload with all necessary relationships for the response
            result = await self.get_appraisal_with_goals(db, appraisal_id)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated reviewer evaluation for appraisal {appraisal_id}")
            return result
            
        except (BaseRepositoryException, BusinessRuleViolationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Handle domain exceptions
            log_exception(self.logger, e, context, "update_reviewer_evaluation")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to update reviewer evaluation for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "update_reviewer_evaluation", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _validate_employees(
        self,
        db: AsyncSession,
        appraisal_data: AppraisalCreate
    ) -> None:
        """Validate that all employees exist with proper error handling."""
        context = build_log_context()
        
        employees_to_check = [
            (appraisal_data.appraisee_id, ROLE_APPRAISEE),
            (appraisal_data.appraiser_id, ROLE_APPRAISER),
            (appraisal_data.reviewer_id, ROLE_REVIEWER)
        ]
        
        self.logger.info(f"{context}SERVICE_VALIDATION: Validating employees - {[f'{role}:{emp_id}' for emp_id, role in employees_to_check]}")
        
        try:
            for emp_id, role in employees_to_check:
                employee = await self.repository.get_employee_by_id(db, emp_id)
                
                if not employee:
                    error_msg = f"{role} with ID {emp_id} not found"
                    self.logger.warning(f"{context}VALIDATION_FAILED: {error_msg}")
                    raise DomainEntityNotFoundError(error_msg)
                
                if not employee.emp_status:
                    error_msg = f"{role} must be an active employee"
                    self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                    raise BusinessRuleViolationError(error_msg)
                    
            self.logger.info(f"{context}SERVICE_VALIDATION: All employees validated successfully")
            
        except (DomainEntityNotFoundError, BusinessRuleViolationError) as e:
            # Re-raise domain exceptions
            raise e
            
        except Exception as e:
            error_msg = "Failed to validate employees"
            log_exception(self.logger, e, context, "_validate_employees", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _validate_appraisal_type_and_range(
        self,
        db: AsyncSession,
        appraisal_data: AppraisalCreate
    ) -> None:
        """Validate appraisal type and range with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_VALIDATION: Validating appraisal type {appraisal_data.appraisal_type_id} and range {appraisal_data.appraisal_type_range_id}")
        
        try:
            # Check appraisal type exists
            appraisal_type = await self.repository.get_appraisal_type_by_id(db, appraisal_data.appraisal_type_id)
            
            if not appraisal_type:
                error_msg = f"Appraisal type with ID {appraisal_data.appraisal_type_id} not found"
                self.logger.warning(f"{context}VALIDATION_FAILED: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)
            
            # Check appraisal range if provided
            if appraisal_data.appraisal_type_range_id:
                appraisal_range = await self.repository.get_appraisal_range_by_id(db, appraisal_data.appraisal_type_range_id)
                
                if not appraisal_range:
                    error_msg = f"Appraisal range with ID {appraisal_data.appraisal_type_range_id} not found"
                    self.logger.warning(f"{context}VALIDATION_FAILED: {error_msg}")
                    raise DomainEntityNotFoundError(error_msg)
                
                # Check if range belongs to the type
                if appraisal_range.appraisal_type_id != appraisal_data.appraisal_type_id:
                    error_msg = "Appraisal range does not match appraisal type"
                    self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                    raise BusinessRuleViolationError(error_msg)
                    
            self.logger.info(f"{context}SERVICE_VALIDATION: Appraisal type and range validated successfully")
            
        except (DomainEntityNotFoundError, BusinessRuleViolationError) as e:
            # Re-raise domain exceptions
            raise e
            
        except Exception as e:
            error_msg = "Failed to validate appraisal type and range"
            log_exception(self.logger, e, context, "_validate_appraisal_type_and_range", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _validate_and_get_goals(
        self,
        db: AsyncSession,
        appraisal_data: AppraisalCreate
    ) -> List[Goal]:
        """Validate goals and check weightage requirements with proper error handling."""
        context = build_log_context()
        
        if not appraisal_data.goal_ids:
            self.logger.info(f"{context}SERVICE_VALIDATION: No goals provided for appraisal")
            return []
        
        self.logger.info(f"{context}SERVICE_VALIDATION: Validating {len(appraisal_data.goal_ids)} goals and weightage")
        
        try:
            goals = await self._validate_goal_ids(db, appraisal_data.goal_ids)
            
            # Check weightage for non-draft status
            if appraisal_data.status != AppraisalStatus.DRAFT:
                total_weightage = sum(goal.goal_weightage for goal in goals)
                if total_weightage != 100:
                    error_msg = f"Total weightage must be 100%, current: {total_weightage}%"
                    self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                    raise BusinessRuleViolationError(error_msg)
                    
            self.logger.info(f"{context}SERVICE_VALIDATION: Goals and weightage validated successfully")
            return goals
            
        except (DomainEntityNotFoundError, BusinessRuleViolationError) as e:
            # Re-raise domain exceptions
            raise e
            
        except Exception as e:
            error_msg = "Failed to validate goals and weightage"
            log_exception(self.logger, e, context, "_validate_and_get_goals", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _validate_goal_ids(
        self,
        db: AsyncSession,
        goal_ids: List[int]
    ) -> List[Goal]:
        """Validate that all goal IDs exist and return the goals with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_VALIDATION: Validating goal IDs: {goal_ids}")
        
        try:
            goals = await self.repository.get_goals_by_ids(db, goal_ids)
            
            # Check if we got all the goals we requested
            found_goal_ids = {goal.goal_id for goal in goals}
            missing_goal_ids = set(goal_ids) - found_goal_ids
            
            if missing_goal_ids:
                error_msg = f"Goals not found with IDs: {list(missing_goal_ids)}"
                self.logger.warning(f"{context}VALIDATION_FAILED: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)
            
            self.logger.info(f"{context}SERVICE_VALIDATION: All {len(goals)} goal IDs validated successfully")
            return goals
            
        except DomainEntityNotFoundError as e:
            # Re-raise domain exceptions
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "_validate_goal_ids")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to validate goal IDs: {goal_ids}"
            log_exception(self.logger, e, context, "_validate_goal_ids", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _add_goals_to_appraisal(
        self,
        db: AsyncSession,
        appraisal: Appraisal,
        goal_ids: List[int]
    ) -> int:
        """
        Add goals to appraisal as AppraisalGoal records with proper error handling.
        
        Uses batch processing for better performance and returns count of goals added.
        
        Args:
            db: Database session
            appraisal: Appraisal entity
            goal_ids: List of goal IDs to add
            
        Returns:
            int: Number of goals actually added (excluding duplicates)
            
        Raises:
            BaseRepositoryException: Repository-level errors
            BaseServiceException: Service-level errors
        """
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_OPERATION: Adding {len(goal_ids)} goals to appraisal {appraisal.appraisal_id}")
        
        try:
            # Use batch repository method for better performance
            goals_added = await self.repository.add_multiple_goals_to_appraisal(
                db, appraisal.appraisal_id, goal_ids
            )
                
            self.logger.info(f"{context}SERVICE_SUCCESS: Added {goals_added} goals to appraisal {appraisal.appraisal_id} (duplicates skipped: {len(goal_ids) - goals_added})")
            return goals_added
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "_add_goals_to_appraisal")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to add goals {goal_ids} to appraisal {appraisal.appraisal_id}"
            log_exception(self.logger, e, context, "_add_goals_to_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _validate_submission_requirements(
        self,
        db: AsyncSession,
        appraisal: Appraisal
    ) -> None:
        """Validate requirements for submitting an appraisal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_VALIDATION: Validating submission requirements for appraisal {appraisal.appraisal_id}")
        
        try:
            if not appraisal.appraisal_goals:
                error_msg = "Cannot submit appraisal without goals"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
            
            # Check total weightage
            total_weightage = sum(
                ag.goal.goal_weightage for ag in appraisal.appraisal_goals
            )
            
            if total_weightage != 100:
                error_msg = f"Total weightage must be 100% for submission, current: {total_weightage}%"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
                
            self.logger.info(f"{context}SERVICE_VALIDATION: Submission requirements validated - {len(appraisal.appraisal_goals)} goals, {total_weightage}% weightage")
            
        except BusinessRuleViolationError as e:
            # Re-raise business rule violations
            raise e
            
        except Exception as e:
            error_msg = f"Failed to validate submission requirements for appraisal {appraisal.appraisal_id}"
            log_exception(self.logger, e, context, "_validate_submission_requirements", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    async def _validate_submission_requirements_direct(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> None:
        """Validate requirements for submitting an appraisal using direct queries with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_VALIDATION: Direct validation of submission requirements for appraisal {appraisal_id}")
        
        try:
            # Get weightage and count from repository
            total_weightage, goal_count = await self.repository.get_weightage_and_count(db, appraisal_id)

            if goal_count == 0 or total_weightage != 100:
                error_msg = f"Cannot submit appraisal: must have goals totalling 100% weightage (current: {goal_count} goals, {total_weightage}% weightage)"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
                
            self.logger.info(f"{context}SERVICE_VALIDATION: Direct submission validation passed - {goal_count} goals, {total_weightage}% weightage")
            
        except BusinessRuleViolationError as e:
            # Re-raise business rule violations
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "_validate_submission_requirements_direct")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to validate submission requirements for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "_validate_submission_requirements_direct", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
    
    @log_execution_time()
    async def get_appraisal_with_goals(
        self,
        db: AsyncSession,
        appraisal_id: int
    ) -> Appraisal:
        """Get an appraisal with all its goals and nested relationships loaded with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get appraisal with goals - ID: {appraisal_id}")
        
        try:
            appraisal = await self.repository.get_with_goals_and_relationships(db, appraisal_id)
            
            if not appraisal:
                raise DomainEntityNotFoundError(f"{self.entity_name} with ID {appraisal_id} not found")
            
            goal_count = len(appraisal.appraisal_goals) if appraisal.appraisal_goals else 0
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved appraisal {appraisal_id} with {goal_count} goals")
            
            return appraisal
            
        except DomainEntityNotFoundError as e:
            # Handle entity not found
            log_exception(self.logger, e, context, "get_appraisal_with_goals")
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "get_appraisal_with_goals")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to retrieve appraisal with goals for ID {appraisal_id}"
            log_exception(self.logger, e, context, "get_appraisal_with_goals", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def add_single_goal_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> None:
        """Add a single goal to appraisal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Add single goal to appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            existing_appraisal_goal = await self.repository.get_existing_appraisal_goal(db, appraisal_id, goal_id)

            if not existing_appraisal_goal:
                appraisal_goal = AppraisalGoal(appraisal_id=appraisal_id, goal_id=goal_id)
                await self.repository.add_appraisal_goal(db, appraisal_goal)
                
                self.logger.info(f"{context}SERVICE_SUCCESS: Added goal {goal_id} to appraisal {appraisal_id}")
            else:
                self.logger.info(f"{context}SERVICE_INFO: Goal {goal_id} already exists in appraisal {appraisal_id}")
                
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "add_single_goal_to_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to add goal {goal_id} to appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "add_single_goal_to_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})


    @log_execution_time()
    async def update_appraisal_goal(self, db: AsyncSession, appraisal_id: int) -> AppraisalGoal:
        """Update an existing AppraisalGoal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update appraisal goal - Appraisal ID: {appraisal_id}")
        
        try:
            db_appraisal = await self.repository.update_appraisal_goal(db, appraisal_id)

            if not db_appraisal:
                error_msg = f"Appraisal with ID {appraisal_id} not found"
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)

            self.logger.info(f"{context}SERVICE_SUCCESS: Updated appraisal goal for appraisal {appraisal_id}")
            return db_appraisal
            
        except DomainEntityNotFoundError as e:
            # Re-raise domain exceptions
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "update_appraisal_goal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to update appraisal goal for ID {appraisal_id}"
            log_exception(self.logger, e, context, "update_appraisal_goal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})


    @log_execution_time()
    async def remove_goal_from_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> None:
        """Remove goal from appraisal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Remove goal from appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            existing_appraisal_goal = await self.repository.get_appraisal_goal_by_id(db, appraisal_id, goal_id)

            if not existing_appraisal_goal:
                error_msg = f"AppraisalGoal not found - appraisal_id={appraisal_id}, goal_id={goal_id}"
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)
            
            await self.repository.remove_appraisal_goal(db, existing_appraisal_goal)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Removed goal {goal_id} from appraisal {appraisal_id}")
            
        except DomainEntityNotFoundError as e:
            # Re-raise domain exceptions
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "remove_goal_from_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to remove goal {goal_id} from appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "remove_goal_from_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_appraisal(self, appraisal_id: int) -> Appraisal:
        """Get an appraisal by ID with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get appraisal - ID: {appraisal_id}")
        
        try:
            db_appraisal = await self.repository.get_appraisal_by_id(appraisal_id)

            if not db_appraisal:
                error_msg = f"Appraisal with ID {appraisal_id} not found"
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)
            
            # Check if appraisal is in Draft status (only allow adding goals in Draft)
            if db_appraisal.status != AppraisalStatus.DRAFT:
                error_msg = f"Cannot add goals when appraisal is in {db_appraisal.status} status. Goals can only be added in Draft status."
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)

            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved appraisal {appraisal_id} in {db_appraisal.status} status")
            return db_appraisal
            
        except (DomainEntityNotFoundError, BusinessRuleViolationError) as e:
            # Re-raise domain exceptions
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "get_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to retrieve appraisal with ID {appraisal_id}"
            log_exception(self.logger, e, context, "get_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_goals_by_id(self, db: AsyncSession, goal_id: int) -> Goal:
        """Get goal by ID with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get goal by ID - Goal ID: {goal_id}")
        
        try:
            db_goal = await self.repository.get_goal_by_id(db, goal_id)

            if not db_goal:
                error_msg = f"Goal with ID {goal_id} not found"
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)

            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved goal {goal_id}")
            return db_goal
            
        except DomainEntityNotFoundError as e:
            # Re-raise domain exceptions
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "get_goals_by_id")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to retrieve goal with ID {goal_id}"
            log_exception(self.logger, e, context, "get_goals_by_id", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def check_goal_not_already_in_appraisal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> None:
        """Check that goal is not already linked to a different appraisal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Check goal not in appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            existing_link_any = await self.repository.get_appraisal_goal(db, goal_id)

            if existing_link_any and existing_link_any.appraisal_id == appraisal_id:
                error_msg = f"Goal {goal_id} is already linked with different appraisal"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
                
            self.logger.info(f"{context}SERVICE_SUCCESS: Goal {goal_id} is available for appraisal {appraisal_id}")
            
        except BusinessRuleViolationError as e:
            # Re-raise business rule violations
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "check_goal_not_already_in_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to check goal {goal_id} availability for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "check_goal_not_already_in_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def check_goal_in_appraisal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> None:
        """Check if goal is already in appraisal with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Check goal in appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            existing_link_any = await self.repository.get_appraisal_goal_by_id(db, appraisal_id, goal_id)

            if existing_link_any:
                error_msg = f"Goal {goal_id} is already added to this appraisal {appraisal_id}"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
                
            self.logger.info(f"{context}SERVICE_SUCCESS: Goal {goal_id} is not yet in appraisal {appraisal_id}")
            
        except BusinessRuleViolationError as e:
            # Re-raise business rule violations
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "check_goal_in_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to check goal {goal_id} in appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "check_goal_in_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
        

    @log_execution_time()
    async def check_total_weightage(self, db: AsyncSession, appraisal_id: int, db_goal: Goal) -> None:
        """Check total weightage doesn't exceed 100% with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Check total weightage - Appraisal ID: {appraisal_id}, Goal weightage: {db_goal.goal_weightage}")
        
        try:
            total_weightage = await self.repository.calculate_total_weightage(db, appraisal_id)
            new_total_weightage = total_weightage + db_goal.goal_weightage
            
            if new_total_weightage > 100:
                error_msg = f"Total weightage would exceed 100%: current {total_weightage}% + new {db_goal.goal_weightage}% = {new_total_weightage}%"
                self.logger.warning(f"{context}BUSINESS_RULE_VIOLATION: {error_msg}")
                raise BusinessRuleViolationError(error_msg)
                
            self.logger.info(f"{context}SERVICE_SUCCESS: Weightage check passed - Current: {total_weightage}%, Adding: {db_goal.goal_weightage}%, New total: {new_total_weightage}%")
            
        except BusinessRuleViolationError as e:
            # Re-raise business rule violations
            raise e
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "check_total_weightage")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to check total weightage for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "check_total_weightage", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def add_goal_to_appraisal(
        self,
        db: AsyncSession,
        appraisal_id: int,
        goal_id: int
    ) -> None:
        """Add a goal to an appraisal after performing necessary checks with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Add goal to appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            appraisal_goal = AppraisalGoal(
                appraisal_id=appraisal_id,
                goal_id=goal_id
            )
            await self.repository.add_appraisal_goal(db, appraisal_goal)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Added goal {goal_id} to appraisal {appraisal_id}")
            
        except BaseRepositoryException as e:
            # Handle repository exceptions
            log_exception(self.logger, e, context, "add_goal_to_appraisal")
            raise e
            
        except Exception as e:
            # Handle unexpected errors
            error_msg = f"Failed to add goal {goal_id} to appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "add_goal_to_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})


    @log_execution_time()
    async def load_appraisal(self, db: AsyncSession, db_appraisal: Appraisal) -> Appraisal:
        """Load appraisal with relationships with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Load appraisal - ID: {db_appraisal.appraisal_id}")
        
        try:
            result = await self.repository.load_appraisal(db, db_appraisal)
            self.logger.info(f"{context}SERVICE_SUCCESS: Loaded appraisal {db_appraisal.appraisal_id}")
            return result
            
        except BaseRepositoryException as e:
            log_exception(self.logger, e, context, "load_appraisal")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to load appraisal {db_appraisal.appraisal_id}"
            log_exception(self.logger, e, context, "load_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def if_no_link_exists_delete_appraisal(self, db: AsyncSession, goal_id: int) -> None:
        """Delete goal if no appraisal links exist with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Check and delete orphaned goal - Goal ID: {goal_id}")
        
        try:
            remaining_link = await self.repository.get_appraisal_goal(db, goal_id)

            if not remaining_link:
                goal = await self.repository.get_goal_by_id(db, goal_id)
                
                if goal:
                    await self.repository.delete_goal(db, goal)
                    self.logger.info(f"{context}SERVICE_SUCCESS: Deleted orphaned goal {goal_id}")
                else:
                    self.logger.info(f"{context}SERVICE_INFO: Goal {goal_id} already deleted")
            else:
                self.logger.info(f"{context}SERVICE_INFO: Goal {goal_id} still has appraisal links, not deleted")
                
        except BaseRepositoryException as e:
            log_exception(self.logger, e, context, "if_no_link_exists_delete_appraisal")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to check/delete goal {goal_id}"
            log_exception(self.logger, e, context, "if_no_link_exists_delete_appraisal", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def check_if_appraisal_exist(self, appraisal_id: int) -> Appraisal:
        """Check if appraisal exists with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Check appraisal exists - ID: {appraisal_id}")
        
        try:
            db_appraisal = await self.repository.get_appraisal_by_id(appraisal_id)

            if not db_appraisal:
                error_msg = f"Appraisal with ID {appraisal_id} not found"
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {error_msg}")
                raise DomainEntityNotFoundError(error_msg)
                
            self.logger.info(f"{context}SERVICE_SUCCESS: Appraisal {appraisal_id} exists")
            return db_appraisal
            
        except DomainEntityNotFoundError as e:
            raise e
            
        except BaseRepositoryException as e:
            log_exception(self.logger, e, context, "check_if_appraisal_exist")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to check if appraisal {appraisal_id} exists"
            log_exception(self.logger, e, context, "check_if_appraisal_exist", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def calculate_current_total_weightage(self, db: AsyncSession, appraisal_id: int):
        """Calculate current total weightage with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Calculate total weightage - Appraisal ID: {appraisal_id}")
        
        try:
            total_weightage = await self.repository.calculate_total_weightage(db, appraisal_id)
            self.logger.info(f"{context}SERVICE_SUCCESS: Total weightage for appraisal {appraisal_id}: {total_weightage}%")
            return total_weightage
            
        except BaseRepositoryException as e:
            log_exception(self.logger, e, context, "calculate_current_total_weightage")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to calculate total weightage for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "calculate_current_total_weightage", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_individual_goal_weightages(self, db: AsyncSession, appraisal_id: int):
        """Get individual goal weightages with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get individual goal weightages - Appraisal ID: {appraisal_id}")
        
        try:
            weightages = await self.repository.get_individual_goal_weightages(db, appraisal_id)
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(weightages) if weightages else 0} goal weightages for appraisal {appraisal_id}")
            return weightages
            
        except BaseRepositoryException as e:
            log_exception(self.logger, e, context, "get_individual_goal_weightages")
            raise e
            
        except Exception as e:
            error_msg = f"Failed to get individual goal weightages for appraisal {appraisal_id}"
            log_exception(self.logger, e, context, "get_individual_goal_weightages", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})
        
    @log_execution_time()
    async def get_categories(self, db: AsyncSession):
        """Get categories with proper error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get categories")
        
        try:
            categories = await self.category_repository.get_categories(db)
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(categories) if categories else 0} categories")
            return categories
            
        except BaseRepositoryException as e:
            log_exception(self.logger, e, context, "get_categories")
            raise e
            
        except Exception as e:
            error_msg = "Failed to retrieve categories"
            log_exception(self.logger, e, context, "get_categories", error_msg)
            raise BaseServiceException(error_msg, details={"original_error": str(e)})