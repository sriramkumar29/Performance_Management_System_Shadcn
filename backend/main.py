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

from app.db.database import engine, Base
from app.routers import employees, appraisals, goals, appraisal_types, appraisal_goals
from app.core.config import settings

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
    version="1.0.0",
    lifespan=lifespan,
    root_path=settings.BASE_PATH if settings.BASE_PATH != "/" else ""
)

# Configure CORS using settings
app.add_middleware(
    CORSMiddleware,
    # allow_origins=settings.CORS_ORIGINS.split(",") if isinstance(settings.CORS_ORIGINS, str) else settings.CORS_ORIGINS,  # Ensure it's a list,  # It's already a list
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Total-Count"],
)

# Include routers
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(appraisals.router, prefix="/api/appraisals", tags=["Appraisals"])
app.include_router(appraisal_goals.router, prefix="/api/appraisals", tags=["Appraisal Goals"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(appraisal_types.router, prefix="/api/appraisal-types", tags=["Appraisal Types"])

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
        if full_path in ["docs", "redoc", "openapi.json"]:
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
        
    # # Root route to serve React app
    # @app.get("/", response_class=HTMLResponse)
    # async def read_root():
    #     """Serve the React app at root"""
    #     index_file = FRONTEND_DIR / "index.html"
    #     try:
    #         # Read the HTML content and return as HTMLResponse
    #         html_content = index_file.read_text(encoding='utf-8')
    #         return HTMLResponse(
    #             content=html_content, 
    #             status_code=200,
    #             headers={"Content-Type": "text/html; charset=utf-8"}
    #         )
    #     except Exception as e:
    #         print(f"Error reading index.html: {e}")
    #         return JSONResponse(
    #             status_code=500,
    #             content={"detail": "Error serving frontend"}
    #         )
                

#     @app.exception_handler(404)
#     async def not_found_handler(request: Request, exc: HTTPException):
#         """
#         Handle 404 errors by serving the React app for non-API routes.
#         API routes will still return proper 404 JSON responses.
#         """
#         path = request.url.path
        
#         # Return JSON 404 for API routes
#         if path.startswith("/api/") or path in ["/docs", "/redoc", "/openapi.json"]:
#             return JSONResponse(
#                 status_code=404,
#                 content={"detail": "Not found"}
#             )
        
#         # Serve React app for all other routes (client-side routing)
#         if FRONTEND_DIR.exists():
#             index_file = FRONTEND_DIR / "index.html"
#             if index_file.exists():
#                 try:
#                     # Read the HTML content and return as HTMLResponse
#                     html_content = index_file.read_text(encoding='utf-8')
#                     return HTMLResponse(
#                         content=html_content, 
#                         status_code=200,
#                         headers={"Content-Type": "text/html; charset=utf-8"}
#                     )
#                 except Exception as e:
#                     print(f"Error reading index.html: {e}")
#                     return JSONResponse(
#                         status_code=500,
#                         content={"detail": "Error serving frontend"}
#                     )
        
#         # Fallback JSON response if frontend not available
#         return JSONResponse(
#             status_code=404,
#             content={"detail": "Not found"}
#         )
# else:
#     print("Warning: Frontend directory not found. Frontend serving disabled.")
    
    @app.get("/")
    async def read_root():
        return {"message": "API is running. Frontend not found - build your React app first."}