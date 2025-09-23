"""Validation decorators for request/response handling."""

from functools import wraps
from typing import Any, Callable, Type, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError
from app.exceptions import ValidationError as CustomValidationError


def validate_request(schema: Type[BaseModel]):
    """Decorator to validate request data against a Pydantic schema."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find the request data in kwargs
            for key, value in kwargs.items():
                if isinstance(value, dict) or hasattr(value, '__dict__'):
                    try:
                        # Try to validate the data
                        validated_data = schema(**value) if isinstance(value, dict) else schema(**value.__dict__)
                        kwargs[key] = validated_data
                        break
                    except ValidationError as e:
                        raise CustomValidationError(
                            detail=f"Request validation failed: {str(e)}"
                        )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def validate_response(schema: Type[BaseModel]):
    """Decorator to validate response data against a Pydantic schema."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            try:
                # Validate response data
                if isinstance(result, list):
                    # Handle list responses
                    validated_result = [schema(**item.__dict__ if hasattr(item, '__dict__') else item) for item in result]
                else:
                    # Handle single object responses
                    validated_result = schema(**result.__dict__ if hasattr(result, '__dict__') else result)
                
                return validated_result
            except ValidationError as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Response validation failed: {str(e)}"
                )
        
        return wrapper
    return decorator


def handle_validation_errors(func: Callable) -> Callable:
    """Decorator to handle Pydantic validation errors."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ValidationError as e:
            # Convert Pydantic validation errors to custom format
            error_details = []
            for error in e.errors():
                field = " -> ".join(str(loc) for loc in error["loc"])
                message = error["msg"]
                error_details.append(f"{field}: {message}")
            
            raise CustomValidationError(
                detail=f"Validation failed: {'; '.join(error_details)}"
            )
    
    return wrapper


def require_fields(*required_fields: str):
    """Decorator to ensure required fields are present in request data."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Check if any of the kwargs contain the required fields
            for key, value in kwargs.items():
                data = _extract_data(value)
                if data is None:
                    continue
                
                missing_fields = _find_missing_fields(data, required_fields)
                if missing_fields:
                    raise CustomValidationError(
                        detail=f"Missing required fields: {', '.join(missing_fields)}"
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def _extract_data(value: Any) -> Optional[dict]:
    """Extract data from a value if it's a dict or has __dict__."""
    if hasattr(value, '__dict__'):
        return value.__dict__
    elif isinstance(value, dict):
        return value
    return None


def _find_missing_fields(data: dict, required_fields: tuple) -> list:
    """Find missing required fields in data."""
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    return missing_fields


def validate_pagination(max_limit: int = 100):
    """Decorator to validate pagination parameters."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            skip = kwargs.get('skip', 0)
            limit = kwargs.get('limit', 20)
            
            if skip < 0:
                raise CustomValidationError(detail="Skip must be non-negative")
            
            if limit <= 0:
                raise CustomValidationError(detail="Limit must be positive")
            
            if limit > max_limit:
                raise CustomValidationError(detail=f"Limit cannot exceed {max_limit}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator