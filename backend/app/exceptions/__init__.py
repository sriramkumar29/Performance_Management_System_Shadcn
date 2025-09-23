"""Custom exception classes for the application."""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception class for API errors."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class ValidationError(BaseAPIException):
    """Exception for validation errors."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            headers=headers
        )


class NotFoundError(BaseAPIException):
    """Exception for resource not found errors."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            headers=headers
        )


class ConflictError(BaseAPIException):
    """Exception for resource conflict errors."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            headers=headers
        )


class UnauthorizedError(BaseAPIException):
    """Exception for unauthorized access errors."""
    
    def __init__(self, detail: str = "Unauthorized", headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers=headers
        )


class ForbiddenError(BaseAPIException):
    """Exception for forbidden access errors."""
    
    def __init__(self, detail: str = "Forbidden", headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers=headers
        )


class BusinessLogicError(BaseAPIException):
    """Exception for business logic violations."""
    
    def __init__(self, detail: str, headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            headers=headers
        )


class InternalServerError(BaseAPIException):
    """Exception for internal server errors."""
    
    def __init__(self, detail: str = "Internal server error", headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            headers=headers
        )