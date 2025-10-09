"""
Logging configuration for the Performance Management System.

This module provides centralized logging configuration with multiple handlers,
formatters, and log levels for different components of the application.
"""

import logging
import logging.config
import os
from pathlib import Path
from typing import Dict, Any
import sys


def setup_logging() -> None:
    """
    Setup logging configuration for the application.
    Reads LOGGING_ENABLED, LOG_LEVEL, LOG_TO_CONSOLE, and LOG_TO_FILE from environment variables.
    """
    
    # Check if logging is enabled via environment variable
    logging_enabled = os.getenv("LOGGING_ENABLED", "true").lower() in ("true", "1", "yes")
    
    if not logging_enabled:
        # Disable all logging
        logging.disable(logging.CRITICAL)
        print("⚠️  Logging is DISABLED via environment variable")
        return
    
    # Enable logging (in case it was previously disabled)
    logging.disable(logging.NOTSET)
    
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Get log level from environment or default to INFO
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Get console and file logging preferences
    log_to_console = os.getenv("LOG_TO_CONSOLE", "true").lower() in ("true", "1", "yes")
    log_to_file = os.getenv("LOG_TO_FILE", "true").lower() in ("true", "1", "yes")
    
    # Build handlers list dynamically
    app_handlers = []
    if log_to_console:
        app_handlers.append("console")
    if log_to_file:
        app_handlers.extend(["file", "error_file"])
    
    # If no handlers specified, default to console
    if not app_handlers:
        app_handlers = ["console"]
        print("⚠️  No logging handlers specified, defaulting to console only")
    
    # Build handlers for different loggers
    request_handlers = []
    if log_to_file:
        request_handlers.append("request_file")
    if log_to_console:
        request_handlers.append("console")
    if not request_handlers:
        request_handlers = ["console"]
    
    database_handlers = []
    if log_to_file:
        database_handlers.extend(["database_file", "file"])
    if log_to_console:
        database_handlers.append("console")
    if not database_handlers:
        database_handlers = ["console"]
    
    uvicorn_handlers = []
    if log_to_console:
        uvicorn_handlers.append("console")
    if log_to_file:
        uvicorn_handlers.append("file")
    if not uvicorn_handlers:
        uvicorn_handlers = ["console"]
    
    uvicorn_access_handlers = []
    if log_to_file:
        uvicorn_access_handlers.append("request_file")
    elif log_to_console:
        uvicorn_access_handlers.append("console")
    else:
        uvicorn_access_handlers = ["console"]
    
    sqlalchemy_handlers = []
    if log_to_file:
        sqlalchemy_handlers.append("database_file")
    elif log_to_console:
        sqlalchemy_handlers.append("console")
    else:
        sqlalchemy_handlers = ["console"]
    
    # Logging configuration
    LOGGING_CONFIG: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "simple": {
                "format": "%(levelname)s - %(message)s"
            },
            "json": {
                "format": '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "module": "%(module)s", "function": "%(funcName)s", "line": %(lineno)d}',
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "request": {
                "format": "%(asctime)s - REQUEST - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO",
                "formatter": "detailed",
                "stream": "ext://sys.stdout"
            },
            "file": {
                "class": "logging.FileHandler",
                "level": "DEBUG",
                "formatter": "detailed",
                "filename": "logs/app.log",
                "mode": "w",  # Overwrite on each restart
                "encoding": "utf-8"
            },
            "error_file": {
                "class": "logging.FileHandler",
                "level": "ERROR",
                "formatter": "json",
                "filename": "logs/errors.log",
                "mode": "w",  # Overwrite on each restart
                "encoding": "utf-8"
            },
            "request_file": {
                "class": "logging.FileHandler",
                "level": "INFO",
                "formatter": "request",
                "filename": "logs/requests.log",
                "mode": "w",  # Overwrite on each restart
                "encoding": "utf-8"
            },
            "database_file": {
                "class": "logging.FileHandler",
                "level": "DEBUG",
                "formatter": "detailed",
                "filename": "logs/database.log",
                "mode": "w",  # Overwrite on each restart
                "encoding": "utf-8"
            }
        },
        "loggers": {
            "app": {
                "level": log_level,
                "handlers": app_handlers,
                "propagate": False
            },
            "app.requests": {
                "level": "INFO",
                "handlers": request_handlers,
                "propagate": False
            },
            "app.database": {
                "level": "DEBUG",
                "handlers": database_handlers,
                "propagate": False
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": uvicorn_handlers,
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": uvicorn_access_handlers,
                "propagate": False
            },
            "sqlalchemy.engine": {
                "level": "WARNING",
                "handlers": sqlalchemy_handlers,
                "propagate": False
            },
            "sqlalchemy.pool": {
                "level": "WARNING",
                "handlers": sqlalchemy_handlers,
                "propagate": False
            }
        },
        "root": {
            "level": "INFO",
            "handlers": app_handlers
        }
    }
    
    # Configure logging
    try:
        logging.config.dictConfig(LOGGING_CONFIG)
        
        # Print status message
        output_modes = []
        if log_to_console:
            output_modes.append("CONSOLE")
        if log_to_file:
            output_modes.append("FILES")
        
        print(f"✅ Logging ENABLED successfully.")
        print(f"   📊 Log level: {log_level}")
        print(f"   📍 Output: {' + '.join(output_modes)}")
    except Exception as e:
        print(f"Failed to configure logging: {e}")
        # Fallback to basic configuration
        logging.basicConfig(
            level=getattr(logging, log_level, logging.INFO),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler("logs/fallback.log", encoding="utf-8")
            ]
        )


def get_logger(name: str = "app") -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Logger name (default: "app")
        
    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)