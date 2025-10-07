"""
Logging utilities and decorators for the Performance Management System.

This module provides utility functions and decorators for consistent logging
across the application, including execution time tracking and exception logging.
"""

import logging
import time
import traceback
import uuid
from functools import wraps
from typing import Optional, Any, Callable, Dict
import inspect


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance."""
    if name is None:
        # Get the caller's module name
        frame = inspect.currentframe().f_back
        name = frame.f_globals.get('__name__', 'app')
    return logging.getLogger(name)


def get_request_logger() -> logging.Logger:
    """Get the request logger instance."""
    return logging.getLogger("app.requests")


def get_database_logger() -> logging.Logger:
    """Get the database logger instance."""
    return logging.getLogger("app.database")


def log_execution_time(logger: Optional[logging.Logger] = None, include_args: bool = False):
    """
    Decorator to log function execution time with enhanced context.
    
    Args:
        logger: Optional logger instance. If not provided, will create one.
        include_args: Whether to include function arguments in logs
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            log = logger or get_logger(func.__module__)
            start_time = time.time()
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Extract context information
            user_id = extract_user_id_from_args(*args, **kwargs)
            request_id = extract_request_id_from_args(*args, **kwargs)
            
            # Build context string
            context = build_log_context(user_id=user_id, request_id=request_id)
            
            # Log function start with context
            if include_args:
                safe_args = sanitize_log_data(str(args)[:200])
                safe_kwargs = sanitize_log_data(str(kwargs)[:200])
                log.debug(f"{context}Starting {func_name} with args: {safe_args}, kwargs: {safe_kwargs}")
            else:
                log.debug(f"{context}Starting {func_name}")
            
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                log.info(f"{context}{func_name} executed successfully in {execution_time:.4f} seconds")
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                log.error(f"{context}{func_name} failed after {execution_time:.4f} seconds: {str(e)}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            log = logger or get_logger(func.__module__)
            start_time = time.time()
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            log.debug(f"Starting execution of {func_name}")
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                log.info(f"{func_name} executed successfully in {execution_time:.4f} seconds")
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                log.error(f"{func_name} failed after {execution_time:.4f} seconds: {str(e)}")
                raise
        
        # Check if function is async
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def log_exception(logger: Optional[logging.Logger] = None, reraise: bool = True):
    """
    Decorator to log exceptions with full traceback.
    
    Args:
        logger: Optional logger instance. If not provided, will create one.
        reraise: Whether to reraise the exception after logging.
    """
    def decorator(func: Callable) -> Callable:
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            log = logger or get_logger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                log.error(
                    f"Exception in {func_name}: {str(e)}\n"
                    f"Traceback:\n{traceback.format_exc()}"
                )
                if reraise:
                    raise
                return None
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            log = logger or get_logger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            try:
                return func(*args, **kwargs)
            except Exception as e:
                log.error(
                    f"Exception in {func_name}: {str(e)}\n"
                    f"Traceback:\n{traceback.format_exc()}"
                )
                if reraise:
                    raise
                return None
        
        # Check if function is async
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def log_function_call(
    logger: Optional[logging.Logger] = None,
    log_args: bool = False,
    log_result: bool = False
):
    """
    Decorator to log function calls with optional arguments and results.
    
    Args:
        logger: Optional logger instance. If not provided, will create one.
        log_args: Whether to log function arguments.
        log_result: Whether to log function result.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            log = logger or get_logger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Log function call
            call_info = f"Calling {func_name}"
            if log_args:
                # Only log non-sensitive arguments
                safe_args = [str(arg)[:100] for arg in args[:3]]  # Limit to first 3 args and 100 chars
                safe_kwargs = {k: str(v)[:100] for k, v in list(kwargs.items())[:3]}
                call_info += f" with args: {safe_args}, kwargs: {safe_kwargs}"
            
            log.debug(call_info)
            
            try:
                result = await func(*args, **kwargs)
                
                if log_result:
                    result_str = str(result)[:200] if result is not None else "None"
                    log.debug(f"{func_name} returned: {result_str}")
                
                return result
            except Exception as e:
                log.error(f"{func_name} raised exception: {str(e)}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            log = logger or get_logger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Log function call
            call_info = f"Calling {func_name}"
            if log_args:
                # Only log non-sensitive arguments
                safe_args = [str(arg)[:100] for arg in args[:3]]  # Limit to first 3 args and 100 chars
                safe_kwargs = {k: str(v)[:100] for k, v in list(kwargs.items())[:3]}
                call_info += f" with args: {safe_args}, kwargs: {safe_kwargs}"
            
            log.debug(call_info)
            
            try:
                result = func(*args, **kwargs)
                
                if log_result:
                    result_str = str(result)[:200] if result is not None else "None"
                    log.debug(f"{func_name} returned: {result_str}")
                
                return result
            except Exception as e:
                log.error(f"{func_name} raised exception: {str(e)}")
                raise
        
        # Check if function is async
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def generate_request_id() -> str:
    """Generate a unique request ID."""
    return str(uuid.uuid4())


def log_database_operation(operation: str, table: str, logger: Optional[logging.Logger] = None):
    """
    Log database operations.
    
    Args:
        operation: Type of operation (CREATE, READ, UPDATE, DELETE)
        table: Table name
        logger: Optional logger instance
    """
    log = logger or get_database_logger()
    log.info(f"Database operation: {operation} on table: {table}")


def extract_user_id_from_args(*args, **kwargs) -> Optional[str]:
    """
    Extract user ID from function arguments for logging context.
    
    Args:
        *args: Function arguments
        **kwargs: Function keyword arguments
        
    Returns:
        Optional[str]: User ID if found
    """
    # Look for common user ID patterns in kwargs
    user_fields = ['user_id', 'emp_id', 'current_user']
    
    for field in user_fields:
        if field in kwargs:
            user_obj = kwargs[field]
            if hasattr(user_obj, 'emp_id'):
                return str(user_obj.emp_id)
            elif hasattr(user_obj, 'id'):
                return str(user_obj.id)
            elif isinstance(user_obj, (int, str)):
                return str(user_obj)
    
    # Look in positional arguments for user objects
    for arg in args:
        if hasattr(arg, 'emp_id'):
            return str(arg.emp_id)
        elif hasattr(arg, 'id') and hasattr(arg, '__class__') and 'employee' in arg.__class__.__name__.lower():
            return str(arg.id)
    
    return None


def extract_request_id_from_args(*args, **kwargs) -> Optional[str]:
    """
    Extract request ID from function arguments for logging context.
    
    Args:
        *args: Function arguments  
        **kwargs: Function keyword arguments
        
    Returns:
        Optional[str]: Request ID if found
    """
    # Look for request objects in arguments
    for arg in args:
        if hasattr(arg, 'state') and hasattr(arg.state, 'request_id'):
            return str(arg.state.request_id)
        elif hasattr(arg, 'headers') and 'x-request-id' in getattr(arg, 'headers', {}):
            return str(arg.headers['x-request-id'])
    
    # Look in kwargs
    if 'request_id' in kwargs:
        return str(kwargs['request_id'])
    
    return None


def build_log_context(user_id: Optional[str] = None, request_id: Optional[str] = None, 
                     additional_context: Optional[Dict[str, str]] = None) -> str:
    """
    Build a standardized log context string.
    
    Args:
        user_id: User ID for the operation
        request_id: Request ID for the operation
        additional_context: Additional context information
        
    Returns:
        str: Formatted context string for logging
    """
    context_parts = []
    
    if request_id:
        context_parts.append(f"RequestID:{request_id}")
    
    if user_id:
        context_parts.append(f"UserID:{user_id}")
    
    if additional_context:
        for key, value in additional_context.items():
            context_parts.append(f"{key}:{value}")
    
    if context_parts:
        return f"[{' | '.join(context_parts)}] "
    
    return ""


def log_business_operation(operation: str, entity_type: str, entity_id: Any = None, 
                          user_id: Optional[str] = None, logger: Optional[logging.Logger] = None):
    """
    Log business operations with standardized format.
    
    Args:
        operation: Type of operation (CREATE, UPDATE, DELETE, etc.)
        entity_type: Type of entity being operated on
        entity_id: ID of the entity (if applicable)
        user_id: ID of the user performing the operation
        logger: Logger instance
    """
    log = logger or get_logger("app.business")
    
    context = build_log_context(user_id=user_id)
    entity_info = f"{entity_type}"
    if entity_id:
        entity_info += f" ID:{entity_id}"
    
    log.info(f"{context}BUSINESS_OPERATION: {operation} {entity_info}")


def sanitize_log_data(data: Any, max_length: int = 200) -> str:
    """
    Sanitize data for logging by removing sensitive information and limiting length.
    
    Args:
        data: Data to sanitize
        max_length: Maximum length of the sanitized string
        
    Returns:
        str: Sanitized string representation of the data
    """
    if data is None:
        return "None"
    
    # Convert to string
    data_str = str(data)
    
    # Remove potential sensitive information patterns
    sensitive_patterns = [
        'password', 'token', 'secret', 'key', 'auth',
        'credential', 'session', 'cookie'
    ]
    
    # Simple sanitization - replace sensitive values
    for pattern in sensitive_patterns:
        if pattern.lower() in data_str.lower():
            data_str = data_str.replace(str(data), "[REDACTED]")
            break
    
    # Limit length
    if len(data_str) > max_length:
        data_str = data_str[:max_length] + "..."
    
    return data_str