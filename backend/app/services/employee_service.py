"""Employee service for handling employee-related business logic."""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.services.base_service import BaseService
from app.services.auth_service import AuthService
from app.constants import (
    EMPLOYEE_NOT_FOUND,
    REPORTING_MANAGER_NOT_FOUND,
    get_entity_not_found_message,
    CIRCULAR_REPORTING_RELATIONSHIP
)


class EmployeeService(BaseService[Employee, EmployeeCreate, EmployeeUpdate]):
    """Service for employee-related operations."""
    
    def __init__(self):
        super().__init__(Employee)
        self.auth_service = AuthService()
    
    async def get_by_id(self, db: AsyncSession, employee_id: int) -> Optional[Employee]:
        """Get employee by ID."""
        result = await db.execute(
            select(Employee)
            .where(Employee.emp_id == employee_id)
            .options(selectinload(Employee.subordinates))
        )
        return result.scalars().first()
    
    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Employee]:
        """Get employee by email."""
        result = await db.execute(select(Employee).where(Employee.emp_email == email))
        return result.scalars().first()
    
    async def get_all_employees(
        self, 
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        include_inactive: bool = False
    ) -> List[Employee]:
        """Get all employees with pagination."""
        query = select(Employee).options(selectinload(Employee.subordinates))
        
        if not include_inactive:
            query = query.where(Employee.emp_status == True)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_managers(self, db: AsyncSession) -> List[Employee]:
        """Get all employees who can be managers (level >= 4)."""
        result = await db.execute(
            select(Employee)
            .where(Employee.emp_roles_level >= 4)
            .where(Employee.emp_status == True)
        )
        return result.scalars().all()
    
    async def get_subordinates(self, db: AsyncSession, manager_id: int) -> List[Employee]:
        """Get all subordinates of a manager."""
        result = await db.execute(
            select(Employee)
            .where(Employee.emp_reporting_manager_id == manager_id)
            .where(Employee.emp_status == True)
        )
        return result.scalars().all()
    
    async def create_employee(
        self, 
        db: AsyncSession, 
        employee_data: EmployeeCreate
    ) -> Employee:
        """Create a new employee with validation."""
        async with db.begin():
            # Validate create data
            await self.validate_create(db, employee_data)
            
            # Prepare employee data
            emp_data = employee_data.model_dump()
            
            # Handle reporting manager (convert 0 to None)
            if emp_data.get('emp_reporting_manager_id') == 0:
                emp_data['emp_reporting_manager_id'] = None
            
            # Hash password
            plain_password = emp_data.pop("password")
            emp_data["emp_password"] = self.auth_service.hash_password(plain_password)
            
            # Create employee
            db_employee = Employee(**emp_data)
            db.add(db_employee)
            await db.flush()
            
            # Refresh to get all fields
            await db.refresh(db_employee)
            return db_employee
    
    async def update_employee(
        self, 
        db: AsyncSession, 
        employee_id: int, 
        employee_update: EmployeeUpdate
    ) -> Employee:
        """Update an existing employee."""
        async with db.begin():
            # Get existing employee
            db_employee = await self.get_by_id_or_404(db, employee_id)
            
            # Validate update data
            await self.validate_update(db, db_employee, employee_update)
            
            # Update employee
            updated_employee = await self.update(db, db_employee, employee_update, commit=False)
            await db.refresh(updated_employee)
            
            return updated_employee
    
    async def deactivate_employee(self, db: AsyncSession, employee_id: int) -> Employee:
        """Deactivate an employee (soft delete)."""
        async with db.begin():
            db_employee = await self.get_by_id_or_404(db, employee_id)
            db_employee.emp_status = False
            db.add(db_employee)
            await db.refresh(db_employee)
            return db_employee
    
    async def validate_create(self, db: AsyncSession, obj_in: EmployeeCreate) -> None:
        """Validate employee creation data."""
        # Check email uniqueness
        await self.auth_service.validate_email_unique(db, obj_in.emp_email)
        
        # Validate reporting manager if provided
        if obj_in.emp_reporting_manager_id and obj_in.emp_reporting_manager_id != 0:
            await self._validate_reporting_manager(db, obj_in.emp_reporting_manager_id)
    
    async def validate_update(self, db: AsyncSession, db_obj: Employee, obj_in: EmployeeUpdate) -> None:
        """Validate employee update data."""
        # Check email uniqueness if email is being updated
        if obj_in.emp_email and obj_in.emp_email != db_obj.emp_email:
            await self.auth_service.validate_email_unique(db, obj_in.emp_email)
        
        # Validate reporting manager if being updated
        if obj_in.emp_reporting_manager_id is not None:
            if obj_in.emp_reporting_manager_id == 0:
                # Converting to no manager is allowed
                pass
            else:
                # Validate new reporting manager
                await self._validate_reporting_manager(db, obj_in.emp_reporting_manager_id)
                
                # Check for circular reference
                if obj_in.emp_reporting_manager_id == db_obj.emp_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=CIRCULAR_REPORTING_RELATIONSHIP
                    )
    
    async def _validate_reporting_manager(self, db: AsyncSession, manager_id: int) -> None:
        """Validate that reporting manager exists and is active."""
        result = await db.execute(
            select(Employee).where(
                Employee.emp_id == manager_id,
                Employee.emp_status == True
            )
        )
        manager = result.scalars().first()
        
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=get_entity_not_found_message("Reporting manager", manager_id)
            )
    
    async def get_by_id_or_404(self, db: AsyncSession, employee_id: int) -> Employee:
        """Get employee by ID or raise 404 error."""
        employee = await self.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_entity_not_found_message("Employee", employee_id)
            )
        return employee