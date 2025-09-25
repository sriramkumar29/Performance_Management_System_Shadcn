"""
User/Auth repository for the Performance Management System.

This module provides data access operations for user authentication
and authorization using the Employee model.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_, func

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[Employee, EmployeeCreate, EmployeeUpdate]):
    """Repository for user authentication and authorization operations."""
    
    def __init__(self):
        super().__init__(Employee)
    
    @property
    def entity_name(self) -> str:
        return "User"
    
    @property
    def id_field(self) -> str:
        return "emp_id"
    
    def _add_relationship_loading(self, query):
        """Add user relationship loading for authentication context."""
        return query.options(
            selectinload(Employee.reporting_manager),
            selectinload(Employee.subordinates)
        )
    
    async def get_user_by_email(
        self,
        db: AsyncSession,
        email: str,
        load_relationships: bool = False
    ) -> Optional[Employee]:
        """
        Get user by email for authentication.
        
        Args:
            db: Database session
            email: User email
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
    
    async def get_active_user_by_email(
        self,
        db: AsyncSession,
        email: str,
        load_relationships: bool = False
    ) -> Optional[Employee]:
        """
        Get active user by email for authentication.
        
        Args:
            db: Database session
            email: User email
            load_relationships: Whether to load relationships
            
        Returns:
            Active employee instance or None
        """
        query = select(Employee).where(
            and_(
                Employee.emp_email == email,
                Employee.emp_status == True
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_active_user_by_id(
        self,
        db: AsyncSession,
        user_id: int,
        load_relationships: bool = False
    ) -> Optional[Employee]:
        """
        Get active user by ID for token validation.
        
        Args:
            db: Database session
            user_id: User ID (employee ID)
            load_relationships: Whether to load relationships
            
        Returns:
            Active employee instance or None
        """
        query = select(Employee).where(
            and_(
                Employee.emp_id == user_id,
                Employee.emp_status == True
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def is_user_active(
        self,
        db: AsyncSession,
        user_id: int
    ) -> bool:
        """
        Check if user is active.
        
        Args:
            db: Database session
            user_id: User ID (employee ID)
            
        Returns:
            True if user is active, False otherwise
        """
        query = select(Employee.emp_status).where(
            Employee.emp_id == user_id
        )
        result = await db.execute(query)
        status = result.scalar_one_or_none()
        return status is True
    
    async def get_user_permissions(
        self,
        db: AsyncSession,
        user_id: int
    ) -> dict:
        """
        Get user permissions based on role and role level.
        
        Args:
            db: Database session
            user_id: User ID (employee ID)
            
        Returns:
            Dictionary containing user permissions
        """
        query = select(
            Employee.emp_roles,
            Employee.emp_roles_level,
            Employee.emp_department,
            Employee.emp_reporting_manager_id
        ).where(Employee.emp_id == user_id)
        
        result = await db.execute(query)
        row = result.first()
        
        if not row:
            return {}
        
        # Define permissions based on role level
        permissions = {
            "role": row.emp_roles,
            "role_level": row.emp_roles_level,
            "department": row.emp_department,
            "reporting_manager_id": row.emp_reporting_manager_id,
            "can_view_own_profile": True,
            "can_edit_own_profile": True,
            "can_view_own_appraisals": True,
            "can_create_goals": False,
            "can_edit_goals": False,
            "can_delete_goals": False,
            "can_view_team_appraisals": False,
            "can_create_appraisals": False,
            "can_edit_appraisals": False,
            "can_approve_appraisals": False,
            "can_view_all_employees": False,
            "can_create_employees": False,
            "can_edit_employees": False,
            "can_delete_employees": False,
            "can_view_reports": False,
            "can_manage_templates": False,
            "can_manage_categories": False,
            "is_admin": False,
            "is_manager": False,
            "is_hr": False
        }
        
        # Set permissions based on role level
        if row.emp_roles_level >= 6:  # VP, CEO level
            permissions.update({
                "can_view_all_employees": True,
                "can_view_reports": True,
                "can_view_team_appraisals": True,
                "can_approve_appraisals": True,
                "is_admin": True,
                "is_manager": True
            })
        elif row.emp_roles_level >= 4:  # Team Lead, Manager level
            permissions.update({
                "can_view_team_appraisals": True,
                "can_create_appraisals": True,
                "can_edit_appraisals": True,
                "can_approve_appraisals": True,
                "can_create_goals": True,
                "can_edit_goals": True,
                "is_manager": True
            })
        elif row.emp_roles_level >= 2:  # Developer level
            permissions.update({
                "can_create_goals": True,
                "can_edit_goals": True
            })
        
        # Special permissions for HR department
        if row.emp_department and row.emp_department.lower() == "hr":
            permissions.update({
                "can_view_all_employees": True,
                "can_create_employees": True,
                "can_edit_employees": True,
                "can_view_reports": True,
                "can_manage_templates": True,
                "can_manage_categories": True,
                "is_hr": True
            })
        
        return permissions
    
    async def get_user_subordinates(
        self,
        db: AsyncSession,
        manager_id: int,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get all subordinates of a manager for authorization checks.
        
        Args:
            db: Database session
            manager_id: Manager's employee ID
            load_relationships: Whether to load relationships
            
        Returns:
            List of subordinate employees
        """
        query = select(Employee).where(
            and_(
                Employee.emp_reporting_manager_id == manager_id,
                Employee.emp_status == True
            )
        )
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def can_user_access_employee(
        self,
        db: AsyncSession,
        user_id: int,
        target_employee_id: int
    ) -> bool:
        """
        Check if user can access another employee's data.
        
        Args:
            db: Database session
            user_id: User ID making the request
            target_employee_id: Target employee ID
            
        Returns:
            True if user can access target employee data
        """
        # User can always access their own data
        if user_id == target_employee_id:
            return True
        
        # Get user permissions
        permissions = await self.get_user_permissions(db, user_id)
        
        # Admins and HR can access all employees
        if permissions.get("is_admin") or permissions.get("is_hr"):
            return True
        
        # Managers can access their subordinates
        if permissions.get("is_manager"):
            subordinates = await self.get_user_subordinates(db, user_id)
            subordinate_ids = [emp.emp_id for emp in subordinates]
            if target_employee_id in subordinate_ids:
                return True
        
        return False
    
    async def can_user_access_appraisal(
        self,
        db: AsyncSession,
        user_id: int,
        appraisal_data: dict
    ) -> bool:
        """
        Check if user can access a specific appraisal.
        
        Args:
            db: Database session
            user_id: User ID making the request
            appraisal_data: Dictionary containing appraisal data with keys:
                          appraisee_id, appraiser_id, reviewer_id
            
        Returns:
            True if user can access the appraisal
        """
        appraisee_id = appraisal_data.get("appraisee_id")
        appraiser_id = appraisal_data.get("appraiser_id")
        reviewer_id = appraisal_data.get("reviewer_id")
        
        # User is involved in the appraisal
        if user_id in [appraisee_id, appraiser_id, reviewer_id]:
            return True
        
        # Get user permissions
        permissions = await self.get_user_permissions(db, user_id)
        
        # Admins and HR can access all appraisals
        if permissions.get("is_admin") or permissions.get("is_hr"):
            return True
        
        # Managers can access their team's appraisals
        if permissions.get("can_view_team_appraisals"):
            if appraisee_id and await self.can_user_access_employee(db, user_id, appraisee_id):
                return True
        
        return False
    
    async def get_users_by_role_level(
        self,
        db: AsyncSession,
        min_role_level: int,
        department: Optional[str] = None,
        active_only: bool = True,
        load_relationships: bool = False
    ) -> List[Employee]:
        """
        Get users by minimum role level for assignment purposes.
        
        Args:
            db: Database session
            min_role_level: Minimum role level required
            department: Optional department filter
            active_only: Whether to include only active users
            load_relationships: Whether to load relationships
            
        Returns:
            List of employees meeting criteria
        """
        query = select(Employee).where(
            Employee.emp_roles_level >= min_role_level
        )
        
        if department:
            query = query.where(Employee.emp_department == department)
        
        if active_only:
            query = query.where(Employee.emp_status == True)
        
        if load_relationships:
            query = self._add_relationship_loading(query)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def update_password(
        self,
        db: AsyncSession,
        user_id: int,
        hashed_password: str,
        commit: bool = True
    ) -> bool:
        """
        Update user password.
        
        Args:
            db: Database session
            user_id: User ID
            hashed_password: New hashed password
            commit: Whether to commit the transaction
            
        Returns:
            True if password was updated successfully
        """
        user = await self.get_by_id(db, user_id)
        if not user:
            return False
        
        user.emp_password = hashed_password
        db.add(user)
        
        if commit:
            await db.commit()
            await db.refresh(user)
        
        return True