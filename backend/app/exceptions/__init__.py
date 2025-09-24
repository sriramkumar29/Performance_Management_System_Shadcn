"""
Exception module for the Performance Management System.
"""

from .custom_exceptions import (
    BaseCustomException,
    ValidationError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
    BadRequestError,
    InternalServerError,
    WeightageValidationError,
    StatusTransitionError,
    EntityNotFoundError,
    DuplicateEntityError,
)

__all__ = [
    "BaseCustomException",
    "ValidationError",
    "NotFoundError",
    "ConflictError",
    "UnauthorizedError",
    "ForbiddenError",
    "BadRequestError",
    "InternalServerError",
    "WeightageValidationError",
    "StatusTransitionError",
    "EntityNotFoundError",
    "DuplicateEntityError",
]