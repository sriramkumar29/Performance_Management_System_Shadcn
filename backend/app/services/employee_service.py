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
from app.exceptions.domain_exceptions import (
    BaseServiceException, BaseRepositoryException, BusinessRuleViolationError,
    UnauthorizedActionError, ValidationError as DomainValidationError,
    EntityNotFoundError as DomainEntityNotFoundError
)
from app.utils.logger import (
    get_logger, log_execution_time, log_exception, 
    log_business_operation, build_log_context, sanitize_log_data
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmployeeService(BaseService[Employee, EmployeeCreate, EmployeeUpdate]):
    """Service class for employee operations."""
    
    def __init__(self):
        """Initialize the EmployeeService."""
        super().__init__(Employee)
        self.repository = EmployeeRepository()
        self.logger = get_logger(f"app.services.{self.__module__}")
        self.logger.debug("EmployeeService initialized successfully")
    
    @property
    def entity_name(self) -> str:
        return "Employee"
    
    @property
    def id_field(self) -> str:
        return "emp_id"

    @log_execution_time()
    @log_exception()
    async def update(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: Employee, 
        obj_in: EmployeeUpdate
    ) -> Employee:
        """Update an employee with the provided data with proper logging and error handling."""
        context = build_log_context()
        employee_id = getattr(db_obj, self.id_field)
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update {self.entity_name} - ID: {employee_id}")
        
        try:
            # Convert Pydantic model to dict, excluding unset values
            update_data = obj_in.model_dump(exclude_unset=True)
            self.logger.debug(f"{context}UPDATE_DATA: {sanitize_log_data(update_data)}")
            
            # Apply business logic hooks
            update_data = await self.before_update(db, db_obj, update_data)
            
            # Update fields
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            # Use repository to update
            updated_employee = await self.repository.update(db, db_obj)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated {self.entity_name} - ID: {employee_id}")
            return updated_employee
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to update {self.entity_name} - {e.message}")
            raise BaseServiceException(f"Failed to update {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to update {self.entity_name} ID {employee_id} - {str(e)}")
            raise BaseServiceException(f"Unexpected error updating {self.entity_name}")
    
    @log_execution_time()
    @log_exception()
    async def get_by_id_or_404(
        self,
        db: AsyncSession,
        entity_id: int,
        *,
        load_relationships: Optional[List[str]] = None
    ) -> Employee:
        """Get employee by ID or raise 404 error with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by ID: {entity_id}")
        
        try:
            if load_relationships:
                employee = await self.repository.get_by_id_with_relationships(db, entity_id, load_relationships)
            else:
                employee = await self.repository.get_by_id(db, entity_id)
            
            if not employee:
                self.logger.warning(f"{context}ENTITY_NOT_FOUND: {self.entity_name} with ID {entity_id} not found")
                raise DomainEntityNotFoundError(f"{self.entity_name} with ID {entity_id} not found")
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with ID: {entity_id}")
            return employee
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            raise BaseServiceException(f"Failed to retrieve {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by ID {entity_id} - {str(e)}")
            raise BaseServiceException(f"Unexpected error retrieving {self.entity_name}")
    
    @log_execution_time()
    @log_exception()
    async def get_by_id(
        self,
        db: AsyncSession,
        entity_id: int
    ) -> Optional[Employee]:
        """Get employee by ID without raising error with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by ID (no exception): {entity_id}")
        
        try:
            employee = await self.repository.get_by_id(db, entity_id)
            
            if employee:
                self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with ID: {entity_id}")
            else:
                self.logger.info(f"{context}SERVICE_INFO: {self.entity_name} with ID {entity_id} not found")
            
            return employee
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: {e.__class__.__name__} - {e.message}")
            return None
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by ID {entity_id} - {str(e)}")
            return None
    
    @log_execution_time()
    @log_exception()
    async def create_employee(
        self,
        db: AsyncSession,
        *,
        employee_data: EmployeeCreate
    ) -> Employee:
        """Create a new employee with proper validation, logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Create {self.entity_name} - Email: {sanitize_log_data(employee_data.emp_email)}")
        
        try:
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
            
            self.logger.debug(f"{context}PASSWORD_HASHED: Password securely hashed for {self.entity_name}")
            
            # Create employee using repository
            db_employee = Employee(**obj_data)
            created_employee = await self.repository.create(db, db_employee)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Created {self.entity_name} with ID: {getattr(created_employee, self.id_field)}")
            return created_employee
            
        except (DuplicateEntityError, ValidationError, DomainValidationError) as e:
            # Re-raise business validation exceptions
            self.logger.warning(f"{context}VALIDATION_ERROR: {e.__class__.__name__} - {str(e)}")
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to create {self.entity_name} - {e.message}")
            raise BaseServiceException(f"Failed to create {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to create {self.entity_name} - {str(e)}")
            raise BaseServiceException(f"Unexpected error creating {self.entity_name}")
    
    @log_execution_time()
    @log_exception()
    async def update_employee(
        self,
        db: AsyncSession,
        *,
        employee_id: int,
        employee_data: EmployeeUpdate
    ) -> Employee:
        """Update an existing employee with validation, logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Update {self.entity_name} - ID: {employee_id}")
        
        try:
            db_employee = await self.get_by_id_or_404(db, employee_id)
            
            # Validate email uniqueness if being updated
            if employee_data.emp_email:
                self.logger.debug(f"{context}EMAIL_VALIDATION: Validating email uniqueness for {self.entity_name} ID: {employee_id}")
                await self._validate_email_unique(
                    db, 
                    employee_data.emp_email, 
                    exclude_id=employee_id
                )
            
            # Validate reporting manager if being updated
            if employee_data.emp_reporting_manager_id is not None:
                if employee_data.emp_reporting_manager_id == 0:
                    employee_data.emp_reporting_manager_id = None
                    self.logger.debug(f"{context}MANAGER_UPDATE: Removing reporting manager for {self.entity_name} ID: {employee_id}")
                elif employee_data.emp_reporting_manager_id == employee_id:
                    self.logger.warning(f"{context}CIRCULAR_RELATIONSHIP: Attempted circular reporting relationship for {self.entity_name} ID: {employee_id}")
                    raise ValidationError(CIRCULAR_REPORTING_RELATIONSHIP)
                else:
                    await self._validate_reporting_manager(db, employee_data.emp_reporting_manager_id)
            
            # Update employee
            updated_employee = await self.update(db=db, db_obj=db_employee, obj_in=employee_data)
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Updated {self.entity_name} with ID: {employee_id}")
            return updated_employee
            
        except (ValidationError, DomainValidationError, DomainEntityNotFoundError) as e:
            # Re-raise business validation exceptions
            self.logger.warning(f"{context}VALIDATION_ERROR: {e.__class__.__name__} - {str(e)}")
            raise
            
        except BaseServiceException:
            # Re-raise service exceptions from nested calls
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to update {self.entity_name} - {e.message}")
            raise BaseServiceException(f"Failed to update {self.entity_name}: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to update {self.entity_name} ID {employee_id} - {str(e)}")
            raise BaseServiceException(f"Unexpected error updating {self.entity_name}")
    
    @log_execution_time()
    @log_exception()
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
        """Get employees with filtering and search with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name}s with filters - skip: {skip}, limit: {limit}, search: {sanitize_log_data(search)}")
        
        try:
            filters = []
            
            if status is not None:
                filters.append(Employee.emp_status == status)
                self.logger.debug(f"{context}FILTER_APPLIED: Status filter - {status}")
            
            if department:
                filters.append(Employee.emp_department.ilike(f"%{department}%"))
                self.logger.debug(f"{context}FILTER_APPLIED: Department filter - {sanitize_log_data(department)}")
            
            if role:
                filters.append(Employee.emp_roles.ilike(f"%{role}%"))
                self.logger.debug(f"{context}FILTER_APPLIED: Role filter - {sanitize_log_data(role)}")
            
            # Add search filters
            if search:
                search_filters = self._build_search_filters(
                    search, 
                    ["emp_name", "emp_email", "emp_department", "emp_roles"]
                )
                filters.extend(search_filters)
                self.logger.debug(f"{context}SEARCH_APPLIED: Search term - {sanitize_log_data(search)}")
            
            employees = await self.repository.get_multi(
                db=db,
                skip=skip,
                limit=limit,
                filters=filters,
                order_by=Employee.emp_name
            )
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(employees)} {self.entity_name}s with filters")
            return employees
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to get {self.entity_name}s with filters - {e.message}")
            raise BaseServiceException(f"Failed to retrieve {self.entity_name}s: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name}s with filters - {str(e)}")
            raise BaseServiceException(f"Unexpected error retrieving {self.entity_name}s")
    
    @log_execution_time()
    @log_exception()
    async def get_managers(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Employee]:
        """Get employees who can be managers (active employees) with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get potential managers - skip: {skip}, limit: {limit}")
        
        try:
            managers = await self.repository.get_active_employees(
                db=db,
                skip=skip,
                limit=limit
            )
            
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {len(managers)} potential managers")
            return managers
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to get potential managers - {e.message}")
            raise BaseServiceException(f"Failed to retrieve potential managers: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get potential managers - {str(e)}")
            raise BaseServiceException("Unexpected error retrieving potential managers")
    
    @log_execution_time()
    @log_exception()
    async def get_employee_with_subordinates(
        self,
        db: AsyncSession,
        *,
        employee_id: int
    ) -> Employee:
        """Get employee with their subordinates with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} with subordinates - ID: {employee_id}")
        
        try:
            employee = await self.get_by_id_or_404(
                db,
                employee_id,
                load_relationships=["subordinates"]
            )
            
            subordinate_count = len(employee.subordinates) if hasattr(employee, 'subordinates') and employee.subordinates else 0
            self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} with {subordinate_count} subordinates - ID: {employee_id}")
            return employee
            
        except DomainEntityNotFoundError:
            # Re-raise domain exceptions as-is
            raise
            
        except BaseServiceException:
            # Re-raise service exceptions from nested calls
            raise
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} with subordinates ID {employee_id} - {str(e)}")
            raise BaseServiceException(f"Unexpected error retrieving {self.entity_name} with subordinates")
    
    @log_execution_time()
    @log_exception()
    async def verify_password(
        self,
        plain_password: str,
        hashed_password: str
    ) -> bool:
        """Verify a password against its hash with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.debug(f"{context}SERVICE_REQUEST: Verify password hash")
        
        try:
            is_valid = pwd_context.verify(plain_password, hashed_password)
            
            if is_valid:
                self.logger.debug(f"{context}PASSWORD_VERIFICATION: Password verification successful")
            else:
                self.logger.debug(f"{context}PASSWORD_VERIFICATION: Password verification failed")
            
            return is_valid
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Password verification failed - {str(e)}")
            return False
    
    @log_execution_time()
    @log_exception()
    async def get_employee_by_email(
        self,
        db: AsyncSession,
        *,
        email: str
    ) -> Optional[Employee]:
        """Get employee by email address with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.info(f"{context}SERVICE_REQUEST: Get {self.entity_name} by email - {sanitize_log_data(email)}")
        
        try:
            employee = await self.repository.get_by_email(db, email)
            
            if employee:
                self.logger.info(f"{context}SERVICE_SUCCESS: Retrieved {self.entity_name} by email - ID: {getattr(employee, self.id_field)}")
            else:
                self.logger.info(f"{context}SERVICE_INFO: {self.entity_name} with email {sanitize_log_data(email)} not found")
            
            return employee
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to get {self.entity_name} by email - {e.message}")
            return None
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to get {self.entity_name} by email {sanitize_log_data(email)} - {str(e)}")
            return None
    
    @log_execution_time()
    @log_exception()
    async def _validate_email_unique(
        self,
        db: AsyncSession,
        email: str,
        exclude_id: Optional[int] = None
    ) -> None:
        """Validate that email is unique with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.debug(f"{context}VALIDATION_REQUEST: Check email uniqueness - {sanitize_log_data(email)}")
        
        try:
            email_exists = await self.repository.check_email_exists(db, email, exclude_id)
            
            if email_exists:
                self.logger.warning(f"{context}VALIDATION_FAILED: Email already exists - {sanitize_log_data(email)}")
                raise DuplicateEntityError(ENTITY_EMPLOYEE, "email")
            
            self.logger.debug(f"{context}VALIDATION_SUCCESS: Email is unique - {sanitize_log_data(email)}")
            
        except DuplicateEntityError:
            # Re-raise business validation exceptions
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to validate email uniqueness - {e.message}")
            raise BaseServiceException(f"Failed to validate email uniqueness: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to validate email uniqueness for {sanitize_log_data(email)} - {str(e)}")
            raise BaseServiceException("Unexpected error during email validation")
    
    @log_execution_time()
    @log_exception()
    async def _validate_reporting_manager(
        self,
        db: AsyncSession,
        manager_id: int
    ) -> Employee:
        """Validate that reporting manager exists and is active with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.debug(f"{context}VALIDATION_REQUEST: Check reporting manager exists - ID: {manager_id}")
        
        try:
            manager = await self.repository.validate_manager_exists(db, manager_id)
            
            if not manager:
                self.logger.warning(f"{context}VALIDATION_FAILED: Reporting manager not found - ID: {manager_id}")
                raise EntityNotFoundError(ENTITY_REPORTING_MANAGER, manager_id)
            
            self.logger.debug(f"{context}VALIDATION_SUCCESS: Reporting manager validated - ID: {manager_id}")
            return manager
            
        except EntityNotFoundError:
            # Re-raise business validation exceptions
            raise
            
        except BaseRepositoryException as e:
            self.logger.error(f"{context}REPOSITORY_ERROR: Failed to validate reporting manager - {e.message}")
            raise BaseServiceException(f"Failed to validate reporting manager: {e.message}")
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to validate reporting manager ID {manager_id} - {str(e)}")
            raise BaseServiceException("Unexpected error during manager validation")
    
    @log_execution_time()
    @log_exception()
    async def _validate_unique_constraints(
        self,
        db: AsyncSession,
        obj_data: Dict[str, Any],
        exclude_id: Optional[int] = None
    ) -> None:
        """Validate unique constraints for employee with proper logging and error handling."""
        context = build_log_context()
        
        self.logger.debug(f"{context}VALIDATION_REQUEST: Check unique constraints for {self.entity_name}")
        
        try:
            if "emp_email" in obj_data:
                self.logger.debug(f"{context}CONSTRAINT_CHECK: Validating email uniqueness")
                await self._validate_email_unique(
                    db, 
                    obj_data["emp_email"], 
                    exclude_id=exclude_id
                )
            
            self.logger.debug(f"{context}VALIDATION_SUCCESS: All unique constraints validated for {self.entity_name}")
            
        except (DuplicateEntityError, BaseServiceException):
            # Re-raise validation exceptions from nested calls
            raise
            
        except Exception as e:
            self.logger.error(f"{context}UNEXPECTED_ERROR: Failed to validate unique constraints - {str(e)}")
            raise BaseServiceException("Unexpected error during constraint validation")
    
    def _build_search_filters(self, search: str, fields: List[str]) -> List:
        """Build search filters for the given fields."""
        search_filters = []
        search_term = f"%{search}%"
        
        for field in fields:
            if hasattr(Employee, field):
                attr = getattr(Employee, field)
                search_filters.append(attr.ilike(search_term))
        
        return [or_(*search_filters)] if search_filters else []