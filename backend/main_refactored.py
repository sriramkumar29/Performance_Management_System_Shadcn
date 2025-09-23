"""Updated main application with improved architecture."""

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
import logging

from app.db.database import engine, Base
from app.core.config import settings
from app.middleware import ErrorHandlingMiddleware, RequestLoggingMiddleware, SecurityHeadersMiddleware

# Import both old and new routers for gradual migration
from app.routers import employees, appraisals, goals, appraisal_types, appraisal_goals
from app.routers.employees_refactored import router as employees_v2_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Clean up resources on shutdown
    await engine.dispose()

app = FastAPI(
    title="Performance Appraisal Management System",
    description="API for managing employee performance appraisals",
    version="2.0.0",
    lifespan=lifespan,
    root_path=settings.BASE_PATH if settings.BASE_PATH != "/" else ""
)

# Add custom middleware (order matters - last added is executed first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlingMiddleware)

# Configure CORS using settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Total-Count", "X-Process-Time"],
)

# API Routes - V2 (Refactored with Services)
app.include_router(employees_v2_router, prefix="/api/v2/employees", tags=["Employees V2"])

# API Routes - V1 (Legacy - for backward compatibility)
app.include_router(employees.router, prefix="/api/employees", tags=["Employees V1 (Legacy)"])
app.include_router(appraisals.router, prefix="/api/appraisals", tags=["Appraisals"])
app.include_router(appraisal_goals.router, prefix="/api/appraisals", tags=["Appraisal Goals"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(appraisal_types.router, prefix="/api/appraisal-types", tags=["Appraisal Types"])

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": "2025-09-23T00:00:00Z"
    }

# API info endpoint
@app.get("/api/info", tags=["Info"])
async def api_info():
    """API information endpoint."""
    return {
        "title": "Performance Appraisal Management System",
        "version": "2.0.0",
        "description": "RESTful API following best practices",
        "features": {
            "service_layer": True,
            "dependency_injection": True,
            "request_validation": True,
            "error_handling": True,
            "security_headers": True,
            "request_logging": True
        },
        "endpoints": {
            "v1": "/api/",
            "v2": "/api/v2/",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }

# Define the path to your React build directory
FRONTEND_DIR = Path(__file__).parent / "dist"

# Check if frontend directory exists
if FRONTEND_DIR.exists():
    # Mount static files for React app assets - this handles /assets/* automatically
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    # Serve React app files
    @app.get("/assets/{file_path:path}")
    async def serve_assets(file_path: str):
        """Serve React app asset files"""
        file_location = FRONTEND_DIR / "assets" / file_path
        if file_location.exists():
            return FileResponse(file_location)
        raise HTTPException(status_code=404, detail="File not found")

    # Catch-all route to serve React app for client-side routing
    # This MUST be defined AFTER all API routes to avoid conflicts
    @app.get("/{full_path:path}")
    async def serve_react_app(request: Request, full_path: str):
        """
        Serve the React app for all non-API routes.
        This enables client-side routing to work properly.
        """
        # Explicitly exclude API routes - they should never reach here
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Exclude FastAPI built-in routes
        if full_path in ["docs", "redoc", "openapi.json", "health"]:
            raise HTTPException(status_code=404, detail="Route not found")
        
        # Serve index.html for all other routes (React client-side routing)
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        else:
            raise HTTPException(status_code=404, detail="Frontend not found. Make sure to build your React app first.")

    # Root route to serve React app
    @app.get("/")
    async def read_root():
        """Serve the React app at root"""
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        else:
            raise HTTPException(status_code=404, detail="Frontend not found. Make sure to build your React app first.")
                
else:
    print("Warning: Frontend directory not found. Frontend serving disabled.")
    
    @app.get("/")
    async def read_root():
        return {"message": "API is running. Frontend not found - build your React app first."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main_refactored:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )