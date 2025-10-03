from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Import logging components
from app.utils.logger import get_logger, sanitize_log_data, build_log_context

# Initialize logger for CORS middleware
logger = get_logger(__name__)

def setup_cors(app):
    """Set up CORS middleware for the FastAPI application."""
    context = build_log_context()
    
    try:
        logger.debug(f"{context}CORS_SETUP_START: Configuring CORS middleware")
        
        # Log CORS configuration details
        logger.info(f"{context}CORS_CONFIG: Allowed origins count: {len(settings.CORS_ORIGINS)}")
        logger.debug(f"{context}CORS_CONFIG: Allowed origins: {[sanitize_log_data(origin) for origin in settings.CORS_ORIGINS]}")
        logger.debug(f"{context}CORS_CONFIG: Allow credentials: True")
        logger.debug(f"{context}CORS_CONFIG: Allowed methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']")
        logger.debug(f"{context}CORS_CONFIG: Allow headers: ['*']")
        logger.debug(f"{context}CORS_CONFIG: Expose headers: ['Content-Length', 'X-Total-Count']")
        
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            allow_headers=["*"],
            expose_headers=["Content-Length", "X-Total-Count"],
        )
        
        logger.info(f"{context}CORS_SETUP_SUCCESS: CORS middleware configured successfully")
        
    except Exception as e:
        logger.error(f"{context}CORS_SETUP_ERROR: Failed to configure CORS middleware - {str(e)}")
        raise
