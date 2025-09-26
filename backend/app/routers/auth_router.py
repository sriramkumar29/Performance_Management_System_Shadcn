"""
Authentication routes for the Performance Management System.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.auth_service import AuthService
from app.dependencies.auth import get_auth_service, get_current_active_user
from app.schemas.auth import TokenResponse, RefreshTokenRequest, UserInfo
from app.exceptions import UnauthorizedError, EntityNotFoundError
from app.models.employee import Employee

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Login endpoint to get access and refresh tokens.
    
    Args:
        form_data: OAuth2 password form data (username and password)
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: Access and refresh tokens
        
    Raises:
        HTTPException: If credentials are invalid
    """
    try:
        tokens = await auth_service.login(
            db, 
            email=form_data.username, 
            password=form_data.password
        )
        return TokenResponse(**tokens)
    except (UnauthorizedError, EntityNotFoundError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh access token using refresh token.
    
    Args:
        refresh_data: Refresh token request data
        db: Database session
        auth_service: Authentication service instance
        
    Returns:
        TokenResponse: New access and refresh tokens
        
    Raises:
        HTTPException: If refresh token is invalid or expired
    """
    try:
        tokens = await auth_service.refresh_access_token(
            db, 
            refresh_token=refresh_data.refresh_token
        )
        return TokenResponse(**tokens)
    except (UnauthorizedError, EntityNotFoundError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: Employee = Depends(get_current_active_user)
):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        UserInfo: Current user information
    """
    return UserInfo.model_validate(current_user)