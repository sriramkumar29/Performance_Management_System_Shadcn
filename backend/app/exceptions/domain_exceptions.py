"""
Domain-specific exceptions for the Performance Management System.

This module defines exceptions for different layers following best practices:
- Repository layer: Database-related exceptions
- Service layer: Business logic exceptions  
- Router layer: HTTP exceptions

This ensures proper separation of concerns and traceability.
"""

from typing import Any, Dict, Optional
from sqlalchemy.exc import IntegrityError, NoResultFound
from fastapi import status


# =============================================================================
# BASE EXCEPTIONS
# =============================================================================

class BaseDomainException(Exception):
    """Base class for all domain exceptions."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class BaseRepositoryException(BaseDomainException):
    """Base class for repository layer exceptions."""
    pass


class BaseServiceException(BaseDomainException):
    """Base class for service layer exceptions."""
    pass


# =============================================================================
# REPOSITORY LAYER EXCEPTIONS (Database-related)
# =============================================================================

class DatabaseError(BaseRepositoryException):
    """General database operation error."""
    pass


class DuplicateEntryError(BaseRepositoryException):
    """Raised when trying to create a duplicate entry."""
    
    def __init__(self, entity_type: str, field: str, value: str):
        message = f"Duplicate {entity_type}: {field} '{value}' already exists"
        details = {"entity_type": entity_type, "field": field, "value": value}
        super().__init__(message, details)


class EntityNotFoundError(BaseRepositoryException):
    """Raised when an entity is not found in the database."""
    
    def __init__(self, entity_type: str, entity_id: Any):
        message = f"{entity_type} with ID '{entity_id}' not found"
        details = {"entity_type": entity_type, "entity_id": entity_id}
        super().__init__(message, details)


class DatabaseConnectionError(BaseRepositoryException):
    """Raised when database connection fails."""
    
    def __init__(self, operation: str):
        message = f"Database connection failed during {operation}"
        details = {"operation": operation}
        super().__init__(message, details)


class ConstraintViolationError(BaseRepositoryException):
    """Raised when database constraints are violated."""
    
    def __init__(self, constraint: str, details_msg: str = ""):
        message = f"Database constraint violation: {constraint}"
        if details_msg:
            message += f" - {details_msg}"
        details = {"constraint": constraint, "details": details_msg}
        super().__init__(message, details)


class RepositoryException(BaseRepositoryException):
    """General repository operation error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)


# =============================================================================
# SERVICE LAYER EXCEPTIONS (Business logic)
# =============================================================================

class BusinessRuleViolationError(BaseServiceException):
    """Raised when business rules are violated."""
    pass


class UnauthorizedActionError(BaseServiceException):
    """Raised when user is not authorized to perform an action."""
    
    def __init__(self, user_id: int, action: str, resource: str):
        message = f"User {user_id} is not authorized to {action} {resource}"
        details = {"user_id": user_id, "action": action, "resource": resource}
        super().__init__(message, details)


class GoalServiceError(BaseServiceException):
    """Base exception for goal-related business logic errors."""
    pass


class GoalAlreadyExistsError(GoalServiceError):
    """Raised when trying to create a goal that already exists."""
    
    def __init__(self, employee_id: int, goal_title: str):
        message = f"Goal '{goal_title}' already exists for employee {employee_id}"
        details = {"employee_id": employee_id, "goal_title": goal_title}
        super().__init__(message, details)


class InvalidGoalStatusError(GoalServiceError):
    """Raised when trying to set an invalid goal status."""
    
    def __init__(self, current_status: str, target_status: str):
        message = f"Cannot change goal status from '{current_status}' to '{target_status}'"
        details = {"current_status": current_status, "target_status": target_status}
        super().__init__(message, details)


class EmployeeServiceError(BaseServiceException):
    """Base exception for employee-related business logic errors."""
    pass


class EmployeeNotFoundError(EmployeeServiceError):
    """Raised when employee is not found."""
    
    def __init__(self, employee_id: int = None, email: str = None):
        if employee_id:
            message = f"Employee with ID {employee_id} not found"
            details = {"employee_id": employee_id}
        elif email:
            message = f"Employee with email {email} not found"
            details = {"email": email}
        else:
            message = "Employee not found"
            details = {}
        super().__init__(message, details)


class EmployeeNotActiveError(EmployeeServiceError):
    """Raised when trying to perform operations on inactive employee."""
    
    def __init__(self, employee_id: int):
        message = f"Employee {employee_id} is not active"
        details = {"employee_id": employee_id}
        super().__init__(message, details)


class AppraisalServiceError(BaseServiceException):
    """Base exception for appraisal-related business logic errors."""
    pass


class AppraisalPeriodClosedError(AppraisalServiceError):
    """Raised when trying to modify closed appraisal period."""
    
    def __init__(self, appraisal_id: int, period: str):
        message = f"Appraisal {appraisal_id} for period '{period}' is closed for modifications"
        details = {"appraisal_id": appraisal_id, "period": period}
        super().__init__(message, details)


class ValidationError(BaseServiceException):
    """Raised when data validation fails."""
    
    def __init__(self, field: str, value: Any, reason: str):
        message = f"Validation failed for field '{field}': {reason}"
        details = {"field": field, "value": str(value), "reason": reason}
        super().__init__(message, details)


# =============================================================================
# UTILITY FUNCTIONS FOR EXCEPTION CONVERSION
# =============================================================================

def convert_sqlalchemy_error(error: Exception, entity_type: str = "Entity") -> BaseRepositoryException:
    """
    Convert SQLAlchemy exceptions to domain exceptions.
    
    Args:
        error: SQLAlchemy exception
        entity_type: Type of entity being operated on
        
    Returns:
        BaseRepositoryException: Appropriate domain exception
    """
    if isinstance(error, IntegrityError):
        if "UNIQUE constraint failed" in str(error) or "duplicate key" in str(error).lower():
            return DuplicateEntryError(entity_type, "field", "value")
        else:
            return ConstraintViolationError("integrity_constraint", str(error))
    
    elif isinstance(error, NoResultFound):
        return EntityNotFoundError(entity_type, "unknown")
    
    else:
        return DatabaseError(f"Database operation failed: {str(error)}")


def map_domain_exception_to_http_status(exception: BaseDomainException) -> int:
    """
    Map domain exceptions to appropriate HTTP status codes.
    
    Args:
        exception: Domain exception
        
    Returns:
        int: HTTP status code
    """
    exception_status_map = {
        # Repository exceptions
        EntityNotFoundError: status.HTTP_404_NOT_FOUND,
        DuplicateEntryError: status.HTTP_409_CONFLICT,
        DatabaseConnectionError: status.HTTP_503_SERVICE_UNAVAILABLE,
        ConstraintViolationError: status.HTTP_400_BAD_REQUEST,
        DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        
        # Service exceptions
        UnauthorizedActionError: status.HTTP_403_FORBIDDEN,
        ValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        BusinessRuleViolationError: status.HTTP_400_BAD_REQUEST,
        
        # Specific business exceptions
        GoalAlreadyExistsError: status.HTTP_409_CONFLICT,
        InvalidGoalStatusError: status.HTTP_400_BAD_REQUEST,
        EmployeeNotFoundError: status.HTTP_404_NOT_FOUND,
        EmployeeNotActiveError: status.HTTP_400_BAD_REQUEST,
        AppraisalPeriodClosedError: status.HTTP_400_BAD_REQUEST,
    }
    
    return exception_status_map.get(type(exception), status.HTTP_500_INTERNAL_SERVER_ERROR)