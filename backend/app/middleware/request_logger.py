"""
Enhanced request logging middleware for the Performance Management System.

This module provides comprehensive request/response logging with request tracking,
performance monitoring, and error capturing.
"""

import time
import uuid
import traceback
from typing import Callable
from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.logger import get_request_logger, get_logger, sanitize_log_data

logger = get_logger(__name__)
request_logger = get_request_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Enhanced request logging middleware with comprehensive tracking."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with comprehensive logging.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            Response: HTTP response
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Capture request start time
        start_time = time.time()
        
        # Extract request information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log request start
        request_logger.info(
            f"REQUEST_START - ID: {request_id} | "
            f"Method: {request.method} | "
            f"URL: {request.url} | "
            f"Client IP: {client_ip} | "
            f"User-Agent: {sanitize_log_data(user_agent, 100)}"
        )
        
        # Log path parameters if present
        if request.path_params:
            request_logger.debug(
                f"REQUEST_PARAMS - ID: {request_id} | "
                f"Path params: {sanitize_log_data(request.path_params)}"
            )
        
        # Log query parameters if present
        if request.query_params:
            request_logger.debug(
                f"REQUEST_QUERY - ID: {request_id} | "
                f"Query params: {sanitize_log_data(dict(request.query_params))}"
            )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log successful response
            request_logger.info(
                f"REQUEST_SUCCESS - ID: {request_id} | "
                f"Status: {response.status_code} | "
                f"Duration: {process_time:.4f}s"
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            
            return response
            
        except Exception as e:
            # Calculate processing time for failed requests
            process_time = time.time() - start_time
            
            # Log request failure
            request_logger.error(
                f"REQUEST_ERROR - ID: {request_id} | "
                f"Error: {str(e)} | "
                f"Duration: {process_time:.4f}s | "
                f"Traceback: {traceback.format_exc()}"
            )
            
            # Re-raise the exception
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.
        
        Args:
            request: HTTP request
            
        Returns:
            str: Client IP address
        """
        # Check for forwarded headers (for proxy setups)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"


# Keep the original function for backward compatibility
async def log_requests_middleware(request: Request, call_next):
    """
    Legacy request logging middleware function.
    
    This function maintains backward compatibility while using the new
    enhanced logging middleware internally.
    """
    middleware = RequestLoggingMiddleware(None)
    return await middleware.dispatch(request, call_next)
