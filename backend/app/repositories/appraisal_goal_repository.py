"""
Appraisal Goal repository for database operations.

This module handles all direct database interactions
for the AppraisalGoal entity with comprehensive logging
and error handling.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.goal import AppraisalGoal
from app.repositories.base_repository import BaseRepository
from app.utils.logger import get_logger, build_log_context, sanitize_log_data, log_execution_time
from app.exceptions.domain_exceptions import RepositoryException


class AppraisalGoalRepository(BaseRepository[AppraisalGoal]):
    """Repository for AppraisalGoal database operations with comprehensive logging."""

    def __init__(self):
        super().__init__(AppraisalGoal)
        self.logger = get_logger(f"app.repositories.{self.__class__.__name__}")
        self.logger.debug(f"{self.__class__.__name__} initialized successfully")

    @property
    def entity_name(self) -> str:
        return "Appraisal Goal"

    @property
    def id_field(self) -> str:
        return "id"

    @log_execution_time()
    async def get_by_appraisal_and_goal(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        goal_id: int
    ) -> Optional[AppraisalGoal]:
        """
        Get appraisal goal by appraisal ID and goal ID.
        
        Args:
            db: Database session
            appraisal_id: Appraisal ID
            goal_id: Goal ID
            
        Returns:
            AppraisalGoal if found, None otherwise
            
        Raises:
            RepositoryException: If database operation fails
        """
        context = build_log_context()
        
        try:
            self.logger.info(f"{context}REPOSITORY_REQUEST: Get AppraisalGoal by appraisal_id={appraisal_id}, goal_id={goal_id}")
            
            stmt = select(AppraisalGoal).where(
                and_(
                    AppraisalGoal.appraisal_id == appraisal_id,
                    AppraisalGoal.goal_id == goal_id
                )
            )
            
            result = await db.execute(stmt)
            appraisal_goal = result.scalar_one_or_none()
            
            if appraisal_goal:
                self.logger.info(f"{context}REPOSITORY_SUCCESS: Found AppraisalGoal with appraisal_id={appraisal_id}, goal_id={goal_id}")
            else:
                self.logger.info(f"{context}REPOSITORY_NOT_FOUND: No AppraisalGoal found with appraisal_id={appraisal_id}, goal_id={goal_id}")
            
            return appraisal_goal
            
        except Exception as e:
            error_msg = f"Failed to get AppraisalGoal by appraisal_id={appraisal_id}, goal_id={goal_id}"
            self.logger.error(f"{context}REPOSITORY_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"error": str(e)})

    @log_execution_time()
    async def get_by_appraisal_id(
        self, 
        db: AsyncSession, 
        appraisal_id: int
    ) -> List[AppraisalGoal]:
        """
        Get all appraisal goals by appraisal ID.
        
        Args:
            db: Database session
            appraisal_id: Appraisal ID
            
        Returns:
            List of AppraisalGoal entities
            
        Raises:
            RepositoryException: If database operation fails
        """
        context = build_log_context()
        
        try:
            self.logger.info(f"{context}REPOSITORY_REQUEST: Get all AppraisalGoals by appraisal_id={appraisal_id}")
            
            stmt = select(AppraisalGoal).where(AppraisalGoal.appraisal_id == appraisal_id)
            
            result = await db.execute(stmt)
            appraisal_goals = result.scalars().all()
            
            self.logger.info(f"{context}REPOSITORY_SUCCESS: Retrieved {len(appraisal_goals)} AppraisalGoals for appraisal_id={appraisal_id}")
            
            return list(appraisal_goals)
            
        except Exception as e:
            error_msg = f"Failed to get AppraisalGoals by appraisal_id={appraisal_id}"
            self.logger.error(f"{context}REPOSITORY_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"error": str(e)})

    @log_execution_time()
    async def delete_by_appraisal_and_goal(
        self, 
        db: AsyncSession, 
        appraisal_id: int, 
        goal_id: int
    ) -> bool:
        """
        Delete appraisal goal by appraisal ID and goal ID.
        
        Args:
            db: Database session
            appraisal_id: Appraisal ID
            goal_id: Goal ID
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            RepositoryException: If database operation fails
        """
        context = build_log_context()
        
        try:
            self.logger.info(f"{context}REPOSITORY_REQUEST: Delete AppraisalGoal by appraisal_id={appraisal_id}, goal_id={goal_id}")
            
            # First check if the record exists
            appraisal_goal = await self.get_by_appraisal_and_goal(db, appraisal_id, goal_id)
            
            if not appraisal_goal:
                self.logger.warning(f"{context}REPOSITORY_NOT_FOUND: No AppraisalGoal to delete with appraisal_id={appraisal_id}, goal_id={goal_id}")
                return False
            
            await db.delete(appraisal_goal)
            await db.flush()
            
            self.logger.info(f"{context}REPOSITORY_SUCCESS: Deleted AppraisalGoal with appraisal_id={appraisal_id}, goal_id={goal_id}")
            
            return True
            
        except Exception as e:
            error_msg = f"Failed to delete AppraisalGoal by appraisal_id={appraisal_id}, goal_id={goal_id}"
            self.logger.error(f"{context}REPOSITORY_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"error": str(e)})