"""
Microsoft Authentication Schemas.

Request and response models for Microsoft SSO endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class MicrosoftAuthInitRequest(BaseModel):
    """Request to initiate Microsoft OAuth2 flow."""

    redirect_uri: Optional[str] = Field(
        None,
        description="Optional redirect URI (overrides default from settings)"
    )


class MicrosoftAuthInitResponse(BaseModel):
    """Response with Microsoft authorization URL."""

    authorization_url: str = Field(..., description="URL to redirect user to Microsoft login")
    state: str = Field(..., description="CSRF protection state parameter")


class MicrosoftAuthCallbackRequest(BaseModel):
    """Callback request from Microsoft with authorization code."""

    code: str = Field(..., description="Authorization code from Microsoft")
    state: str = Field(..., description="State parameter for CSRF validation")
    redirect_uri: Optional[str] = Field(
        None,
        description="Redirect URI used in authorization request"
    )


class MicrosoftTokenRequest(BaseModel):
    """Direct token submission (for SharePoint SSO scenario)."""

    id_token: str = Field(..., description="Microsoft ID token from frontend MSAL")


class MicrosoftUserInfo(BaseModel):
    """User information extracted from Microsoft token."""

    email: str = Field(..., description="User email address")
    name: str = Field(..., description="User display name")
    tenant_id: str = Field(..., description="Microsoft tenant ID")
