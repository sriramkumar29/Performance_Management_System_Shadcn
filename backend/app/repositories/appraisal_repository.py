"""
Appraisal repository for the Performance Management System.

This module provides data access operations for appraisal entities
with specific business logic for performance appraisal management.
"""

from typing import List, Optional, Dict, Any
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import and_, or_, func, extract

from app.models.appraisal import Appraisal, AppraisalStatus
from app.schemas.appraisal import AppraisalCreate, AppraisalUpdate
from app.repositories.base_repository import BaseRepository


class AppraisalRepository(BaseRepository[Appraisal, AppraisalCreate, AppraisalUpdate]):
    """Repository for appraisal data access operations."""
    
    def __init__(self):
        super().__init__(Appraisal)
    
    @property
    def entity_name(self) -> str:
        return "Appraisal"
    
    @property
    def id_field(self) -> str:
        return "appraisal_id"
    
    def _add_relationship_loading(self, query):
        """Add appraisal relationship loading."""
        return query.options(
            selectinload(Appraisal.appraisee),
            selectinload(Appraisal.appraiser),
            selectinload(Appraisal.reviewer),
            selectinload(Appraisal.appraisal_type),
            selectinload(Appraisal.appraisal_range),
            selectinload(Appraisal.appraisal_goals)
        )
    
    async def get_by_appraisee(
        self,
        db: AsyncSession,
        appraisee_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get appraisals by appraisee ID.
        
        Args:
            db: Database session
            appraisee_id: Appraisee employee ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"appraisee_id": appraisee_id},
            load_relationships=load_relationships
        )
    
    async def get_by_appraiser(
        self,
        db: AsyncSession,
        appraiser_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get appraisals by appraiser ID.
        
        Args:
            db: Database session
            appraiser_id: Appraiser employee ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"appraiser_id": appraiser_id},
            load_relationships=load_relationships
        )
    
    async def get_by_reviewer(
        self,
        db: AsyncSession,
        reviewer_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get appraisals by reviewer ID.
        
        Args:
            db: Database session
            reviewer_id: Reviewer employee ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"reviewer_id": reviewer_id},
            load_relationships=load_relationships
        )
    
    async def get_by_status(
        self,
        db: AsyncSession,
        status: AppraisalStatus,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get appraisals by status.
        
        Args:
            db: Database session
            status: Appraisal status
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"status": status},
            load_relationships=load_relationships
        )
    
    async def get_by_date_range(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get appraisals within date range.
        
        Args:
            db: Database session
            start_date: Start date for filtering
            end_date: End date for filtering
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        query = select(Appraisal).where(
            and_(
                Appraisal.start_date >= start_date,
                Appraisal.end_date <= end_date
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_pending_appraisals(
        self,
        db: AsyncSession,
        employee_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get pending appraisals for an employee (as appraiser or reviewer).
        
        Args:
            db: Database session
            employee_id: Employee ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of pending appraisals
        """
        pending_statuses = [
            AppraisalStatus.SUBMITTED,
            AppraisalStatus.APPRAISEE_SELF_ASSESSMENT,
            AppraisalStatus.APPRAISER_EVALUATION,
            AppraisalStatus.REVIEWER_EVALUATION
        ]
        
        query = select(Appraisal).where(
            and_(
                or_(
                    Appraisal.appraiser_id == employee_id,
                    Appraisal.reviewer_id == employee_id
                ),
                Appraisal.status.in_(pending_statuses)
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_employee_appraisals_by_year(
        self,
        db: AsyncSession,
        employee_id: int,
        year: int,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get all appraisals for an employee in a specific year.
        
        Args:
            db: Database session
            employee_id: Employee ID
            year: Year to filter by
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        query = select(Appraisal).where(
            and_(
                Appraisal.appraisee_id == employee_id,
                extract('year', Appraisal.start_date) == year
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_overdue_appraisals(
        self,
        db: AsyncSession,
        current_date: date,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get overdue appraisals.
        
        Args:
            db: Database session
            current_date: Current date for comparison
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of overdue appraisals
        """
        incomplete_statuses = [
            AppraisalStatus.DRAFT,
            AppraisalStatus.SUBMITTED,
            AppraisalStatus.APPRAISEE_SELF_ASSESSMENT,
            AppraisalStatus.APPRAISER_EVALUATION,
            AppraisalStatus.REVIEWER_EVALUATION
        ]
        
        query = select(Appraisal).where(
            and_(
                Appraisal.end_date < current_date,
                Appraisal.status.in_(incomplete_statuses)
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_appraisals_by_type(
        self,
        db: AsyncSession,
        appraisal_type_id: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Appraisal]:
        """
        Get appraisals by type.
        
        Args:
            db: Database session
            appraisal_type_id: Appraisal type ID
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of appraisals
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"appraisal_type_id": appraisal_type_id},
            load_relationships=load_relationships
        )
    
    async def get_statistics_by_status(
        self,
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, int]:
        """
        Get appraisal statistics grouped by status.
        
        Args:
            db: Database session
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            Dictionary with status counts
        """
        query = select(
            Appraisal.status,
            func.count(Appraisal.appraisal_id).label('count')
        )
        
        if start_date:
            query = query.where(Appraisal.start_date >= start_date)
        
        if end_date:
            query = query.where(Appraisal.end_date <= end_date)
        
        query = query.group_by(Appraisal.status)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        return {row.status.value: row.count for row in rows}
    
    async def exists_for_employee_in_period(
        self,
        db: AsyncSession,
        appraisee_id: int,
        start_date: date,
        end_date: date,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if an appraisal exists for employee in given period.
        
        Args:
            db: Database session
            appraisee_id: Employee ID
            start_date: Period start date
            end_date: Period end date
            exclude_id: Appraisal ID to exclude from check
            
        Returns:
            True if appraisal exists in period
        """
        query = select(func.count()).select_from(Appraisal).where(
            and_(
                Appraisal.appraisee_id == appraisee_id,
                or_(
                    # Check for overlapping periods
                    and_(
                        Appraisal.start_date <= start_date,
                        Appraisal.end_date >= start_date
                    ),
                    and_(
                        Appraisal.start_date <= end_date,
                        Appraisal.end_date >= end_date
                    ),
                    and_(
                        Appraisal.start_date >= start_date,
                        Appraisal.end_date <= end_date
                    )
                )
            )
        )
        
        if exclude_id:
            query = query.where(Appraisal.appraisal_id != exclude_id)
        
        result = await db.execute(query)
        return result.scalar() > 0