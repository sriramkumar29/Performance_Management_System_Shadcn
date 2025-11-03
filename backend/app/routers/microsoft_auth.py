"""
Microsoft Authentication Routes.

Handles Microsoft Entra ID (Azure AD) SSO endpoints:
- Authorization URL generation
- OAuth2 callback handling
- Direct ID token exchange (for SharePoint SSO)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.microsoft_auth_service import MicrosoftAuthService
from app.services.auth_service import AuthService
from app.dependencies.auth import get_auth_service
from app.schemas.microsoft_auth import (
    MicrosoftAuthInitRequest,
    MicrosoftAuthInitResponse,
    MicrosoftAuthCallbackRequest,
    MicrosoftTokenRequest
)
from app.schemas.auth import TokenResponse
from app.core.config import settings
from app.exceptions import UnauthorizedError, EntityNotFoundError
from app.exceptions.domain_exceptions import BaseDomainException, map_domain_exception_to_http_status
from app.utils.logger import get_logger, build_log_context, sanitize_log_data

router = APIRouter(prefix="/api/auth/microsoft", tags=["microsoft-auth"])

# Initialize logger
logger = get_logger(__name__)


def get_microsoft_auth_service() -> MicrosoftAuthService:
    """Dependency to get Microsoft Auth Service instance."""
    return MicrosoftAuthService()


@router.get("/login", response_model=MicrosoftAuthInitResponse)
async def initiate_microsoft_login(
    redirect_uri: str = None,
    ms_auth_service: MicrosoftAuthService = Depends(get_microsoft_auth_service)
):
    """
    Initiate Microsoft OAuth2 flow.

    Returns authorization URL for frontend to redirect user to Microsoft login.
    MSAL automatically handles state parameter for CSRF protection.

    Args:
        redirect_uri: Optional redirect URI (uses default from settings if not provided)
        ms_auth_service: Microsoft authentication service

    Returns:
        MicrosoftAuthInitResponse with authorization_url and state

    Raises:
        HTTPException: If SSO not enabled or configuration invalid
    """
    context = build_log_context()

    if not settings.ENABLE_SSO:
        logger.warning(f"{context}MS_LOGIN_DISABLED: Microsoft SSO is not enabled")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "ServiceUnavailable",
                "message": "Microsoft SSO is not enabled"
            }
        )

    try:
        logger.info(f"{context}MS_LOGIN_INIT: Initiating Microsoft login flow")

        auth_result = ms_auth_service.get_authorization_url(redirect_uri=redirect_uri)

        logger.info(f"{context}MS_LOGIN_INIT_SUCCESS: Authorization URL generated")

        return MicrosoftAuthInitResponse(**auth_result)

    except ValueError as e:
        logger.error(f"{context}MS_LOGIN_INIT_ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "ConfigurationError",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"{context}MS_LOGIN_INIT_EXCEPTION: Unexpected error - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "Failed to initiate Microsoft login"
            }
        )


@router.get("/callback")
async def microsoft_auth_callback(
    code: str,
    state: str = None,
    db: AsyncSession = Depends(get_db),
    ms_auth_service: MicrosoftAuthService = Depends(get_microsoft_auth_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Handle Microsoft OAuth2 redirect callback (GET request from Microsoft).

    Process:
    1. Receive authorization code from Microsoft (as query parameters)
    2. Exchange authorization code for tokens
    3. Validate ID token
    4. Extract user claims
    5. Authenticate/create user in database
    6. Generate our JWT tokens
    7. Redirect to frontend with tokens

    Args:
        code: Authorization code from Microsoft (query parameter)
        state: State parameter for CSRF protection (query parameter)
        db: Database session
        ms_auth_service: Microsoft authentication service
        auth_service: Authentication service

    Returns:
        Redirect to frontend with tokens in URL fragment

    Raises:
        HTTPException: If callback processing fails
    """
    context = build_log_context()

    if not settings.ENABLE_SSO:
        logger.warning(f"{context}MS_CALLBACK_DISABLED: Microsoft SSO is not enabled")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "ServiceUnavailable",
                "message": "Microsoft SSO is not enabled"
            }
        )

    try:
        logger.info(f"{context}MS_CALLBACK: Processing Microsoft callback")

        # Exchange authorization code for tokens
        tokens = ms_auth_service.acquire_token_by_code(
            code=code,
            redirect_uri=settings.MICROSOFT_REDIRECT_URI
        )

        id_token = tokens.get("id_token")
        if not id_token:
            logger.error(f"{context}MS_CALLBACK_ERROR: No ID token in response")
            raise ValueError("No ID token received from Microsoft")

        # Extract user info from ID token
        user_info = ms_auth_service.get_user_info_from_id_token(id_token)

        # Validate email domain if configured
        ms_auth_service.validate_email_domain(user_info["email"])

        # Validate ID token and get claims
        id_token_claims = ms_auth_service.validate_id_token(id_token)

        # Authenticate user and generate JWT tokens
        jwt_tokens = await auth_service.login_with_microsoft(
            db,
            id_token_claims=id_token_claims
        )

        logger.info(f"{context}MS_CALLBACK_SUCCESS: Microsoft callback processed - Email: {sanitize_log_data(user_info['email'])}")

        # Redirect to frontend LOGIN PAGE with tokens in URL fragment (hash)
        # Using fragment (#) instead of query (?) keeps tokens out of server logs
        # Determine frontend URL - use localhost for development, FRONTEND_URL for production
        if settings.APP_ENV == "development":
            frontend_url = "http://localhost:5173"
        else:
            frontend_url = settings.FRONTEND_URL

        # Redirect back to login page (not /auth/callback)
        redirect_url = f"{frontend_url}/login#access_token={jwt_tokens['access_token']}&refresh_token={jwt_tokens['refresh_token']}&token_type=bearer"

        return RedirectResponse(url=redirect_url)

    except ValueError as e:
        logger.error(f"{context}MS_CALLBACK_ERROR: {str(e)}")
        frontend_url = "http://localhost:5173" if settings.APP_ENV == "development" else settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/login?error=invalid_request&error_description={str(e)}")
    except UnauthorizedError as e:
        logger.warning(f"{context}MS_CALLBACK_UNAUTHORIZED: {str(e)}")
        frontend_url = "http://localhost:5173" if settings.APP_ENV == "development" else settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/login?error=unauthorized&error_description={str(e)}")
    except EntityNotFoundError as e:
        logger.warning(f"{context}MS_CALLBACK_NOT_FOUND: {str(e)}")
        frontend_url = "http://localhost:5173" if settings.APP_ENV == "development" else settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/login?error=user_not_found&error_description={str(e)}")
    except Exception as e:
        logger.error(f"{context}MS_CALLBACK_EXCEPTION: Unexpected error - {str(e)}")
        frontend_url = "http://localhost:5173" if settings.APP_ENV == "development" else settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/login?error=server_error&error_description=Failed to process Microsoft callback")


@router.post("/token", response_model=TokenResponse)
async def exchange_microsoft_token(
    request: MicrosoftTokenRequest,
    db: AsyncSession = Depends(get_db),
    ms_auth_service: MicrosoftAuthService = Depends(get_microsoft_auth_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Exchange Microsoft ID token for our JWT tokens.

    This endpoint is for the SharePoint SSO scenario where the frontend
    already has a Microsoft ID token from ssoSilent() or loginPopup().

    Process:
    1. Validate Microsoft ID token signature
    2. Extract user claims
    3. Authenticate/create user in database
    4. Generate our JWT tokens
    5. Return JWT tokens to frontend

    Args:
        request: Request with Microsoft ID token
        db: Database session
        ms_auth_service: Microsoft authentication service
        auth_service: Authentication service

    Returns:
        TokenResponse with access_token and refresh_token

    Raises:
        HTTPException: If token exchange fails
    """
    context = build_log_context()

    if not settings.ENABLE_SSO:
        logger.warning(f"{context}MS_TOKEN_DISABLED: Microsoft SSO is not enabled")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "ServiceUnavailable",
                "message": "Microsoft SSO is not enabled"
            }
        )

    try:
        logger.info(f"{context}MS_TOKEN: Exchanging Microsoft ID token")

        # Extract user info from ID token
        user_info = ms_auth_service.get_user_info_from_id_token(request.id_token)

        # Validate email domain if configured
        ms_auth_service.validate_email_domain(user_info["email"])

        # Validate ID token and get claims
        id_token_claims = ms_auth_service.validate_id_token(request.id_token)

        # Authenticate user and generate JWT tokens
        jwt_tokens = await auth_service.login_with_microsoft(
            db,
            id_token_claims=id_token_claims
        )

        logger.info(f"{context}MS_TOKEN_SUCCESS: Token exchange successful - Email: {sanitize_log_data(user_info['email'])}")

        return TokenResponse(**jwt_tokens)

    except ValueError as e:
        logger.error(f"{context}MS_TOKEN_ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidToken",
                "message": str(e)
            }
        )
    except UnauthorizedError as e:
        logger.warning(f"{context}MS_TOKEN_UNAUTHORIZED: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Unauthorized",
                "message": str(e)
            }
        )
    except EntityNotFoundError as e:
        logger.warning(f"{context}MS_TOKEN_NOT_FOUND: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "UserNotFound",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"{context}MS_TOKEN_EXCEPTION: Unexpected error - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "Failed to exchange Microsoft token"
            }
        )
