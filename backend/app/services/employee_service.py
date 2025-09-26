"""
Employee service for the Performance Management System.

This module provides business logic for employee-related operations
with proper validation and error handling.
"""

from typing import List, Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_
from passlib.context import CryptContext

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.base_service import BaseService
from app.repositories.employee_repository import EmployeeRepository
from app.exceptions import (
    EntityNotFoundError,
    DuplicateEntityError,
    ValidationError
)
from app.constants import ENTITY_EMPLOYEE, ENTITY_REPORTING_MANAGER
from app.constants import (
    EMAIL_ALREADY_EXISTS,
    CIRCULAR_REPORTING_RELATIONSHIP
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmployeeService(BaseService[Employee, EmployeeCreate, EmployeeUpdate]):
    """Service class for employee operations."""
    
    def __init__(self):
        """Initialize the EmployeeService."""
        super().__init__(Employee)
        self.repository = EmployeeRepository()

    async def update(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: Employee, 
        obj_in: EmployeeUpdate
    ) -> Employee:
        """Update an employee with the provided data."""
        # Convert Pydantic model to dict, excluding unset values
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Apply business logic hooks
        update_data = await self.before_update(db, db_obj, update_data)
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        # Use repository to update
        return await self.repository.update(db, db_obj)
    
    @property
    def entity_name(self) -> str:
        return "Employee"
    
    @property
    def id_field(self) -> str:
        return "emp_id"
    
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Employee:
        """Get employee by ID or raise 404 error."""
        if load_relationships:
            employee = await self.repository.get_by_id_with_relationships(db, entity_id, load_relationships)
        else:
            employee = await self.repository.get_by_id(db, entity_id)
        
        if not employee:
            raise EntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
        return employee
    
    async def get_by_id(
        self,
        db: AsyncSession,
        entity_id: int
    ) -> Optional[Employee]:
        """Get employee by ID without raising error."""
        return await self.repository.get_by_id(db, entity_id)
    
    async def create_employee(
        self,
        db: AsyncSession,
        *,
        employee_data: EmployeeCreate
    ) -> Employee:
        """Create a new employee with proper validation."""
        # Validate email uniqueness
        await self._validate_email_unique(db, employee_data.emp_email)
        
        # Validate reporting manager if provided
        if employee_data.emp_reporting_manager_id and employee_data.emp_reporting_manager_id != 0:
            await self._validate_reporting_manager(db, employee_data.emp_reporting_manager_id)
        else:
            employee_data.emp_reporting_manager_id = None
        
        # Hash password
        obj_data = employee_data.model_dump()
        plain_password = obj_data.pop("password")
        hashed_password = pwd_context.hash(plain_password)
        obj_data["emp_password"] = hashed_password
        
        # Create employee using repository
        db_employee = Employee(**obj_data)
        return await self.repository.create(db, db_employee)
    
    async def update_employee(
        self,
        db: AsyncSession,
        *,
        employee_id: int,
        employee_data: EmployeeUpdate
    ) -> Employee:
        """Update an existing employee with validation."""
        db_employee = await self.get_by_id_or_404(db, employee_id)
        
        # Validate email uniqueness if being updated
        if employee_data.emp_email:
            await self._validate_email_unique(
                db, 
                employee_data.emp_email, 
                exclude_id=employee_id
            )
        
        # Validate reporting manager if being updated
        if employee_data.emp_reporting_manager_id is not None:
            if employee_data.emp_reporting_manager_id == 0:
                employee_data.emp_reporting_manager_id = None
            elif employee_data.emp_reporting_manager_id == employee_id:
                raise ValidationError(CIRCULAR_REPORTING_RELATIONSHIP)
            else:
                await self._validate_reporting_manager(db, employee_data.emp_reporting_manager_id)
        
        # Update employee
        return await self.update(db=db, db_obj=db_employee, obj_in=employee_data)
    
    async def get_employees_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[bool] = None,
        department: Optional[str] = None,
        role: Optional[str] = None
    ) -> List[Employee]:
        """Get employees with filtering and search."""
        filters = []
        
        if status is not None:
            filters.append(Employee.emp_status == status)
        
        if department:
            filters.append(Employee.emp_department.ilike(f"%{department}%"))
        
        if role:
            filters.append(Employee.emp_roles.ilike(f"%{role}%"))
        
        # Add search filters
        if search:
            search_filters = self._build_search_filters(
                search, 
                ["emp_name", "emp_email", "emp_department", "emp_roles"]
            )
            filters.extend(search_filters)
        
        return await self.repository.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=Employee.emp_name
        )
    
    async def get_managers(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Employee]:
        """Get employees who can be managers (active employees)."""
        return await self.repository.get_active_employees(
            db=db,
            skip=skip,
            limit=limit
        )
    
    async def get_employee_with_subordinates(
        self,
        db: AsyncSession,
        *,
        employee_id: int
    ) -> Employee:
        """Get employee with their subordinates."""
        return await self.get_by_id_or_404(
            db,
            employee_id,
            load_relationships=["subordinates"]
        )
    
    async def verify_password(
        self,
        plain_password: str,
        hashed_password: str
    ) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    async def get_employee_by_email(
        self,
        db: AsyncSession,
        *,
        email: str
    ) -> Optional[Employee]:
        """Get employee by email address."""
        return await self.repository.get_by_email(db, email)
    
    async def _validate_email_unique(
        self,
        db: AsyncSession,
        email: str,
        exclude_id: Optional[int] = None
    ) -> None:
        """Validate that email is unique."""
        email_exists = await self.repository.check_email_exists(db, email, exclude_id)
        
        if email_exists:
            raise DuplicateEntityError(ENTITY_EMPLOYEE, "email")
    
    async def _validate_reporting_manager(
        self,
        db: AsyncSession,
        manager_id: int
    ) -> Employee:
        """Validate that reporting manager exists and is active."""
        manager = await self.repository.validate_manager_exists(db, manager_id)
        
        if not manager:
            raise EntityNotFoundError(ENTITY_REPORTING_MANAGER, manager_id)
        
        return manager
    
    async def _validate_unique_constraints(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any],
        exclude_id: Optional[int] = None
    ) -> None:
        """Validate unique constraints for employee."""
        if "emp_email" in obj_data:
            await self._validate_email_unique(
                db, 
                obj_data["emp_email"], 
                exclude_id=exclude_id
            )
    
    def _build_search_filters(self, search: str, fields: List[str]) -> List:
        """Build search filters for the given fields."""
        search_filters = []
        search_term = f"%{search}%"
        
        for field in fields:
            if hasattr(Employee, field):
                attr = getattr(Employee, field)
                search_filters.append(attr.ilike(search_term))
        
        return [or_(*search_filters)] if search_filters else []