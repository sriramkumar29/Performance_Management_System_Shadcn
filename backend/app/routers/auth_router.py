"""
Authentication routes for the Performance Management System.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.auth_service import AuthService
from app.dependencies.auth import get_auth_service, get_current_active_user
from app.schemas.auth import TokenResponse, RefreshTokenRequest, UserInfo, PasswordResetRequest, PasswordResetConfirm
from app.exceptions import UnauthorizedError, EntityNotFoundError
from app.exceptions.domain_exceptions import BaseDomainException, map_domain_exception_to_http_status
from app.models.employee import Employee
from app.utils.logger import get_logger, build_log_context, sanitize_log_data
from app.utils.email import send_email_background
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Initialize logger
logger = get_logger(__name__)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Login endpoint to get access and refresh tokens with comprehensive logging.
    
    Args:
        form_data: OAuth2 password form data (username and password)
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: Access and refresh tokens
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    context = build_log_context()
    sanitized_email = sanitize_log_data(form_data.username)
    
    logger.info(f"{context}API_REQUEST: POST /login - Login attempt - Email: {sanitized_email}")
    
    try:
        tokens = await auth_service.login(
            db, 
            email=form_data.username, 
            password=form_data.password
        )
        
        logger.info(f"{context}API_SUCCESS: Login successful - Email: {sanitized_email}")
        return TokenResponse(**tokens)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - Login failed - Email: {sanitized_email}")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Login failed - Email: {sanitized_email}, Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred during login"
            }
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh access token using refresh token with comprehensive logging.
    
    Args:
        refresh_data: Refresh token request data
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: New access and refresh tokens
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    context = build_log_context()
    
    logger.info(f"{context}API_REQUEST: POST /refresh - Token refresh attempt")
    
    try:
        tokens = await auth_service.refresh_access_token(
            db, 
            refresh_token=refresh_data.refresh_token
        )
        
        logger.info(f"{context}API_SUCCESS: Token refresh successful")
        return TokenResponse(**tokens)
        
    except BaseDomainException as e:
        # Convert domain exceptions to HTTP exceptions
        status_code = map_domain_exception_to_http_status(e)
        logger.warning(f"{context}DOMAIN_EXCEPTION: {e.__class__.__name__} - Token refresh failed")
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": e.__class__.__name__,
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Token refresh failed - Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred during token refresh"
            }
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: Employee = Depends(get_current_active_user)
):
    """
    Get current user information with comprehensive logging.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        UserInfo: Current user information
        
    Raises:
        HTTPException: Converted from domain exceptions
    """
    user_id = current_user.emp_id
    context = build_log_context(user_id=str(user_id))
    
    logger.info(f"{context}API_REQUEST: GET /me - Get current user info")
    
    try:
        user_info = UserInfo.model_validate(current_user)
        
        logger.info(f"{context}API_SUCCESS: Retrieved current user info - User ID: {user_id}")
        return user_info
        
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"{context}UNEXPECTED_ERROR: Failed to get current user info - Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while retrieving user information"
            }
        )


@router.post("/password/forgot")
async def password_forgot(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Request a password reset link. If the email exists, a reset link will be sent."""
    context = build_log_context()
    sanitized_email = sanitize_log_data(request.email)

    logger.info(f"{context}API_REQUEST: POST /password/forgot - Password reset requested - Email: {sanitized_email}")

    try:
        employee = await auth_service.employee_service.get_employee_by_email(db, email=request.email)

        # Always return success message to avoid leaking user existence
        if not employee:
            logger.info(f"{context}API_INFO: Password reset requested for non-existent email - {sanitized_email}")
            return {"message": "If an account with that email exists, a password reset link has been sent."}

        # Create token and send email (background)
        token = auth_service.create_password_reset_token(employee=employee)
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}" + f"/reset-password?token={token}"

        email_context = {
            "appraisee_name": employee.emp_name,
            "reset_url": reset_url
        }

        # fire-and-forget background send
        await send_email_background(
            subject="Password reset for Performance Management System",
            template_name="password_reset.html",
            context=email_context,
            to=employee.emp_email
        )

        logger.info(f"{context}API_SUCCESS: Password reset email scheduled - Employee ID: {employee.emp_id}")
        return {"message": "If an account with that email exists, a password reset link has been sent."}

    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Password forgot failed - Email: {sanitized_email}, Error: {str(e)}")
        # Return generic message
        return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/password/reset")
async def password_reset(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Reset password using a token and a new password."""
    context = build_log_context()

    logger.info(f"{context}API_REQUEST: POST /password/reset - Attempting password reset")

    try:
        # This will raise UnauthorizedError if token invalid/expired
        await auth_service.reset_password(db, token=data.token, new_password=data.new_password)

        logger.info(f"{context}API_SUCCESS: Password reset completed")
        return {"message": "Password has been reset successfully."}

    except UnauthorizedError as e:
        logger.warning(f"{context}API_WARNING: Password reset failed - {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "InvalidToken", "message": str(e)})

    except Exception as e:
        logger.error(f"{context}UNEXPECTED_ERROR: Password reset failed - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "InternalServerError", "message": "Password reset failed"})