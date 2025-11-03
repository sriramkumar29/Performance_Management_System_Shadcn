"""
Microsoft Authentication Service using MSAL Python.

Handles Microsoft Entra ID (Azure AD) authentication flows:
- OAuth2 authorization URL generation
- Authorization code exchange for tokens
- ID token validation
- User information extraction from tokens
"""

import msal
import jwt
from typing import Dict, Optional
from app.core.config import settings
from app.utils.logger import get_logger, build_log_context

logger = get_logger(__name__)


class MicrosoftAuthService:
    """Service for handling Microsoft authentication using MSAL."""

    def __init__(self):
        """Initialize MSAL Confidential Client Application."""
        self.context = build_log_context()

        if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_CLIENT_SECRET:
            logger.warning(f"{self.context}MSAL_INIT: Microsoft SSO not configured (missing credentials)")
            self.msal_app = None
            return

        try:
            self.msal_app = msal.ConfidentialClientApplication(
                client_id=settings.MICROSOFT_CLIENT_ID,
                client_credential=settings.MICROSOFT_CLIENT_SECRET,
                authority=settings.MICROSOFT_AUTHORITY or f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}"
            )
            logger.info(f"{self.context}MSAL_INIT: Microsoft Authentication Service initialized")
        except Exception as e:
            logger.error(f"{self.context}MSAL_INIT_ERROR: Failed to initialize MSAL - {str(e)}")
            self.msal_app = None

    def get_authorization_url(
        self,
        redirect_uri: Optional[str] = None,
        state: Optional[str] = None,
        scopes: Optional[list] = None
    ) -> Dict[str, str]:
        """
        Generate Microsoft OAuth2 authorization URL.

        Args:
            redirect_uri: Optional redirect URI (uses default from settings if not provided)
            state: Optional state parameter for CSRF protection (MSAL generates if not provided)
            scopes: Optional list of scopes (defaults to openid, profile, email)

        Returns:
            Dict with 'authorization_url' and 'state'

        Raises:
            ValueError: If MSAL not initialized or configuration missing
        """
        if not self.msal_app:
            raise ValueError("Microsoft SSO not configured")

        try:
            redirect_uri = redirect_uri or settings.MICROSOFT_REDIRECT_URI
            # Use Microsoft Graph User.Read scope instead of reserved OIDC scopes
            scopes = scopes or ["https://graph.microsoft.com/User.Read"]

            auth_result = self.msal_app.initiate_auth_code_flow(
                scopes=scopes,
                redirect_uri=redirect_uri,
                state=state
            )

            logger.info(f"{self.context}MSAL_AUTH_URL: Generated authorization URL")

            return {
                "authorization_url": auth_result.get("auth_uri"),
                "state": auth_result.get("state")
            }

        except Exception as e:
            logger.error(f"{self.context}MSAL_AUTH_URL_ERROR: Failed to generate authorization URL - {str(e)}")
            raise

    def acquire_token_by_code(
        self,
        code: str,
        redirect_uri: Optional[str] = None,
        scopes: Optional[list] = None
    ) -> Dict[str, str]:
        """
        Exchange authorization code for tokens.

        Args:
            code: Authorization code from Microsoft callback
            redirect_uri: Redirect URI used in authorization request
            scopes: Scopes requested in authorization

        Returns:
            Dict with 'id_token', 'access_token', 'refresh_token'

        Raises:
            ValueError: If token exchange fails or returns error
        """
        if not self.msal_app:
            raise ValueError("Microsoft SSO not configured")

        try:
            redirect_uri = redirect_uri or settings.MICROSOFT_REDIRECT_URI
            # Use Microsoft Graph User.Read scope instead of reserved OIDC scopes
            scopes = scopes or ["https://graph.microsoft.com/User.Read"]

            result = self.msal_app.acquire_token_by_authorization_code(
                code=code,
                scopes=scopes,
                redirect_uri=redirect_uri
            )

            if "error" in result:
                error_msg = result.get("error_description", result.get("error"))
                logger.error(f"{self.context}MSAL_TOKEN_ERROR: Token acquisition failed - {error_msg}")
                raise ValueError(f"Token acquisition failed: {error_msg}")

            logger.info(f"{self.context}MSAL_TOKEN_SUCCESS: Successfully acquired tokens")

            return {
                "id_token": result.get("id_token"),
                "access_token": result.get("access_token"),
                "refresh_token": result.get("refresh_token")
            }

        except Exception as e:
            logger.error(f"{self.context}MSAL_TOKEN_EXCEPTION: Exception during token acquisition - {str(e)}")
            raise

    def validate_id_token(self, id_token: str) -> Dict:
        """
        Validate and decode Microsoft ID token.

        MSAL Python doesn't provide built-in ID token validation for confidential clients,
        so we decode it without verification (since it came from our own token exchange).
        In production, you should verify the signature using Microsoft's JWKS.

        Args:
            id_token: JWT ID token from Microsoft

        Returns:
            Decoded token claims

        Raises:
            ValueError: If token is invalid or from wrong tenant
        """
        try:
            # Decode without verification (token came from our MSAL exchange)
            # In production, verify signature using Microsoft's public keys
            claims = jwt.decode(
                id_token,
                options={"verify_signature": False},  # Already validated by MSAL exchange
            )

            # Validate tenant
            if settings.MICROSOFT_TENANT_ID:
                token_tenant = claims.get("tid")
                if token_tenant != settings.MICROSOFT_TENANT_ID:
                    logger.warning(f"{self.context}MSAL_TENANT_MISMATCH: Token from wrong tenant - {token_tenant}")
                    raise ValueError("Token from wrong tenant")

            # Validate audience (client ID)
            token_audience = claims.get("aud")
            if token_audience != settings.MICROSOFT_CLIENT_ID:
                logger.warning(f"{self.context}MSAL_AUDIENCE_MISMATCH: Token audience mismatch")
                raise ValueError("Token audience mismatch")

            logger.info(f"{self.context}MSAL_TOKEN_VALID: ID token validated successfully")
            return claims

        except jwt.DecodeError as e:
            logger.error(f"{self.context}MSAL_TOKEN_DECODE_ERROR: Failed to decode token - {str(e)}")
            raise ValueError(f"Invalid ID token: {str(e)}")
        except Exception as e:
            logger.error(f"{self.context}MSAL_TOKEN_VALIDATION_ERROR: Token validation failed - {str(e)}")
            raise

    def get_user_info_from_id_token(self, id_token: str) -> Dict[str, str]:
        """
        Extract user information from ID token claims.

        Args:
            id_token: JWT ID token from Microsoft

        Returns:
            Dict with 'email', 'name', 'tenant_id'

        Raises:
            ValueError: If required claims are missing
        """
        try:
            claims = self.validate_id_token(id_token)

            # Extract email (try multiple claim names)
            email = (
                claims.get("email") or
                claims.get("preferred_username") or
                claims.get("upn")
            )

            if not email:
                logger.error(f"{self.context}MSAL_NO_EMAIL: No email claim found in token")
                raise ValueError("No email found in token claims")

            # Extract name
            name = claims.get("name", email.split("@")[0])

            user_info = {
                "email": email.lower(),
                "name": name,
                "tenant_id": claims.get("tid", "")
            }

            logger.info(f"{self.context}MSAL_USER_INFO: Extracted user info - Email: {email}")
            return user_info

        except Exception as e:
            logger.error(f"{self.context}MSAL_USER_INFO_ERROR: Failed to extract user info - {str(e)}")
            raise

    def validate_email_domain(self, email: str) -> bool:
        """
        Validate email domain against allowed list.

        Args:
            email: User email address

        Returns:
            True if domain is allowed or no restriction configured

        Raises:
            ValueError: If email domain is not allowed
        """
        if not settings.ALLOWED_EMAIL_DOMAINS:
            return True  # No restriction

        try:
            domain = email.split("@")[1].lower()
            allowed_domains = [d.strip().lower() for d in settings.ALLOWED_EMAIL_DOMAINS.split(",")]

            if domain not in allowed_domains:
                logger.warning(f"{self.context}MSAL_DOMAIN_BLOCKED: Email domain not allowed - {domain}")
                raise ValueError(f"Email domain '{domain}' is not allowed")

            logger.info(f"{self.context}MSAL_DOMAIN_VALID: Email domain validated - {domain}")
            return True

        except IndexError:
            logger.error(f"{self.context}MSAL_INVALID_EMAIL: Invalid email format - {email}")
            raise ValueError("Invalid email format")
