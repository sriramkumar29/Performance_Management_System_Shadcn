from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError, NoResultFound

from app.models.appraisal import Appraisal, AppraisalStatus
from app.models.goal import AppraisalGoal
from app.models.goal import Goal
from app.models.employee import Employee
from app.models.appraisal_type import AppraisalType, AppraisalRange
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, sanitize_log_data, log_execution_time


class AppraisalRepository(BaseRepository[Appraisal]):
    """Repository for appraisal-related database operations with comprehensive logging."""
    
    def __init__(self):
        super().__init__(Appraisal)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Appraisal"

    @property
    def id_field(self) -> str:
        return "appraisal_id"

    @log_execution_time()
    async def create(self, db: AsyncSession, appraisal: Appraisal) -> Appraisal:
        """Create a new appraisal with comprehensive logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}REPO_CREATE: Creating appraisal - Type: {appraisal.appraisal_type_id}, Appraisee: {appraisal.appraisee_id}")
        
        try:
            db.add(appraisal)
            await db.flush()
            await db.refresh(appraisal)
            
            self.logger.info(f"{context}REPO_CREATE_SUCCESS: Created appraisal with ID: {appraisal.appraisal_id}")
            return appraisal
            
        except IntegrityError as e:
            await db.rollback()
            error_msg = f"Failed to create appraisal due to database constraint violation"
            self.logger.error(f"{context}REPO_CREATE_INTEGRITY_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"constraint_error": str(e)})
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Unexpected error during appraisal creation"
            self.logger.error(f"{context}REPO_CREATE_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"original_error": str(e)})

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, appraisal_id: int, load_relationships: Optional[list] = None) -> Optional[Appraisal]:
        """Get appraisal by ID with optional relationship loading and comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_BY_ID: Getting appraisal - ID: {appraisal_id}, Load relationships: {bool(load_relationships)}")
        
        try:
            query = select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
            if load_relationships:
                for rel in load_relationships:
                    query = query.options(selectinload(rel))
                    
            result = await db.execute(query)
            appraisal = result.scalars().first()
            
            if appraisal:
                self.logger.debug(f"{context}REPO_GET_BY_ID_SUCCESS: Found appraisal - ID: {appraisal_id}, Status: {appraisal.status}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_ID_NOT_FOUND: Appraisal not found - ID: {appraisal_id}")
                
            return appraisal
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal by ID: {appraisal_id}"
            self.logger.error(f"{context}REPO_GET_BY_ID_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})

    @log_execution_time()
    async def get_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[list] = None
    ) -> List[Appraisal]:
        """Get appraisals with filters, pagination, and comprehensive logging."""
        context = build_log_context()
        
        filter_count = len(filters) if filters else 0
        self.logger.debug(f"{context}REPO_GET_WITH_FILTERS: Getting appraisals - Skip: {skip}, Limit: {limit}, Filters: {filter_count}")
        
        try:
            query = select(Appraisal).options(
                selectinload(Appraisal.appraisal_goals),
                selectinload(Appraisal.appraisal_type)
            )
            if filters:
                query = query.where(and_(*filters))
            query = query.order_by(Appraisal.created_at.desc()).offset(skip).limit(limit)
            
            result = await db.execute(query)
            appraisals = result.scalars().all()
            
            self.logger.info(f"{context}REPO_GET_WITH_FILTERS_SUCCESS: Retrieved {len(appraisals)} appraisals")
            return appraisals
            
        except Exception as e:
            error_msg = f"Error retrieving appraisals with filters"
            self.logger.error(f"{context}REPO_GET_WITH_FILTERS_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"skip": skip, "limit": limit, "filter_count": filter_count, "original_error": str(e)})

    @log_execution_time()
    async def add_goal_to_appraisal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> None:
        """Add a goal to an appraisal with duplicate checking and comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_ADD_GOAL: Adding goal to appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            existing = await db.execute(
                select(AppraisalGoal).where(
                    and_(
                        AppraisalGoal.appraisal_id == appraisal_id,
                        AppraisalGoal.goal_id == goal_id
                    )
                )
            )
            
            if existing.scalars().first():
                self.logger.debug(f"{context}REPO_ADD_GOAL_DUPLICATE: Goal already exists in appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
                return
                
            db.add(AppraisalGoal(appraisal_id=appraisal_id, goal_id=goal_id))
            await db.flush()
            
            self.logger.info(f"{context}REPO_ADD_GOAL_SUCCESS: Added goal to appraisal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
            
        except IntegrityError as e:
            await db.rollback()
            error_msg = f"Failed to add goal to appraisal due to constraint violation"
            self.logger.error(f"{context}REPO_ADD_GOAL_INTEGRITY_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_id": goal_id, "constraint_error": str(e)})
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Unexpected error adding goal to appraisal"
            self.logger.error(f"{context}REPO_ADD_GOAL_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_id": goal_id, "original_error": str(e)})

    @log_execution_time()
    async def add_multiple_goals_to_appraisal(self, db: AsyncSession, appraisal_id: int, goal_ids: List[int]) -> int:
        """
        Batch add multiple goals to an appraisal with comprehensive logging.
        
        Args:
            db: Database session
            appraisal_id: Appraisal ID
            goal_ids: List of goal IDs to add
            
        Returns:
            int: Number of goals actually added (excluding duplicates)
            
        Raises:
            RepositoryException: If operation fails
        """
        context = build_log_context()
        
        self.logger.info(f"{context}REPO_ADD_MULTIPLE_GOALS: Adding {len(goal_ids)} goals to appraisal - Appraisal ID: {appraisal_id}, Goal IDs: {goal_ids}")
        
        try:
            # Check for existing goals to avoid duplicates
            existing_result = await db.execute(
                select(AppraisalGoal.goal_id).where(
                    and_(
                        AppraisalGoal.appraisal_id == appraisal_id,
                        AppraisalGoal.goal_id.in_(goal_ids)
                    )
                )
            )
            existing_goal_ids = set(existing_result.scalars().all())
            
            # Filter out existing goals
            new_goal_ids = [goal_id for goal_id in goal_ids if goal_id not in existing_goal_ids]
            
            if existing_goal_ids:
                self.logger.debug(f"{context}REPO_ADD_MULTIPLE_GOALS_DUPLICATES: Found {len(existing_goal_ids)} existing goals - Appraisal ID: {appraisal_id}, Existing: {list(existing_goal_ids)}")
            
            # Batch create new AppraisalGoal records
            if new_goal_ids:
                new_appraisal_goals = [
                    AppraisalGoal(appraisal_id=appraisal_id, goal_id=goal_id)
                    for goal_id in new_goal_ids
                ]
                
                db.add_all(new_appraisal_goals)
                await db.flush()
                
                self.logger.info(f"{context}REPO_ADD_MULTIPLE_GOALS_SUCCESS: Added {len(new_goal_ids)} new goals to appraisal - Appraisal ID: {appraisal_id}, New goals: {new_goal_ids}")
            else:
                self.logger.debug(f"{context}REPO_ADD_MULTIPLE_GOALS_NO_NEW: All goals already exist - Appraisal ID: {appraisal_id}")
            
            return len(new_goal_ids)
            
        except IntegrityError as e:
            await db.rollback()
            error_msg = f"Failed to add multiple goals to appraisal due to constraint violation"
            self.logger.error(f"{context}REPO_ADD_MULTIPLE_GOALS_INTEGRITY_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal IDs: {goal_ids}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_ids": goal_ids, "constraint_error": str(e)})
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Unexpected error adding multiple goals to appraisal"
            self.logger.error(f"{context}REPO_ADD_MULTIPLE_GOALS_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal IDs: {goal_ids}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_ids": goal_ids, "original_error": str(e)})

    @log_execution_time()
    async def get_weightage_and_count(self, db: AsyncSession, appraisal_id: int) -> tuple[int, int]:
        """Get total weightage and goal count for an appraisal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_WEIGHTAGE_COUNT: Getting weightage and count - Appraisal ID: {appraisal_id}")
        
        try:
            total_res = await db.execute(
                select(func.coalesce(func.sum(Goal.goal_weightage), 0))
                .select_from(AppraisalGoal)
                .join(Goal, AppraisalGoal.goal_id == Goal.goal_id)
                .where(AppraisalGoal.appraisal_id == appraisal_id)
            )
            total_weightage = total_res.scalar() or 0

            count_res = await db.execute(
                select(func.count(AppraisalGoal.id)).where(AppraisalGoal.appraisal_id == appraisal_id)
            )
            goal_count = count_res.scalar() or 0

            self.logger.debug(f"{context}REPO_GET_WEIGHTAGE_COUNT_SUCCESS: Appraisal ID: {appraisal_id}, Total weightage: {total_weightage}, Goal count: {goal_count}")
            return total_weightage, goal_count
            
        except Exception as e:
            error_msg = f"Error retrieving weightage and count for appraisal"
            self.logger.error(f"{context}REPO_GET_WEIGHTAGE_COUNT_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})

    @log_execution_time()
    async def get_with_goals_and_relationships(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]:
        """Get an appraisal with all its goals and nested relationships loaded with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_WITH_GOALS: Getting appraisal with relationships - ID: {appraisal_id}")
        
        try:
            query = (
                select(Appraisal)
                .where(Appraisal.appraisal_id == appraisal_id)
                .options(
                    selectinload(Appraisal.appraisal_goals)
                    .selectinload(AppraisalGoal.goal)
                    .selectinload(Goal.categories),
                    selectinload(Appraisal.appraisal_type)
                )
            )
            
            result = await db.execute(query)
            appraisal = result.scalars().first()
            
            if appraisal:
                goal_count = len(appraisal.appraisal_goals) if appraisal.appraisal_goals else 0
                self.logger.debug(f"{context}REPO_GET_WITH_GOALS_SUCCESS: Found appraisal with {goal_count} goals - ID: {appraisal_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_WITH_GOALS_NOT_FOUND: Appraisal not found - ID: {appraisal_id}")
                
            return appraisal
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal with goals and relationships"
            self.logger.error(f"{context}REPO_GET_WITH_GOALS_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})

    @log_execution_time()
    async def update_appraisal_goal_self_assessment(
        self, 
        db: AsyncSession, 
        appraisal_goal: AppraisalGoal, 
        self_comment: Optional[str] = None, 
        self_rating: Optional[int] = None
    ) -> None:
        """Update self assessment fields for an appraisal goal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_UPDATE_SELF_ASSESSMENT: Updating goal self assessment - Goal ID: {appraisal_goal.goal_id}, Has comment: {self_comment is not None}, Rating: {self_rating}")
        
        try:
            if self_comment is not None:
                appraisal_goal.self_comment = self_comment
            if self_rating is not None:
                appraisal_goal.self_rating = self_rating
            await db.flush()
            
            self.logger.info(f"{context}REPO_UPDATE_SELF_ASSESSMENT_SUCCESS: Updated self assessment - Goal ID: {appraisal_goal.goal_id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating appraisal goal self assessment"
            self.logger.error(f"{context}REPO_UPDATE_SELF_ASSESSMENT_ERROR: {error_msg} - Goal ID: {appraisal_goal.goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"goal_id": appraisal_goal.goal_id, "original_error": str(e)})

    @log_execution_time()
    async def update_appraisal_goal_appraiser_evaluation(
        self, 
        db: AsyncSession, 
        appraisal_goal: AppraisalGoal, 
        appraiser_comment: Optional[str] = None, 
        appraiser_rating: Optional[int] = None
    ) -> None:
        """Update appraiser evaluation fields for an appraisal goal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_UPDATE_APPRAISER_EVAL: Updating appraiser evaluation - Goal ID: {appraisal_goal.goal_id}, Has comment: {appraiser_comment is not None}, Rating: {appraiser_rating}")
        
        try:
            if appraiser_comment is not None:
                appraisal_goal.appraiser_comment = appraiser_comment
            if appraiser_rating is not None:
                appraisal_goal.appraiser_rating = appraiser_rating
            await db.flush()
            
            self.logger.info(f"{context}REPO_UPDATE_APPRAISER_EVAL_SUCCESS: Updated appraiser evaluation - Goal ID: {appraisal_goal.goal_id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating appraisal goal appraiser evaluation"
            self.logger.error(f"{context}REPO_UPDATE_APPRAISER_EVAL_ERROR: {error_msg} - Goal ID: {appraisal_goal.goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"goal_id": appraisal_goal.goal_id, "original_error": str(e)})

    @log_execution_time()
    async def update_appraisal_status(self, db: AsyncSession, appraisal: Appraisal, new_status: AppraisalStatus) -> None:
        """Update appraisal status with comprehensive logging."""
        context = build_log_context()
        
        old_status = appraisal.status
        self.logger.info(f"{context}REPO_UPDATE_STATUS: Updating appraisal status - ID: {appraisal.appraisal_id}, From: {old_status}, To: {new_status}")
        
        try:
            appraisal.status = new_status
            await db.flush()
            
            self.logger.info(f"{context}REPO_UPDATE_STATUS_SUCCESS: Updated appraisal status - ID: {appraisal.appraisal_id}, Status: {new_status}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating appraisal status"
            self.logger.error(f"{context}REPO_UPDATE_STATUS_ERROR: {error_msg} - ID: {appraisal.appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal.appraisal_id, "new_status": new_status, "original_error": str(e)})

    @log_execution_time()
    async def update_overall_appraiser_evaluation(
        self, 
        db: AsyncSession, 
        appraisal: Appraisal, 
        overall_comments: Optional[str] = None, 
        overall_rating: Optional[int] = None
    ) -> None:
        """Update overall appraiser evaluation with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_UPDATE_OVERALL_APPRAISER: Updating overall appraiser evaluation - Appraisal ID: {appraisal.appraisal_id}, Has comments: {overall_comments is not None}, Rating: {overall_rating}")
        
        try:
            if overall_comments is not None:
                appraisal.appraiser_overall_comments = overall_comments
            if overall_rating is not None:
                appraisal.appraiser_overall_rating = overall_rating
            await db.flush()
            
            self.logger.info(f"{context}REPO_UPDATE_OVERALL_APPRAISER_SUCCESS: Updated overall appraiser evaluation - Appraisal ID: {appraisal.appraisal_id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating overall appraiser evaluation"
            self.logger.error(f"{context}REPO_UPDATE_OVERALL_APPRAISER_ERROR: {error_msg} - Appraisal ID: {appraisal.appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal.appraisal_id, "original_error": str(e)})

    @log_execution_time()
    async def update_overall_reviewer_evaluation(
        self, 
        db: AsyncSession, 
        appraisal: Appraisal, 
        overall_comments: Optional[str] = None, 
        overall_rating: Optional[int] = None
    ) -> None:
        """Update overall reviewer evaluation with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_UPDATE_OVERALL_REVIEWER: Updating overall reviewer evaluation - Appraisal ID: {appraisal.appraisal_id}, Has comments: {overall_comments is not None}, Rating: {overall_rating}")
        
        try:
            if overall_comments is not None:
                appraisal.reviewer_overall_comments = overall_comments
            if overall_rating is not None:
                appraisal.reviewer_overall_rating = overall_rating
            await db.flush()
            
            self.logger.info(f"{context}REPO_UPDATE_OVERALL_REVIEWER_SUCCESS: Updated overall reviewer evaluation - Appraisal ID: {appraisal.appraisal_id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error updating overall reviewer evaluation"
            self.logger.error(f"{context}REPO_UPDATE_OVERALL_REVIEWER_ERROR: {error_msg} - Appraisal ID: {appraisal.appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal.appraisal_id, "original_error": str(e)})

    @log_execution_time()
    async def get_employee_by_id(self, db: AsyncSession, emp_id: int) -> Optional[Employee]:
        """Get employee by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_EMPLOYEE: Getting employee - ID: {emp_id}")
        
        try:
            result = await db.execute(select(Employee).where(Employee.emp_id == emp_id))
            employee = result.scalars().first()
            
            if employee:
                self.logger.debug(f"{context}REPO_GET_EMPLOYEE_SUCCESS: Found employee - ID: {emp_id}, Name: {sanitize_log_data(employee.emp_name)}")
            else:
                self.logger.debug(f"{context}REPO_GET_EMPLOYEE_NOT_FOUND: Employee not found - ID: {emp_id}")
                
            return employee
            
        except Exception as e:
            error_msg = f"Error retrieving employee by ID: {emp_id}"
            self.logger.error(f"{context}REPO_GET_EMPLOYEE_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"emp_id": emp_id, "original_error": str(e)})

    @log_execution_time()
    async def get_appraisal_type_by_id(self, db: AsyncSession, type_id: int) -> Optional[AppraisalType]:
        """Get appraisal type by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_APPRAISAL_TYPE: Getting appraisal type - ID: {type_id}")
        
        try:
            result = await db.execute(select(AppraisalType).where(AppraisalType.id == type_id))
            appraisal_type = result.scalars().first()
            
            if appraisal_type:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_TYPE_SUCCESS: Found appraisal type - ID: {type_id}, Name: {sanitize_log_data(appraisal_type.name)}")
            else:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_TYPE_NOT_FOUND: Appraisal type not found - ID: {type_id}")
                
            return appraisal_type
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal type by ID: {type_id}"
            self.logger.error(f"{context}REPO_GET_APPRAISAL_TYPE_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"type_id": type_id, "original_error": str(e)})

    @log_execution_time()
    async def get_appraisal_range_by_id(self, db: AsyncSession, range_id: int) -> Optional[AppraisalRange]:
        """Get appraisal range by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_APPRAISAL_RANGE: Getting appraisal range - ID: {range_id}")
        
        try:
            result = await db.execute(select(AppraisalRange).where(AppraisalRange.id == range_id))
            appraisal_range = result.scalars().first()
            
            if appraisal_range:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_RANGE_SUCCESS: Found appraisal range - ID: {range_id}, Name: {sanitize_log_data(appraisal_range.name)}")
            else:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_RANGE_NOT_FOUND: Appraisal range not found - ID: {range_id}")
                
            return appraisal_range
            
        except Exception as e:
            error_msg = f"Error retrieving appraisal range by ID: {range_id}"
            self.logger.error(f"{context}REPO_GET_APPRAISAL_RANGE_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"range_id": range_id, "original_error": str(e)})

    @log_execution_time()
    async def get_goal_by_id(self, db: AsyncSession, goal_id: int) -> Optional[Goal]:
        """Get goal by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_GOAL: Getting goal - ID: {goal_id}")
        
        try:
            result = await db.execute(select(Goal).where(Goal.goal_id == goal_id))
            goal = result.scalars().first()
            
            if goal:
                self.logger.debug(f"{context}REPO_GET_GOAL_SUCCESS: Found goal - ID: {goal_id}, Title: {sanitize_log_data(goal.goal_title)}")
            else:
                self.logger.debug(f"{context}REPO_GET_GOAL_NOT_FOUND: Goal not found - ID: {goal_id}")
                
            return goal
            
        except Exception as e:
            error_msg = f"Error retrieving goal by ID: {goal_id}"
            self.logger.error(f"{context}REPO_GET_GOAL_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"goal_id": goal_id, "original_error": str(e)})

    @log_execution_time()
    async def get_goals_by_ids(self, db: AsyncSession, goal_ids: List[int]) -> List[Goal]:
        """Get multiple goals by their IDs with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_GOALS_BY_IDS: Getting goals - Count: {len(goal_ids)}, IDs: {goal_ids[:5]}{'...' if len(goal_ids) > 5 else ''}")
        
        try:
            result = await db.execute(select(Goal).where(Goal.goal_id.in_(goal_ids)))
            goals = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_GET_GOALS_BY_IDS_SUCCESS: Retrieved {len(goals)} goals out of {len(goal_ids)} requested")
            return goals
            
        except Exception as e:
            error_msg = f"Error retrieving goals by IDs"
            self.logger.error(f"{context}REPO_GET_GOALS_BY_IDS_ERROR: {error_msg} - Count: {len(goal_ids)}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"goal_count": len(goal_ids), "goal_ids": goal_ids, "original_error": str(e)})

    @log_execution_time()
    async def find_appraisal_goal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        """Find an appraisal goal by appraisal and goal IDs with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_FIND_APPRAISAL_GOAL: Finding appraisal goal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            result = await db.execute(
                select(AppraisalGoal).where(
                    and_(
                        AppraisalGoal.appraisal_id == appraisal_id,
                        AppraisalGoal.goal_id == goal_id
                    )
                )
            )
            appraisal_goal = result.scalars().first()
            
            if appraisal_goal:
                self.logger.debug(f"{context}REPO_FIND_APPRAISAL_GOAL_SUCCESS: Found appraisal goal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
            else:
                self.logger.debug(f"{context}REPO_FIND_APPRAISAL_GOAL_NOT_FOUND: Appraisal goal not found - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
                
            return appraisal_goal
            
        except Exception as e:
            error_msg = f"Error finding appraisal goal"
            self.logger.error(f"{context}REPO_FIND_APPRAISAL_GOAL_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_id": goal_id, "original_error": str(e)})
    
    @log_execution_time()
    async def get_existing_appraisal_goal(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        """Get existing appraisal goal by appraisal and goal IDs with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_EXISTING_APPRAISAL_GOAL: Fetching existing appraisal goal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            result = await db.execute(
                select(AppraisalGoal).where(
                    and_(
                        AppraisalGoal.appraisal_id == appraisal_id,
                        AppraisalGoal.goal_id == goal_id
                    )
                )
            )
            appraisal_goal = result.scalars().first()
            
            if appraisal_goal:
                self.logger.debug(f"{context}REPO_GET_EXISTING_APPRAISAL_GOAL_SUCCESS: Found existing appraisal goal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_EXISTING_APPRAISAL_GOAL_NOT_FOUND: Existing appraisal goal not found - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
                
            return appraisal_goal
            
        except Exception as e:
            error_msg = f"Error getting existing appraisal goal"
            self.logger.error(f"{context}REPO_GET_EXISTING_APPRAISAL_GOAL_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_id": goal_id, "original_error": str(e)})

    @log_execution_time()
    async def add_appraisal_goal(self, db: AsyncSession, appraisal_goal: AppraisalGoal) -> None:
        """Add appraisal goal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_ADD_APPRAISAL_GOAL: Adding appraisal goal - Appraisal ID: {appraisal_goal.appraisal_id}, Goal ID: {appraisal_goal.goal_id}")
        
        try:
            db.add(appraisal_goal)
            await db.flush()
            # Persist the new appraisal_goal and commit the transaction
            await db.commit()
            # Refresh to ensure the object has up-to-date attributes (ids, defaults)
            await db.refresh(appraisal_goal)
            
            self.logger.info(f"{context}REPO_ADD_APPRAISAL_GOAL_SUCCESS: Added appraisal goal - Appraisal ID: {appraisal_goal.appraisal_id}, Goal ID: {appraisal_goal.goal_id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error adding appraisal goal"
            self.logger.error(f"{context}REPO_ADD_APPRAISAL_GOAL_ERROR: {error_msg} - Appraisal ID: {appraisal_goal.appraisal_id}, Goal ID: {appraisal_goal.goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_goal.appraisal_id, "goal_id": appraisal_goal.goal_id, "original_error": str(e)})


    @log_execution_time()
    async def update_appraisal_goal(self, db: AsyncSession, appraisal_id: int) -> AppraisalGoal:
        """Update appraisal goal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_UPDATE_APPRAISAL_GOAL: Updating appraisal goal - Appraisal ID: {appraisal_id}")
        
        try:
            query = select(Appraisal).where(Appraisal.appraisal_id == appraisal_id)
            query = query.options(
                selectinload(Appraisal.appraisal_goals)
                .selectinload(AppraisalGoal.goal)
                .selectinload(Goal.categories)
            )
            result = await db.execute(query)
            appraisal = result.scalars().first()
            
            if appraisal:
                self.logger.info(f"{context}REPO_UPDATE_APPRAISAL_GOAL_SUCCESS: Updated appraisal goal - Appraisal ID: {appraisal_id}")
            else:
                self.logger.debug(f"{context}REPO_UPDATE_APPRAISAL_GOAL_NOT_FOUND: Appraisal not found - Appraisal ID: {appraisal_id}")
                
            return appraisal
            
        except Exception as e:
            error_msg = f"Error updating appraisal goal"
            self.logger.error(f"{context}REPO_UPDATE_APPRAISAL_GOAL_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})
    
    @log_execution_time()
    async def get_appraisal_goal_by_id(self, db: AsyncSession, appraisal_id: int, goal_id: int) -> Optional[AppraisalGoal]:
        """Get appraisal goal by appraisal ID and goal ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_APPRAISAL_GOAL_BY_ID: Getting appraisal goal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
        
        try:
            result = await db.execute(
                select(AppraisalGoal).where(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
            appraisal_goal = result.scalars().first()
            
            if appraisal_goal:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_GOAL_BY_ID_SUCCESS: Found appraisal goal - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_GOAL_BY_ID_NOT_FOUND: Appraisal goal not found - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}")
                
            return appraisal_goal
            
        except Exception as e:
            error_msg = f"Error getting appraisal goal by ID"
            self.logger.error(f"{context}REPO_GET_APPRAISAL_GOAL_BY_ID_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Goal ID: {goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "goal_id": goal_id, "original_error": str(e)})

    @log_execution_time()
    async def remove_appraisal_goal(self, db: AsyncSession, appraisal_goal: AppraisalGoal) -> None:
        """Remove appraisal goal with comprehensive logging."""
        context = build_log_context()
        
        # Capture identifying fields before delete since the instance will be
        # detached/expired after deletion and attribute access may raise.
        try:
            aid = appraisal_goal.appraisal_id
            gid = appraisal_goal.goal_id
        except Exception:
            aid = None
            gid = None

        self.logger.debug(f"{context}REPO_REMOVE_APPRAISAL_GOAL: Removing appraisal goal - Appraisal ID: {aid}, Goal ID: {gid}")

        try:
            self.logger.debug(f"{context}REPO_REMOVE_APPRAISAL_GOAL_DELETE: Deleting appraisal goal")
            await db.delete(appraisal_goal)
            
            self.logger.debug(f"{context}REPO_REMOVE_APPRAISAL_GOAL_FLUSH: Flushing database changes")
            await db.flush()  # Refresh from DB after deletion
            
            self.logger.debug(f"{context}REPO_REMOVE_APPRAISAL_GOAL_COMMIT: Committing delete")
            await db.commit()

            # Expire the session identity map so any cached Appraisal/AppraisalGoal
            # instances will be reloaded from the DB on next access. Use run_sync
            # to call the synchronous Session.expire_all on the underlying sync
            # Session safely from AsyncSession.
            try:
                self.logger.debug(f"{context}REPO_REMOVE_APPRAISAL_GOAL_EXPIRE: Expiring session identity map")
                await db.run_sync(lambda sync_session: sync_session.expire_all())
            except Exception as e: 
                from app.exceptions.custom_exceptions import InternalServerError
                error_msg = f"Failed to expire session after deleting appraisal goal: {e}"
                self.logger.error(f"{context}REPO_REMOVE_APPRAISAL_GOAL_EXPIRE_ERROR: {error_msg}")
                raise InternalServerError(error_msg)

            # Log the deletion using the captured identifiers
            self.logger.info(f"{context}REPO_REMOVE_APPRAISAL_GOAL_SUCCESS: Deleted appraisal goal - Appraisal ID: {aid}, Goal ID: {gid}")
            
        except InternalServerError:
            raise
        except Exception as exc:
            await db.rollback()
            error_msg = f"Error removing appraisal goal"
            self.logger.error(f"{context}REPO_REMOVE_APPRAISAL_GOAL_ERROR: {error_msg} - Appraisal ID: {aid}, Goal ID: {gid}, Error: {str(exc)}")
            raise RepositoryException(error_msg, details={"appraisal_id": aid, "goal_id": gid, "original_error": str(exc)})


    @log_execution_time()
    async def get_appraisal_by_id(self, db: AsyncSession, appraisal_id: int) -> Optional[Appraisal]:
        """Get appraisal by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_APPRAISAL_BY_ID: Getting appraisal - ID: {appraisal_id}")
        
        try:
            result = await db.execute(select(Appraisal).where(Appraisal.appraisal_id == appraisal_id))
            appraisal = result.scalars().first()
            
            if appraisal:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_BY_ID_SUCCESS: Found appraisal - ID: {appraisal_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_BY_ID_NOT_FOUND: Appraisal not found - ID: {appraisal_id}")
                
            return appraisal
            
        except Exception as e:
            error_msg = f"Error getting appraisal by ID"
            self.logger.error(f"{context}REPO_GET_APPRAISAL_BY_ID_ERROR: {error_msg} - ID: {appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})

    @log_execution_time()
    async def get_appraisal_goal(self, db: AsyncSession, goal_id: int) -> Optional[AppraisalGoal]:
        """Get appraisal goal by goal ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_APPRAISAL_GOAL: Getting appraisal goal - Goal ID: {goal_id}")
        
        try:
            result = await db.execute(select(AppraisalGoal).where(AppraisalGoal.goal_id == goal_id))
            appraisal_goal = result.scalars().first()
            
            if appraisal_goal:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_GOAL_SUCCESS: Found appraisal goal - Goal ID: {goal_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_APPRAISAL_GOAL_NOT_FOUND: Appraisal goal not found - Goal ID: {goal_id}")
                
            return appraisal_goal
            
        except Exception as e:
            error_msg = f"Error getting appraisal goal"
            self.logger.error(f"{context}REPO_GET_APPRAISAL_GOAL_ERROR: {error_msg} - Goal ID: {goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"goal_id": goal_id, "original_error": str(e)})
    

    @log_execution_time()
    async def calculate_total_weightage(self, db: AsyncSession, appraisal_id: int) -> int:
        """Calculate total weightage for appraisal goals with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_CALCULATE_TOTAL_WEIGHTAGE: Calculating total weightage - Appraisal ID: {appraisal_id}")
        
        try:
            result = await db.execute(
                select(func.sum(Goal.goal_weightage)).select_from(
                    AppraisalGoal.__table__.join(Goal.__table__)
                ).where(AppraisalGoal.appraisal_id == appraisal_id)
            )
            total_weightage = result.scalar() or 0
            
            self.logger.info(f"{context}REPO_CALCULATE_TOTAL_WEIGHTAGE_SUCCESS: Calculated total weightage - Appraisal ID: {appraisal_id}, Total: {total_weightage}")
            return total_weightage
            
        except Exception as e:
            error_msg = f"Error calculating total weightage"
            self.logger.error(f"{context}REPO_CALCULATE_TOTAL_WEIGHTAGE_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})
    
    @log_execution_time()
    async def load_appraisal(self, db: AsyncSession, db_appraisal: Appraisal) -> Appraisal:
        """Reload an appraisal with all its goals and nested relationships loaded with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_LOAD_APPRAISAL: Loading appraisal with relationships - Appraisal ID: {db_appraisal.appraisal_id}")
        
        try:
            query = (
                select(Appraisal)
                .options(
                    selectinload(Appraisal.appraisal_goals)
                    .selectinload(AppraisalGoal.goal)
                    .selectinload(Goal.categories)
                )
                .where(Appraisal.appraisal_id == db_appraisal.appraisal_id)
            )
            
            result = await db.execute(query)
            loaded_appraisal = result.scalars().first()
            
            if loaded_appraisal:
                self.logger.info(f"{context}REPO_LOAD_APPRAISAL_SUCCESS: Loaded appraisal with relationships - Appraisal ID: {db_appraisal.appraisal_id}")
            else:
                self.logger.debug(f"{context}REPO_LOAD_APPRAISAL_NOT_FOUND: Appraisal not found - Appraisal ID: {db_appraisal.appraisal_id}")
                
            return loaded_appraisal
            
        except Exception as e:
            error_msg = f"Error loading appraisal with relationships"
            self.logger.error(f"{context}REPO_LOAD_APPRAISAL_ERROR: {error_msg} - Appraisal ID: {db_appraisal.appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": db_appraisal.appraisal_id, "original_error": str(e)})
    
    @log_execution_time()
    async def delete_goal(self, db: AsyncSession, goal: Goal) -> None:
        """Delete goal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_DELETE_GOAL: Deleting goal - Goal ID: {goal.goal_id}")
        
        try:
            await db.delete(goal)
            await db.commit()
            self.logger.info(f"{context}REPO_DELETE_GOAL_SUCCESS: Deleted goal - Goal ID: {goal.goal_id}")
            
        except Exception as e:
            await db.rollback()
            error_msg = f"Error deleting goal"
            self.logger.error(f"{context}REPO_DELETE_GOAL_ERROR: {error_msg} - Goal ID: {goal.goal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"goal_id": goal.goal_id, "original_error": str(e)})

    @log_execution_time()
    async def get_individual_goal_weightages(self, db: AsyncSession, appraisal_id: int) -> List[Any]:
        """Get individual goal weightages for appraisal with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_INDIVIDUAL_GOAL_WEIGHTAGES: Getting individual goal weightages - Appraisal ID: {appraisal_id}")
        
        try:
            query = (
                select(Goal.goal_id, Goal.goal_title, Goal.goal_weightage).select_from(
                    AppraisalGoal.__table__.join(Goal.__table__)
                ).where(AppraisalGoal.appraisal_id == appraisal_id)
            )

            result = await db.execute(query)
            weightages = result.fetchall()
            
            self.logger.info(f"{context}REPO_GET_INDIVIDUAL_GOAL_WEIGHTAGES_SUCCESS: Retrieved individual goal weightages - Appraisal ID: {appraisal_id}, Count: {len(weightages)}")
            return weightages
            
        except Exception as e:
            error_msg = f"Error getting individual goal weightages"
            self.logger.error(f"{context}REPO_GET_INDIVIDUAL_GOAL_WEIGHTAGES_ERROR: {error_msg} - Appraisal ID: {appraisal_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"appraisal_id": appraisal_id, "original_error": str(e)})
    