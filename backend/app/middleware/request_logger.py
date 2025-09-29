import logging
from starlette.requests import Request

logger = logging.getLogger(__name__)

async def log_requests_middleware(request: Request, call_next):
    """Log incoming requests for debugging purposes."""
    if request.url.path.startswith("/api/"):
        logger.info(f"API Request: {request.method} {request.url.path}")
        if request.path_params:
            logger.info(f"Path params: {request.path_params}")

        if "employees" in request.url.path:
            logger.info(f"Employee endpoint accessed: {request.method} {request.url.path}")

    response = await call_next(request)
    return response
