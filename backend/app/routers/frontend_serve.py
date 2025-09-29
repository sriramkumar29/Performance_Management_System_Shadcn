from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # goes up to project root
FRONTEND_DIR = PROJECT_ROOT / "dist"

# Mount static files
if FRONTEND_DIR.exists():
    router.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @router.get("/", response_class=HTMLResponse)
    async def serve_root():
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
        raise HTTPException(status_code=404, detail="FRONTEND_NOT_FOUND")

    @router.get("/{full_path:path}", response_class=HTMLResponse)
    async def serve_react_app(request: Request, full_path: str):
        if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="NOT_FOUND")

        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
        raise HTTPException(status_code=404, detail="FRONTEND_NOT_FOUND")
