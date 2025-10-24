"""
Employee repository for database operations.

This module handles all direct database interactions
for the Employee entity with comprehensive logging.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError, NoResultFound

from app.models.employee import Employee
from app.repositories.base_repository import BaseRepository
from app.exceptions.domain_exceptions import RepositoryException
from app.utils.logger import get_logger, build_log_context, sanitize_log_data, log_execution_time


class EmployeeRepository(BaseRepository[Employee]):
    """Repository for Employee database operations with comprehensive logging."""
    
    def __init__(self):
        super().__init__(Employee)
        self.logger = get_logger(__name__)

    @property
    def entity_name(self) -> str:
        return "Employee"

    @property
    def id_field(self) -> str:
        return "emp_id"

    @log_execution_time()
    async def get_by_id(self, db: AsyncSession, emp_id: int) -> Optional[Employee]:
        """Get employee by ID with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_BY_ID: Getting employee - ID: {emp_id}")
        
        try:
            result = await db.execute(
                select(Employee).where(Employee.emp_id == emp_id)
            )
            employee = result.scalars().first()
            
            if employee:
                self.logger.debug(f"{context}REPO_GET_BY_ID_SUCCESS: Found employee - ID: {emp_id}, Name: {sanitize_log_data(employee.emp_name)}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_ID_NOT_FOUND: Employee not found - ID: {emp_id}")
                
            return employee
            
        except Exception as e:
            error_msg = f"Error retrieving employee by ID: {emp_id}"
            self.logger.error(f"{context}REPO_GET_BY_ID_ERROR: {error_msg} - {str(e)}")
            raise RepositoryException(error_msg, details={"emp_id": emp_id, "original_error": str(e)})

    @log_execution_time()
    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Employee]:
        """Get employee by email with comprehensive logging."""
        context = build_log_context()
        sanitized_email = sanitize_log_data(email)
        
        self.logger.debug(f"{context}REPO_GET_BY_EMAIL: Getting employee - Email: {sanitized_email}")
        
        try:
            result = await db.execute(
                select(Employee).where(Employee.emp_email == email)
            )
            employee = result.scalars().first()
            
            if employee:
                self.logger.debug(f"{context}REPO_GET_BY_EMAIL_SUCCESS: Found employee - Email: {sanitized_email}, ID: {employee.emp_id}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_EMAIL_NOT_FOUND: Employee not found - Email: {sanitized_email}")
                
            return employee
            
        except Exception as e:
            error_msg = f"Error retrieving employee by email"
            self.logger.error(f"{context}REPO_GET_BY_EMAIL_ERROR: {error_msg} - Email: {sanitized_email}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"email": email, "original_error": str(e)})

    @log_execution_time()
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by=None
    ) -> List[Employee]:
        """Get multiple employees with filters and comprehensive logging."""
        context = build_log_context()
        
        filter_count = len(filters) if filters else 0
        self.logger.debug(f"{context}REPO_GET_MULTI: Getting employees - Skip: {skip}, Limit: {limit}, Filters: {filter_count}")
        
        try:
            query = select(Employee)
            if filters:
                query = query.where(and_(*filters))
            if order_by:
                query = query.order_by(order_by)

            query = query.offset(skip).limit(limit)
            result = await db.execute(query)
            employees = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_GET_MULTI_SUCCESS: Retrieved {len(employees)} employees - Skip: {skip}, Limit: {limit}")
            return employees
            
        except Exception as e:
            error_msg = f"Error retrieving multiple employees"
            self.logger.error(f"{context}REPO_GET_MULTI_ERROR: {error_msg} - Skip: {skip}, Limit: {limit}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"skip": skip, "limit": limit, "original_error": str(e)})

    @log_execution_time()
    async def create(self, db: AsyncSession, employee: Employee) -> Employee:
        """Create a new employee with comprehensive logging."""
        context = build_log_context()

        sanitized_email = employee.emp_email.replace("@", "[at]") if employee.emp_email else "None"
        self.logger.debug(f"{context}REPO_CREATE: Creating employee - Name: {employee.emp_name}, Email: {sanitized_email}")

        try:
            db.add(employee)
            await db.flush()
            await db.refresh(employee)

            self.logger.info(f"{context}REPO_CREATE_SUCCESS: Employee created - ID: {employee.emp_id}, Name: {employee.emp_name}, Email: {sanitized_email}")
            return employee

        except Exception as e:
            # Don't rollback here - let the session dependency handle it
            error_msg = f"Error creating employee"
            self.logger.error(f"{context}REPO_CREATE_ERROR: {error_msg} - Name: {employee.emp_name}, Email: {sanitized_email}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"employee_name": employee.emp_name, "original_error": str(e)})

    @log_execution_time()
    async def update(self, db: AsyncSession, employee: Employee) -> Employee:
        """Update an existing employee with comprehensive logging."""
        context = build_log_context()

        sanitized_email = employee.emp_email.replace("@", "[at]") if employee.emp_email else "None"
        self.logger.debug(f"{context}REPO_UPDATE: Updating employee - ID: {employee.emp_id}, Name: {employee.emp_name}, Email: {sanitized_email}")

        try:
            await db.flush()
            await db.refresh(employee)

            self.logger.info(f"{context}REPO_UPDATE_SUCCESS: Employee updated - ID: {employee.emp_id}, Name: {employee.emp_name}, Email: {sanitized_email}")
            return employee

        except Exception as e:
            # Don't rollback here - let the session dependency handle it
            error_msg = f"Error updating employee"
            self.logger.error(f"{context}REPO_UPDATE_ERROR: {error_msg} - ID: {employee.emp_id}, Name: {employee.emp_name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"employee_id": employee.emp_id, "original_error": str(e)})

    @log_execution_time()
    async def delete(self, db: AsyncSession, employee: Employee) -> None:
        """Delete an employee with comprehensive logging."""
        context = build_log_context()

        sanitized_email = employee.emp_email.replace("@", "[at]") if employee.emp_email else "None"
        self.logger.debug(f"{context}REPO_DELETE: Deleting employee - ID: {employee.emp_id}, Name: {employee.emp_name}, Email: {sanitized_email}")

        try:
            await db.delete(employee)
            await db.flush()

            self.logger.info(f"{context}REPO_DELETE_SUCCESS: Employee deleted - ID: {employee.emp_id}, Name: {employee.emp_name}")

        except Exception as e:
            # Don't rollback here - let the session dependency handle it
            error_msg = f"Error deleting employee"
            self.logger.error(f"{context}REPO_DELETE_ERROR: {error_msg} - ID: {employee.emp_id}, Name: {employee.emp_name}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"employee_id": employee.emp_id, "original_error": str(e)})

    @log_execution_time()
    async def get_by_id_with_relationships(
        self,
        db: AsyncSession, 
        emp_id: int, 
        load_relationships: Optional[List[str]] = None
    ) -> Optional[Employee]:
        """Get employee by ID with specified relationships loaded and comprehensive logging."""
        context = build_log_context()
        
        relationships_str = ", ".join(load_relationships) if load_relationships else "None"
        self.logger.debug(f"{context}REPO_GET_BY_ID_WITH_RELS: Getting employee with relationships - ID: {emp_id}, Relationships: {relationships_str}")
        
        try:
            query = select(Employee).where(Employee.emp_id == emp_id)
            
            if load_relationships:
                for rel in load_relationships:
                    if rel == "subordinates":
                        query = query.options(selectinload(Employee.subordinates))
                    # Add other relationships as needed
            
            result = await db.execute(query)
            employee = result.scalars().first()
            
            if employee:
                self.logger.debug(f"{context}REPO_GET_BY_ID_WITH_RELS_SUCCESS: Found employee with relationships - ID: {emp_id}, Name: {employee.emp_name}")
            else:
                self.logger.debug(f"{context}REPO_GET_BY_ID_WITH_RELS_NOT_FOUND: Employee not found - ID: {emp_id}")
                
            return employee
            
        except Exception as e:
            error_msg = f"Error retrieving employee by ID with relationships"
            self.logger.error(f"{context}REPO_GET_BY_ID_WITH_RELS_ERROR: {error_msg} - ID: {emp_id}, Relationships: {relationships_str}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"emp_id": emp_id, "relationships": load_relationships, "original_error": str(e)})

    @log_execution_time()
    async def check_email_exists(
        self,
        db: AsyncSession, 
        email: str, 
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if email already exists with comprehensive logging."""
        context = build_log_context()
        
        sanitized_email = email.replace("@", "[at]") if email else "None"
        self.logger.debug(f"{context}REPO_CHECK_EMAIL_EXISTS: Checking email existence - Email: {sanitized_email}, Exclude ID: {exclude_id}")
        
        try:
            query = select(Employee).where(Employee.emp_email == email)
            
            if exclude_id:
                query = query.where(Employee.emp_id != exclude_id)
            
            result = await db.execute(query)
            exists = result.scalars().first() is not None
            
            self.logger.debug(f"{context}REPO_CHECK_EMAIL_EXISTS_SUCCESS: Email check completed - Email: {sanitized_email}, Exists: {exists}")
            return exists
            
        except Exception as e:
            error_msg = f"Error checking email existence"
            self.logger.error(f"{context}REPO_CHECK_EMAIL_EXISTS_ERROR: {error_msg} - Email: {sanitized_email}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"email": email, "exclude_id": exclude_id, "original_error": str(e)})

    @log_execution_time()
    async def validate_manager_exists(self, db: AsyncSession, manager_id: int) -> Optional[Employee]:
        """Get manager by ID for validation purposes with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_VALIDATE_MANAGER: Validating manager existence - Manager ID: {manager_id}")
        
        try:
            result = await db.execute(
                select(Employee).where(
                    and_(
                        Employee.emp_id == manager_id,
                        Employee.emp_status == True
                    )
                )
            )
            manager = result.scalars().first()
            
            if manager:
                self.logger.debug(f"{context}REPO_VALIDATE_MANAGER_SUCCESS: Valid manager found - ID: {manager_id}, Name: {manager.emp_name}")
            else:
                self.logger.debug(f"{context}REPO_VALIDATE_MANAGER_NOT_FOUND: Manager not found or inactive - ID: {manager_id}")
                
            return manager
            
        except Exception as e:
            error_msg = f"Error validating manager existence"
            self.logger.error(f"{context}REPO_VALIDATE_MANAGER_ERROR: {error_msg} - Manager ID: {manager_id}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"manager_id": manager_id, "original_error": str(e)})

    @log_execution_time()
    async def get_active_employees(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Employee]:
        """Get active employees for manager selection with comprehensive logging."""
        context = build_log_context()
        
        self.logger.debug(f"{context}REPO_GET_ACTIVE_EMPLOYEES: Getting active employees - Skip: {skip}, Limit: {limit}")
        
        try:
            query = (
                select(Employee)
                .where(Employee.emp_status == True)
                .order_by(Employee.emp_name)
                .offset(skip)
                .limit(limit)
            )
            
            result = await db.execute(query)
            employees = result.scalars().all()
            
            self.logger.debug(f"{context}REPO_GET_ACTIVE_EMPLOYEES_SUCCESS: Retrieved {len(employees)} active employees - Skip: {skip}, Limit: {limit}")
            return employees
            
        except Exception as e:
            error_msg = f"Error retrieving active employees"
            self.logger.error(f"{context}REPO_GET_ACTIVE_EMPLOYEES_ERROR: {error_msg} - Skip: {skip}, Limit: {limit}, Error: {str(e)}")
            raise RepositoryException(error_msg, details={"skip": skip, "limit": limit, "original_error": str(e)})
