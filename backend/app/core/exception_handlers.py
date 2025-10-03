"""
Global exception handlers for the Performance Management System.

This module provides centralized exception handling for the FastAPI application
to ensure consistent error responses and proper logging.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
from typing import Union

from app.exceptions import (
    BaseCustomException,
    ValidationError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
    BadRequestError,
    InternalServerError
)
from app.utils.logger import get_logger, build_log_context, sanitize_log_data

logger = get_logger(__name__)


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Set up global exception handlers for the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    context = build_log_context()
    logger.info(f"{context}EXCEPTION_HANDLERS_SETUP: Initializing global exception handlers")
    
    @app.exception_handler(BaseCustomException)
    async def custom_exception_handler(
        request: Request, 
        exc: BaseCustomException
    ) -> JSONResponse:
        """Handle custom application exceptions."""
        request_id = getattr(request.state, 'request_id', 'unknown')
        context = build_log_context(request_id=request_id)
        
        logger.warning(
            f"{context}CUSTOM_EXCEPTION: {exc.__class__.__name__} - "
            f"Message: {sanitize_log_data(exc.detail)} | "
            f"Path: {sanitize_log_data(request.url.path)} | "
            f"Method: {request.method} | "
            f"Status: {exc.status_code}"
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": exc.__class__.__name__,
                    "message": exc.detail,
                    "status_code": exc.status_code,
                    "request_id": request_id
                }
            },
            headers=exc.headers
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, 
        exc: StarletteHTTPException
    ) -> JSONResponse:
        """Handle HTTP exceptions."""
        request_id = getattr(request.state, 'request_id', 'unknown')
        context = build_log_context(request_id=request_id)
        
        logger.warning(
            f"{context}HTTP_EXCEPTION: Status {exc.status_code} - "
            f"Message: {sanitize_log_data(str(exc.detail))} | "
            f"Path: {sanitize_log_data(request.url.path)} | "
            f"Method: {request.method}"
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "HTTPException",
                    "message": exc.detail,
                    "status_code": exc.status_code,
                    "request_id": request_id
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, 
        exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors."""
        request_id = getattr(request.state, 'request_id', 'unknown')
        context = build_log_context(request_id=request_id)
        
        logger.warning(
            f"{context}VALIDATION_ERROR: Request validation failed - "
            f"Errors: {sanitize_log_data(str(exc.errors()))} | "
            f"Path: {sanitize_log_data(request.url.path)} | "
            f"Method: {request.method}"
        )
        
        # Format validation errors for better readability
        errors = []
        for error in exc.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            
            # Enhance error messages for common ID validation issues
            message = error["msg"]
            if error["type"] == "int_parsing" and any(id_field in field_path for id_field in ["employee_id", "appraisal_id", "goal_id"]):
                message = f"The provided value is not a valid integer. Please provide a numeric ID (e.g., 1, 2, 3). Original error: {message}"
            elif error["type"] == "greater_than" and "id" in field_path.lower():
                message = f"ID must be a positive integer greater than 0. Original error: {message}"
            
            errors.append({
                "field": field_path,
                "message": message,
                "type": error["type"]
            })
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "type": "ValidationError",
                    "message": "Request validation failed",
                    "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "details": errors
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request, 
        exc: Exception
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        request_id = getattr(request.state, 'request_id', 'unknown')
        context = build_log_context(request_id=request_id)
        
        logger.error(
            f"{context}UNEXPECTED_ERROR: {exc.__class__.__name__} - "
            f"Message: {sanitize_log_data(str(exc))} | "
            f"Path: {sanitize_log_data(request.url.path)} | "
            f"Method: {request.method}"
        )
        logger.debug(f"{context}UNEXPECTED_ERROR_TRACEBACK: {traceback.format_exc()}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "type": "InternalServerError",
                    "message": "An unexpected error occurred",
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "request_id": request_id
                }
            }
        )
    
    # Log successful setup completion
    logger.info(f"{context}EXCEPTION_HANDLERS_COMPLETE: Global exception handlers configured successfully")


# Utility functions for consistent error responses
def create_error_response(
    error_type: str,
    message: str,
    status_code: int,
    details: Union[dict, list] = None
) -> dict:
    """
    Create a standardized error response.
    
    Args:
        error_type: Type of error
        message: Error message
        status_code: HTTP status code
        details: Additional error details
        
    Returns:
        dict: Standardized error response
    """
    response = {
        "error": {
            "type": error_type,
            "message": message,
            "status_code": status_code
        }
    }
    
    if details:
        response["error"]["details"] = details
    
    return response