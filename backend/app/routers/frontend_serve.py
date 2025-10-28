from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import mimetypes

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
# Mount static assets directory if present
if FRONTEND_DIR.exists() and (FRONTEND_DIR / "assets").exists():
    logger.info(f"{context}FRONTEND_SETUP: Mounting static assets directory - {FRONTEND_DIR / 'assets'}")
    router.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    logger.info(f"{context}FRONTEND_SETUP: Static assets mounted successfully")
else:
    logger.warning(f"{context}FRONTEND_SETUP: Frontend assets not found - {FRONTEND_DIR / 'assets'}")
    logger.info(f"{context}FRONTEND_SETUP: Static asset mount skipped")


# Always register SPA-serving routes. At request-time we will check for the
# built `index.html` and serve it when available; if not available return a
# clear 404. This avoids the previous logic bug where the handlers were only
# defined when `dist` did NOT exist.
@router.get("/", response_class=HTMLResponse)
async def serve_root():
    """Serve the main React application index.html file if present, otherwise 404."""
    context = build_log_context()

    try:
        logger.debug(f"{context}FRONTEND_REQUEST: Serving root path - /")

        index_file = FRONTEND_DIR / "index.html"

        if index_file.exists():
            logger.info(f"{context}FRONTEND_SUCCESS: Serving index.html from {sanitize_log_data(str(index_file))}")
            content = index_file.read_text(encoding="utf-8")
            logger.debug(f"{context}FRONTEND_CONTENT: Index file size - {len(content)} characters")
            return HTMLResponse(content=content)

        logger.warning(f"{context}FRONTEND_NOT_BUILT: Index file not present - {sanitize_log_data(str(index_file))}")
        raise HTTPException(status_code=404, detail="FRONTEND_NOT_AVAILABLE")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"{context}FRONTEND_EXCEPTION: Unexpected error serving root - {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_react_app(request: Request, full_path: str):
    """Serve React app for client-side routing (SPA support).

    This handler blocks api/docs paths and otherwise returns the built
    `index.html` so the client-side router can handle the route. If the
    frontend is not built, return 404 with a clear message.
    """
    context = build_log_context()

    try:
        logger.debug(f"{context}FRONTEND_REQUEST: Serving SPA route - /{sanitize_log_data(full_path)}")

        # Block API and documentation routes
        blocked_paths = ["api", "docs", "redoc", "openapi.json"]
        if full_path.startswith("api") or full_path in blocked_paths:
            logger.info(f"{context}FRONTEND_BLOCKED: Blocked access to reserved path - /{sanitize_log_data(full_path)}")
            raise HTTPException(status_code=404, detail="NOT_FOUND")

        # First try to serve a real file from the built frontend directory
        # (covers /assets/* and top-level files like favicon.ico). If the
        # requested path maps to a file under `dist`, return it with a proper
        # content type. Otherwise fall back to serving index.html for SPA
        # routes so the client-side router can handle them.
        target_file = (FRONTEND_DIR / full_path).resolve() if full_path else None

        if target_file and target_file.exists() and target_file.is_file():
            # Guard: ensure the target file is inside the FRONTEND_DIR to
            # avoid directory traversal.
            try:
                target_file.relative_to(FRONTEND_DIR)
            except Exception:
                logger.warning(f"{context}FRONTEND_SECURITY: Attempted access outside frontend dir - {sanitize_log_data(str(target_file))}")
                raise HTTPException(status_code=404, detail="NOT_FOUND")
            media_type, _ = mimetypes.guess_type(str(target_file))
            # Provide reasonable defaults for common types if guess fails
            if not media_type:
                suffix = target_file.suffix.lower()
                if suffix == ".js":
                    media_type = "application/javascript"
                elif suffix == ".css":
                    media_type = "text/css"
                elif suffix == ".svg":
                    media_type = "image/svg+xml"
                elif suffix == ".json":
                    media_type = "application/json"
                elif suffix == ".wasm":
                    media_type = "application/wasm"
                elif suffix == ".ico":
                    media_type = "image/x-icon"
                else:
                    media_type = "application/octet-stream"

            logger.info(f"{context}FRONTEND_SUCCESS: Serving static file for route - /{sanitize_log_data(full_path)} (media_type={media_type})")
            return FileResponse(path=str(target_file), media_type=media_type)

        # No matching static file; serve the SPA index if present so client-side
        # routing can take over for paths like /login, /app/xxx, etc.
        index_file = FRONTEND_DIR / "index.html"

        # If the requested path looks like a file (has an extension) but we did
        # not find it in the dist folder, return 404 instead of index.html. If
        # it's a client route (no file extension), fall back to index.html so
        # the client-side router can render it.
        if full_path and Path(full_path).suffix:
            logger.warning(f"{context}FRONTEND_NOT_FOUND: Static file not found - /{sanitize_log_data(full_path)}")
            raise HTTPException(status_code=404, detail="FRONTEND_FILE_NOT_FOUND")

        if index_file.exists():
            logger.info(f"{context}FRONTEND_SUCCESS: Serving SPA index.html for route - /{sanitize_log_data(full_path)}")
            content = index_file.read_text(encoding="utf-8")
            logger.debug(f"{context}FRONTEND_CONTENT: Index file size - {len(content)} characters")
            return HTMLResponse(content=content)

        logger.warning(f"{context}FRONTEND_NOT_BUILT: SPA index file not present - {sanitize_log_data(str(index_file))}")
        # Still block API-like paths above; for other paths when index.html is
        # missing we return a 404 indicating frontend is not available.
        raise HTTPException(status_code=404, detail="FRONTEND_NOT_AVAILABLE")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"{context}FRONTEND_EXCEPTION: Unexpected error serving SPA route /{sanitize_log_data(full_path)} - {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
