"""
Employee service for the Performance Management System.

This module provides business logic for employee-related operations
with proper validation and error handling using the Repository pattern.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.repositories.employee_repository import EmployeeRepository
from app.exceptions import (
    EntityNotFoundError,
    DuplicateEntityError,
    ValidationError,
    BadRequestError
)
from app.constants import (
    EMAIL_ALREADY_EXISTS,
    CIRCULAR_REPORTING_RELATIONSHIP
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmployeeService:
    """Service class for employee operations using Repository pattern."""
    
    def __init__(self):
        self.repository = EmployeeRepository()
    
    async def create_employee(
        self,
        db: AsyncSession,
        *,
        employee_data: EmployeeCreate
    ) -> Employee:
        """Create a new employee with validation."""
        # Validate unique constraints
        if await self.repository.email_exists(db, employee_data.emp_email):
            raise DuplicateEntityError("Employee", "email")
        
        # Validate reporting manager if provided
        if employee_data.emp_reporting_manager_id:
            manager = await self.repository.get_by_id(
                db, employee_data.emp_reporting_manager_id
            )
            if not manager:
                raise EntityNotFoundError("Reporting manager", employee_data.emp_reporting_manager_id)
            if not manager.emp_status:
                raise ValidationError("Reporting manager must be an active employee")
        
        # Hash password
        employee_dict = employee_data.dict()
        employee_dict["emp_password"] = self.hash_password(employee_dict["emp_password"])
        
        return await self.repository.create(db, employee_dict)
    
    async def update_employee(
        self,
        db: AsyncSession,
        *,
        employee_id: int,
        employee_data: EmployeeUpdate
    ) -> Employee:
        """Update an existing employee with validation."""
        db_employee = await self.repository.get_by_id(db, employee_id)
        if not db_employee:
            raise EntityNotFoundError("Employee", employee_id)
        
        # Validate email uniqueness if being updated
        if employee_data.emp_email:
            if await self.repository.email_exists(
                db, employee_data.emp_email, exclude_id=employee_id
            ):
                raise DuplicateEntityError("Employee", "email")
        
        # Validate reporting manager if being updated
        if employee_data.emp_reporting_manager_id is not None:
            if employee_data.emp_reporting_manager_id == 0:
                employee_data.emp_reporting_manager_id = None
            elif employee_data.emp_reporting_manager_id == employee_id:
                raise ValidationError(CIRCULAR_REPORTING_RELATIONSHIP)
            elif employee_data.emp_reporting_manager_id:
                # Check for circular reporting
                if await self.repository.is_circular_reporting(
                    db, employee_id, employee_data.emp_reporting_manager_id
                ):
                    raise ValidationError(CIRCULAR_REPORTING_RELATIONSHIP)
                
                # Validate manager exists and is active
                manager = await self.repository.get_by_id(
                    db, employee_data.emp_reporting_manager_id
                )
                if not manager:
                    raise EntityNotFoundError("Reporting manager", employee_data.emp_reporting_manager_id)
                if not manager.emp_status:
                    raise ValidationError("Reporting manager must be an active employee")
        
        # Hash password if being updated
        update_data = employee_data.dict(exclude_unset=True)
        if "emp_password" in update_data and update_data["emp_password"]:
            update_data["emp_password"] = self.hash_password(update_data["emp_password"])
        
        return await self.repository.update(db, db_employee, update_data)
    
    async def get_employee_by_id(
        self,
        db: AsyncSession,
        employee_id: int,
        load_relationships: bool = False
    ) -> Optional[Employee]:
        """Get employee by ID."""
        return await self.repository.get_by_id(
            db, employee_id, load_relationships=load_relationships
        )
    
    async def get_employee_by_email(
        self,
        db: AsyncSession,
        *,
        email: str,
        load_relationships: bool = False
    ) -> Optional[Employee]:
        """Get employee by email address."""
        return await self.repository.get_by_email(
            db, email, load_relationships=load_relationships
        )
    
    async def get_employees_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        department: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[bool] = None
    ) -> List[Employee]:
        """Search employees with filters."""
        if search:
            return await self.repository.search_employees(
                db, search, skip=skip, limit=limit
            )
        
        return await self.repository.get_employees_by_filters(
            db=db,
            department=department,
            role=role,
            status=status,
            skip=skip,
            limit=limit
        )
    
    async def get_managers(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Employee]:
        """Get employees who are managers (role level >= 4)."""
        managers = []
        # Get employees with role level >= 4 (Team Lead and above)
        for role_level in range(4, 8):  # 4-7 (Team Lead to CEO)
            level_managers = await self.repository.get_by_role_level(
                db, role_level, skip=0, limit=1000  # Get all managers at this level
            )
            managers.extend([m for m in level_managers if m.emp_status])
        
        # Apply pagination to the combined results
        start_idx = skip
        end_idx = skip + limit
        return managers[start_idx:end_idx]
    
    async def get_employee_with_subordinates(
        self,
        db: AsyncSession,
        employee_id: int
    ) -> Optional[Employee]:
        """Get employee with their subordinates loaded."""
        return await self.repository.get_by_id(
            db, employee_id, load_relationships=True
        )
    
    async def get_subordinates(
        self,
        db: AsyncSession,
        manager_id: int,
        load_relationships: bool = False
    ) -> List[Employee]:
        """Get all subordinates of a manager."""
        return await self.repository.get_subordinates(
            db, manager_id, load_relationships=load_relationships
        )
    
    async def get_team_hierarchy(
        self,
        db: AsyncSession,
        manager_id: int,
        max_depth: int = 3
    ) -> List[Employee]:
        """Get entire team hierarchy under a manager."""
        return await self.repository.get_team_hierarchy(
            db, manager_id, max_depth=max_depth
        )
    
    async def get_active_employees(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        load_relationships: bool = False
    ) -> List[Employee]:
        """Get all active employees."""
        return await self.repository.get_active_employees(
            db, skip=skip, limit=limit, load_relationships=load_relationships
        )
    
    async def delete_employee(
        self,
        db: AsyncSession,
        employee_id: int
    ) -> bool:
        """Delete employee by ID."""
        return await self.repository.delete(db, employee_id)
    
    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    # Backward compatibility methods for routers
    async def create(self, db: AsyncSession, *, obj_in: EmployeeCreate) -> Employee:
        """Backward compatibility method for create_employee."""
        return await self.create_employee(db, employee_data=obj_in)
    
    async def get_by_id_or_404(self, db: AsyncSession, entity_id: int) -> Employee:
        """Backward compatibility method - get by ID or raise 404."""
        employee = await self.get_employee_by_id(db, entity_id)
        if not employee:
            raise EntityNotFoundError("Employee", entity_id)
        return employee
    
    async def update(self, db: AsyncSession, *, db_obj: Employee, obj_in: EmployeeUpdate) -> Employee:
        """Backward compatibility method for update."""
        return await self.update_employee(db, employee_id=db_obj.emp_id, employee_data=obj_in)
    
    async def soft_delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Soft delete employee (set status to inactive)."""
        employee = await self.get_employee_by_id(db, entity_id)
        if not employee:
            raise EntityNotFoundError("Employee", entity_id)
        
        update_data = {"emp_status": False}
        await self.repository.update(db, employee, update_data)
        return True
    
    async def delete(self, db: AsyncSession, *, entity_id: int) -> bool:
        """Backward compatibility method for delete."""
        return await self.delete_employee(db, entity_id)
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by = None
    ) -> List[Employee]:
        """Get multiple employees - backward compatibility."""
        return await self.get_active_employees(db, skip=skip, limit=limit)