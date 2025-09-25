"""
Employee repository for the Performance Management System.

This module provides data access operations for employee entities
with specific business logic for employee management.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import and_, or_, func

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.repositories.base_repository import BaseRepository


class EmployeeRepository(BaseRepository[Employee, EmployeeCreate, EmployeeUpdate]):
    """Repository for employee data access operations."""
    
    def __init__(self):
        super().__init__(Employee)
    
    @property
    def entity_name(self) -> str:
        return "Employee"
    
    @property
    def id_field(self) -> str:
        return "emp_id"
    
    def _add_relationship_loading(self, query):
        """Add employee relationship loading."""
        return query.options(
            selectinload(Employee.reporting_manager),
            selectinload(Employee.subordinates),
            selectinload(Employee.appraisals_as_appraisee),
            selectinload(Employee.appraisals_as_appraiser),
            selectinload(Employee.appraisals_as_reviewer)
        )
    
    async def get_by_email(
        self,
        db: AsyncSession,
        email: str,
        load_relationships: bool = False
    ) -> Optional[Employee]:
        """
        Get employee by email address.
        
        Args:
            db: Database session
            email: Employee email
            load_relationships: Whether to load relationships
            
        Returns:
            Employee instance or None
        """
        return await self.get_by_field(
            db=db,
            field_name="emp_email",
            field_value=email,
            load_relationships=load_relationships
        )
    
    async def get_by_department(
        self,
        db: AsyncSession,
        department: str,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get employees by department.
        
        Args:
            db: Database session
            department: Department name
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of employees
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"emp_department": department},
            load_relationships=load_relationships
        )
    
    async def get_by_role(
        self,
        db: AsyncSession,
        role: str,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get employees by role.
        
        Args:
            db: Database session
            role: Employee role
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of employees
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"emp_roles": role},
            load_relationships=load_relationships
        )
    
    async def get_by_role_level(
        self,
        db: AsyncSession,
        role_level: int,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get employees by role level.
        
        Args:
            db: Database session
            role_level: Employee role level
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of employees
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"emp_roles_level": role_level},
            load_relationships=load_relationships
        )
    
    async def get_subordinates(
        self,
        db: AsyncSession,
        manager_id: int,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get all subordinates of a manager.
        
        Args:
            db: Database session
            manager_id: Manager's employee ID
            load_relationships: Whether to load relationships
            
        Returns:
            List of subordinate employees
        """
        query = select(Employee).where(Employee.emp_reporting_manager_id == manager_id)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_team_hierarchy(
        self,
        db: AsyncSession,
        manager_id: int,
        max_depth: int = 3
    ) -> List[Employee]:
        """
        Get entire team hierarchy under a manager.
        
        Args:
            db: Database session
            manager_id: Manager's employee ID
            max_depth: Maximum depth to traverse
            
        Returns:
            List of all employees in hierarchy
        """
        all_employees = []
        current_level = [manager_id]
        
        for _ in range(max_depth):
            if not current_level:
                break
            
            # Get all employees reporting to current level managers
            query = select(Employee).where(
                Employee.emp_reporting_manager_id.in_(current_level)
            )
            result = await db.execute(query)
            level_employees = result.scalars().all()
            
            if not level_employees:
                break
            
            all_employees.extend(level_employees)
            current_level = [emp.emp_id for emp in level_employees]
        
        return all_employees
    
    async def get_active_employees(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get all active employees.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of active employees
        """
        return await self.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters={"emp_status": True},
            load_relationships=load_relationships
        )
    
    async def search_employees(
        self,
        db: AsyncSession,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Search employees by name or email.
        
        Args:
            db: Database session
            search_term: Search term for name or email
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of matching employees
        """
        query = select(Employee).where(
            or_(
                Employee.emp_name.ilike(f"%{search_term}%"),
                Employee.emp_email.ilike(f"%{search_term}%")
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def email_exists(
        self,
        db: AsyncSession,
        email: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if email already exists.
        
        Args:
            db: Database session
            email: Email to check
            exclude_id: Employee ID to exclude from check
            
        Returns:
            True if email exists, False otherwise
        """
        query = select(func.count()).select_from(Employee).where(
            Employee.emp_email == email
        )
        
        if exclude_id:
            query = query.where(Employee.emp_id != exclude_id)
        
        result = await db.execute(query)
        return result.scalar() > 0
    
    async def is_circular_reporting(
        self,
        db: AsyncSession,
        employee_id: int,
        manager_id: int
    ) -> bool:
        """
        Check if setting a manager would create circular reporting relationship.
        
        Args:
            db: Database session
            employee_id: Employee ID
            manager_id: Proposed manager ID
            
        Returns:
            True if circular relationship would be created
        """
        # If manager_id is None, no circular relationship
        if not manager_id:
            return False
        
        # If trying to set self as manager
        if employee_id == manager_id:
            return True
        
        # Check if manager_id is in the reporting chain of employee_id
        current_manager_id = manager_id
        max_depth = 10  # Prevent infinite loops
        
        for _ in range(max_depth):
            query = select(Employee.emp_reporting_manager_id).where(
                Employee.emp_id == current_manager_id
            )
            result = await db.execute(query)
            next_manager_id = result.scalar()
            
            if not next_manager_id:
                break
            
            if next_manager_id == employee_id:
                return True
            
            current_manager_id = next_manager_id
        
        return False
    
    async def get_employees_by_filters(
        self,
        db: AsyncSession,
        department: Optional[str] = None,
        role: Optional[str] = None,
        role_level: Optional[int] = None,
        status: Optional[bool] = None,
        manager_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get employees with multiple filters.
        
        Args:
            db: Database session
            department: Filter by department
            role: Filter by role
            role_level: Filter by role level
            status: Filter by status (active/inactive)
            manager_id: Filter by reporting manager
            skip: Number of records to skip
            limit: Maximum number of records
            load_relationships: Whether to load relationships
            
        Returns:
            List of filtered employees
        """
        query = select(Employee)
        
        if department:
            query = query.where(Employee.emp_department == department)
        
        if role:
            query = query.where(Employee.emp_roles == role)
        
        if role_level is not None:
            query = query.where(Employee.emp_roles_level == role_level)
        
        if status is not None:
            query = query.where(Employee.emp_status == status)
        
        if manager_id is not None:
            query = query.where(Employee.emp_reporting_manager_id == manager_id)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()