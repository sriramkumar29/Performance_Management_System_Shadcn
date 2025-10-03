from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# Import logging components
from app.utils.logger import get_logger, build_log_context, sanitize_log_data

# Initialize logger for frontend serve module
logger = get_logger(__name__)

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # goes up to project root
FRONTEND_DIR = PROJECT_ROOT / "dist"

# Initialize frontend serving with logging
context = build_log_context()
logger.info(f"{context}FRONTEND_INIT: Initializing frontend serving - Project root: {sanitize_log_data(str(PROJECT_ROOT))}")
logger.info(f"{context}FRONTEND_INIT: Frontend directory: {sanitize_log_data(str(FRONTEND_DIR))}")

# Mount static files
if FRONTEND_DIR.exists():
    logger.info(f"{context}FRONTEND_SETUP: Mounting static assets directory - {FRONTEND_DIR / 'assets'}")
    router.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    logger.info(f"{context}FRONTEND_SETUP: Static assets mounted successfully")
else:
    logger.warning(f"{context}FRONTEND_SETUP: Frontend directory not found - {FRONTEND_DIR}")
    logger.info(f"{context}FRONTEND_SETUP: Frontend serving disabled - no dist directory available")
    
    # Provide fallback routes when frontend is not available
    @router.get("/", response_class=HTMLResponse)
    async def serve_fallback_root():
        """Fallback when frontend is not built."""
        context = build_log_context()
        logger.warning(f"{context}FRONTEND_FALLBACK: Serving fallback for root path - frontend not available")
        raise HTTPException(status_code=404, detail="FRONTEND_NOT_AVAILABLE")
    
    @router.get("/{full_path:path}", response_class=HTMLResponse)
    async def serve_fallback_spa(request: Request, full_path: str):
        """Fallback when frontend is not built."""
        context = build_log_context()
        logger.warning(f"{context}FRONTEND_FALLBACK: Serving fallback for SPA route /{sanitize_log_data(full_path)} - frontend not available")
        
        # Still block API routes even in fallback mode
        if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json"]:
            logger.info(f"{context}FRONTEND_FALLBACK_BLOCKED: Blocked access to reserved path - /{sanitize_log_data(full_path)}")
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        
        raise HTTPException(status_code=404, detail="FRONTEND_NOT_AVAILABLE")

    @router.get("/", response_class=HTMLResponse)
    async def serve_root():
        """Serve the main React application index.html file."""
        context = build_log_context()
        
        try:
            logger.debug(f"{context}FRONTEND_REQUEST: Serving root path - /")
            
            index_file = FRONTEND_DIR / "index.html"
            
            if index_file.exists():
                logger.info(f"{context}FRONTEND_SUCCESS: Serving index.html from {sanitize_log_data(str(index_file))}")
                content = index_file.read_text(encoding="utf-8")
                logger.debug(f"{context}FRONTEND_CONTENT: Index file size - {len(content)} characters")
                return HTMLResponse(content=content)
            
            logger.error(f"{context}FRONTEND_ERROR: Index file not found - {sanitize_log_data(str(index_file))}")
            raise HTTPException(status_code=404, detail="FRONTEND_NOT_FOUND")
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"{context}FRONTEND_EXCEPTION: Unexpected error serving root - {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    @router.get("/{full_path:path}", response_class=HTMLResponse)
    async def serve_react_app(request: Request, full_path: str):
        """Serve React app for client-side routing (SPA support)."""
        context = build_log_context()
        
        try:
            logger.debug(f"{context}FRONTEND_REQUEST: Serving SPA route - /{sanitize_log_data(full_path)}")
            
            # Block API and documentation routes 
            blocked_paths = ["api", "docs", "redoc", "openapi.json"]
            if full_path.startswith("api") or full_path in blocked_paths:
                logger.info(f"{context}FRONTEND_BLOCKED: Blocked access to reserved path - /{sanitize_log_data(full_path)}")
                raise HTTPException(status_code=404, detail="NOT_FOUND")

            index_file = FRONTEND_DIR / "index.html"
            
            if index_file.exists():
                logger.info(f"{context}FRONTEND_SUCCESS: Serving SPA index.html for route - /{sanitize_log_data(full_path)}")
                content = index_file.read_text(encoding="utf-8")
                logger.debug(f"{context}FRONTEND_CONTENT: Index file size - {len(content)} characters")
                return HTMLResponse(content=content)
            
            logger.error(f"{context}FRONTEND_ERROR: Index file not found for SPA route - {sanitize_log_data(str(index_file))}")
            raise HTTPException(status_code=404, detail="FRONTEND_NOT_FOUND")
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"{context}FRONTEND_EXCEPTION: Unexpected error serving SPA route /{sanitize_log_data(full_path)} - {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
