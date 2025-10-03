"""
Custom exceptions for the Performance Management System.

This module defines application-specific exceptions to improve error handling
and maintain consistency across the application.
"""

from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class BaseCustomException(HTTPException):
    """Base class for all custom exceptions."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class ValidationError(BaseCustomException):
    """Raised when validation fails."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            headers=headers
        )


class NotFoundError(BaseCustomException):
    """Raised when a resource is not found."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            headers=headers
        )


class ConflictError(BaseCustomException):
    """Raised when there's a conflict with existing data."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            headers=headers
        )


class UnauthorizedError(BaseCustomException):
    """Raised when authentication fails."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers=headers
        )


class ForbiddenError(BaseCustomException):
    """Raised when authorization fails."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers=headers
        )


class BadRequestError(BaseCustomException):
    """Raised when request is malformed or contains invalid data."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            headers=headers
        )


class InternalServerError(BaseCustomException):
    """Raised when an internal server error occurs."""
    
    def __init__(self, detail: str = "Internal server error", headers: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            headers=headers
        )


# Specific business logic exceptions
class WeightageValidationError(ValidationError):
    """Raised when goal weightage validation fails."""
    
    def __init__(self, total_weightage: float) -> None:
        super().__init__(f"Total weightage must be 100%, but got {total_weightage}%")


class StatusTransitionError(BadRequestError):
    """Raised when invalid status transition is attempted."""
    
    def __init__(self, current_status: str, new_status: str) -> None:
        super().__init__(f"Invalid status transition from {current_status} to {new_status}")


class EntityNotFoundError(NotFoundError):
    """Raised when a specific entity is not found."""
    
    def __init__(self, entity_name: str, entity_id: Optional[int] = None) -> None:
        if entity_id:
            detail = f"{entity_name} with ID {entity_id} not found"
        else:
            detail = f"{entity_name} not found"
        super().__init__(detail)


class DuplicateEntityError(ConflictError):
    """Raised when trying to create a duplicate entity."""
    
    def __init__(self, entity_name: str, field_name: str = "name") -> None:
        super().__init__(f"{entity_name} with this {field_name} already exists")


# Additional service-specific exceptions
class BaseServiceException(InternalServerError):
    """Base exception for service layer errors."""
    
    def __init__(self, detail: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(detail)
        self.details = details


class UnauthorizedActionError(UnauthorizedError):
    """Raised when an unauthorized action is attempted."""
    
    def __init__(self, detail: str = "Unauthorized action") -> None:
        super().__init__(detail)


class TokenError(UnauthorizedError):
    """Raised when token operations fail."""
    
    def __init__(self, detail: str = "Token error") -> None:
        super().__init__(detail)


class DuplicateResourceError(ConflictError):
    """Raised when trying to create a duplicate resource."""
    
    def __init__(self, detail: str) -> None:
        super().__init__(detail)


class BaseRepositoryException(InternalServerError):
    """Base exception for repository layer errors."""
    
    def __init__(self, detail: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(detail)
        self.details = details


class BusinessRuleViolationError(BadRequestError):
    """Raised when business rules are violated."""
    
    def __init__(self, detail: str) -> None:
        super().__init__(detail)