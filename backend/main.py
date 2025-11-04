"""
Main FastAPI application for the Performance Management System.

This module sets up the FastAPI application with proper middleware,
exception handling, routing, and static file serving.
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import os
from pathlib import Path
from starlette.requests import Request
from starlette.responses import HTMLResponse
from starlette.exceptions import HTTPException
from dotenv import load_dotenv

# Load environment variables from .env file BEFORE anything else
env_file = f".env.{os.getenv('APP_ENV', 'development')}"
if not os.path.exists(env_file):
    env_file = ".env.development"
load_dotenv(env_file, override=True)

from app.core.logging_config import setup_logging, get_logger
from app.utils.logger import log_exception
from app.db.database import engine, Base
from app.routers import employees, appraisals, goals, appraisal_types, appraisal_goals, frontend_serve, roles, auth_router, goal_template_headers, microsoft_auth, application_roles
from app.core.config import settings
from app.core.exception_handlers import setup_exception_handlers
from app.db.database import init_db, close_db
from app.middleware.cors import setup_cors
from app.middleware.request_logger import log_requests_middleware
from app.constants import (
    NOT_FOUND, UNAUTHORIZED_HTTP, FORBIDDEN, VALIDATION_ERROR,
    FILE_NOT_FOUND, API_ENDPOINT_NOT_FOUND, ROUTE_NOT_FOUND,
    FRONTEND_NOT_FOUND, API_RUNNING_FRONTEND_NOT_FOUND
)

# Setup logging after loading .env file
setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
@log_exception(logger)
async def lifespan(app: FastAPI):
    """Application lifespan manager with logging."""
    logger.info("Application startup initiated")
    
    try:
        await init_db()
        logger.info("Database initialization completed successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise
    
    logger.info("Application startup completed")
    yield
    
    logger.info("Application shutdown initiated")
    try:
        await close_db()
        logger.info("Database connections closed successfully")
    except Exception as e:
        logger.error(f"Error during database cleanup: {str(e)}")
    
    logger.info("Application shutdown completed")


app = FastAPI(
    title="Performance Appraisal Management System",
    description="""
    A comprehensive REST API for managing employee performance appraisals.
    
    Features:
    - Employee management with role-based access
    - Goal setting and tracking
    - Multi-stage appraisal workflow
    - JWT-based authentication
    - Comprehensive validation and error handling
    """,
    version="1.0.0",
    lifespan=lifespan,
    root_path=settings.BASE_PATH if settings.BASE_PATH != "/" else "",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Set up global exception handlers
setup_exception_handlers(app)

# Configure CORS middleware
setup_cors(app)

# Request logging middleware for debugging
# Place request logging AFTER CORS middleware so that CORS headers are
# always added to responses even if logging middleware raises an error.
app.middleware("http")(log_requests_middleware)

# Include API routers with proper versioning and organization
api_prefix = "/api"

app.include_router(
    employees.router, 
    prefix=f"{api_prefix}/employees", 
    tags=["Authentication & Employees"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        403: {"description": FORBIDDEN},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    appraisals.router, 
    prefix=f"{api_prefix}/appraisals", 
    tags=["Appraisals"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    appraisal_goals.router, 
    prefix=f"{api_prefix}/appraisals", 
    tags=["Appraisal Goals"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    goals.router, 
    prefix=f"{api_prefix}/goals", 
    tags=["Goals & Templates"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    appraisal_types.router,
    prefix=f"{api_prefix}/appraisal-types",
    tags=["Appraisal Types"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    roles.router,
    prefix=f"{api_prefix}/roles",
    tags=["Roles"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    goal_template_headers.router,
    prefix=f"{api_prefix}/goal-template-headers",
    tags=["Goal Template Headers"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    application_roles.router,
    prefix=f"{api_prefix}/application-roles",
    tags=["Application Roles"],
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    auth_router.router,
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        403: {"description": FORBIDDEN},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    microsoft_auth.router,
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        403: {"description": FORBIDDEN},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    }
)

app.include_router(
    frontend_serve.router, 
    tags=["Frontend Serve"], 
    responses={
        401: {"description": UNAUTHORIZED_HTTP},
        404: {"description": NOT_FOUND},
        422: {"description": VALIDATION_ERROR}
    })

# Health check and API info endpoints
@app.get("/health", tags=["System"], summary="Health Check")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        dict: System health status and information
    """
    return {
        "status": "healthy",
        "service": "Performance Management System API",
        "version": "1.0.0",
        "timestamp": "2025-01-01T00:00:00Z"
    }


@app.get(f"{api_prefix}/info", tags=["System"], summary="API Information")
async def api_info():
    """
    Get API information and available endpoints.
    
    Returns:
        dict: API information and metadata
    """
    return {
        "name": "Performance Management System API",
        "version": "1.0.0",
        "description": "REST API for managing employee performance appraisals",
        "features": [
            "JWT Authentication",
            "Role-based Access Control",
            "Comprehensive Validation",
            "Multi-stage Appraisal Workflow",
            "Goal Management",
            "Employee Management"
        ],
        "endpoints": {
            "authentication": "/api/employees/login",
            "employees": "/api/employees",
            "appraisals": "/api/appraisals",
            "goals": "/api/goals",
            "templates": "/api/goals/templates",
            "appraisal-types": "/api/appraisal-types"
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        }
    }
