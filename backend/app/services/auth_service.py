"""
Authentication service for the Performance Management System.

This module provides authentication and authorization logic
with proper JWT handling and security.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import jwt
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from app.models.password_reset_token import PasswordResetToken

from app.models.employee import Employee
from app.services.employee_service import EmployeeService
from app.core.config import settings
from app.exceptions import UnauthorizedError, EntityNotFoundError
from app.constants import (
    INVALID_EMAIL_OR_PASSWORD,
    INVALID_REFRESH_TOKEN,
    REFRESH_TOKEN_EXPIRED,
    EMPLOYEE_NOT_FOUND,
    ACCOUNT_DISABLED,
    INVALID_ACCESS_TOKEN,
    ACCESS_TOKEN_EXPIRED
)

# Import logging components
from app.utils.logger import (
    get_logger,
    build_log_context,
    sanitize_log_data,
    log_execution_time,
    log_exception
)


class AuthService:
    """Service class for authentication operations with comprehensive logging."""
    
    def __init__(self):
        self.employee_service = EmployeeService()
        self.logger = get_logger(__name__)
    
    @log_execution_time()
    async def authenticate_user(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str
    ) -> Employee:
        """Authenticate user with email and password."""
        context = build_log_context()
        
        try:
            self.logger.info(f"{context}AUTH_ATTEMPT: User authentication started - Email: {sanitize_log_data(email)}")
            
            employee = await self.employee_service.get_employee_by_email(db, email=email)
            
            if not employee:
                self.logger.warning(f"{context}AUTH_FAILED: Employee not found - Email: {sanitize_log_data(email)}")
                raise UnauthorizedError(INVALID_EMAIL_OR_PASSWORD)
            
            if not employee.emp_status:
                self.logger.warning(f"{context}AUTH_FAILED: Account disabled - Employee ID: {employee.emp_id}, Email: {sanitize_log_data(email)}")
                raise UnauthorizedError(ACCOUNT_DISABLED)
            
            if not await self.employee_service.verify_password(password, employee.emp_password):
                self.logger.warning(f"{context}AUTH_FAILED: Invalid password - Employee ID: {employee.emp_id}, Email: {sanitize_log_data(email)}")
                raise UnauthorizedError(INVALID_EMAIL_OR_PASSWORD)
            
            self.logger.info(f"{context}AUTH_SUCCESS: User authenticated successfully - Employee ID: {employee.emp_id}, Email: {sanitize_log_data(email)}")
            return employee
            
        except UnauthorizedError:
            # Re-raise auth errors as-is (already logged above)
            raise
        except Exception as e:
            self.logger.error(f"{context}AUTH_ERROR: Unexpected authentication error - Email: {sanitize_log_data(email)}, Error: {str(e)}")
            raise UnauthorizedError("Authentication failed")
    
    @log_execution_time()
    def create_access_token(
        self,
        *,
        employee: Employee,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token."""
        context = build_log_context(user_id=employee.emp_id)
        
        try:
            if expires_delta:
                expire = datetime.now(timezone.utc) + expires_delta
            else:
                expire = datetime.now(timezone.utc) + timedelta(
                    minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
                )
            
            self.logger.debug(f"{context}TOKEN_CREATE_ACCESS: Creating access token - Employee ID: {employee.emp_id}, Expires: {expire}")
            
            payload = {
                "sub": employee.emp_email,
                "emp_id": employee.emp_id,
                "type": "access",
                "exp": expire,
                "iat": datetime.now(timezone.utc)
            }
            
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            
            self.logger.info(f"{context}TOKEN_CREATE_ACCESS_SUCCESS: Access token created - Employee ID: {employee.emp_id}")
            return token
            
        except Exception as e:
            self.logger.error(f"{context}TOKEN_CREATE_ACCESS_ERROR: Failed to create access token - Employee ID: {employee.emp_id}, Error: {str(e)}")
            raise
    
    @log_execution_time()
    def create_refresh_token(
        self,
        *,
        employee: Employee,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT refresh token."""
        context = build_log_context(user_id=employee.emp_id)
        
        try:
            if expires_delta:
                expire = datetime.now(timezone.utc) + expires_delta
            else:
                expire = datetime.now(timezone.utc) + timedelta(
                    days=settings.REFRESH_TOKEN_EXPIRE_DAYS
                )
            
            self.logger.debug(f"{context}TOKEN_CREATE_REFRESH: Creating refresh token - Employee ID: {employee.emp_id}, Expires: {expire}")
            
            payload = {
                "sub": employee.emp_email,
                "emp_id": employee.emp_id,
                "type": "refresh",
                "exp": expire,
                "iat": datetime.now(timezone.utc)
            }
            
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            
            self.logger.info(f"{context}TOKEN_CREATE_REFRESH_SUCCESS: Refresh token created - Employee ID: {employee.emp_id}")
            return token
            
        except Exception as e:
            self.logger.error(f"{context}TOKEN_CREATE_REFRESH_ERROR: Failed to create refresh token - Employee ID: {employee.emp_id}, Error: {str(e)}")
            raise
    
    @log_execution_time()
    def verify_token(
        self,
        token: str,
        token_type: str = "access"
    ) -> Dict[str, Any]:
        """Verify JWT token and return payload."""
        context = build_log_context()
        
        try:
            # Sanitize token for logging (show only first/last few chars)
            token_preview = f"{token[:10]}...{token[-4:]}" if len(token) > 14 else "***"
            self.logger.debug(f"{context}TOKEN_VERIFY: Verifying {token_type} token - {token_preview}")
            
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Invalid token type - Expected: {token_type}, Got: {payload.get('type')}")
                raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)
            
            # Verify required fields
            if not payload.get("sub") or not payload.get("emp_id"):
                self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Missing required fields - sub: {bool(payload.get('sub'))}, emp_id: {bool(payload.get('emp_id'))}")
                raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)
            
            self.logger.debug(f"{context}TOKEN_VERIFY_SUCCESS: {token_type} token verified - Employee ID: {payload.get('emp_id')}")
            return payload
            
        except jwt.ExpiredSignatureError:
            self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: {token_type} token expired")
            raise UnauthorizedError(REFRESH_TOKEN_EXPIRED if token_type == "refresh" else ACCESS_TOKEN_EXPIRED)
        except InvalidTokenError as e:
            self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Invalid {token_type} token - Error: {str(e)}")
            raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)
        except Exception as e:
            self.logger.error(f"{context}TOKEN_VERIFY_ERROR: Unexpected error verifying {token_type} token - Error: {str(e)}")
            raise UnauthorizedError(INVALID_REFRESH_TOKEN if token_type == "refresh" else INVALID_ACCESS_TOKEN)

    @log_execution_time()
    async def create_password_reset_token(
        self,
        db: Optional[AsyncSession],
        *,
        employee: Employee,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a short-lived JWT used for password reset links and persist its jti as one-time use.

        If `db` is provided the token jti and expiry will be stored so the token can be
        invalidated after use.
        """
        import uuid

        context = build_log_context(user_id=employee.emp_id)

        try:
            if expires_delta:
                expire = datetime.now(timezone.utc) + expires_delta
            else:
                expire = datetime.now(timezone.utc) + timedelta(
                    minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES
                )

            jti = str(uuid.uuid4())

            payload = {
                "sub": employee.emp_email,
                "emp_id": employee.emp_id,
                "type": "password_reset",
                "jti": jti,
                "exp": expire,
                "iat": datetime.now(timezone.utc)
            }

            token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

            # Persist token jti if DB provided so we can enforce single-use
            if db is not None:
                prt = PasswordResetToken(
                    emp_id=employee.emp_id,
                    jti=jti,
                    used=False,
                    created_at=datetime.utcnow(),
                    expires_at=expire.replace(tzinfo=None)
                )
                db.add(prt)
                try:
                    await db.flush()
                except Exception:
                    # Do not fail whole flow if DB write fails — log and continue
                    self.logger.exception(f"{context}TOKEN_PERSIST_WARN: Failed to persist password reset token jti")

            self.logger.info(f"{context}TOKEN_CREATE_PWRESET_SUCCESS: Password reset token created - Employee ID: {employee.emp_id}")
            return token

        except Exception as e:
            self.logger.error(f"{context}TOKEN_CREATE_PWRESET_ERROR: Failed to create password reset token - Employee ID: {employee.emp_id}, Error: {str(e)}")
            raise

    @log_execution_time()
    async def verify_password_reset_token(self, db: Optional[AsyncSession], token: str) -> Dict[str, Any]:
        """Verify a password-reset token and return the payload or raise UnauthorizedError.

        If `db` is provided the method also ensures the jti exists and hasn't been used/expired.
        """
        context = build_log_context()

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

            if payload.get("type") != "password_reset":
                self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Invalid token type for password reset - Got: {payload.get('type')}")
                raise UnauthorizedError("Invalid password reset token")

            if not payload.get("sub") or not payload.get("emp_id") or not payload.get("jti"):
                self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Missing required fields in password reset token")
                raise UnauthorizedError("Invalid password reset token")

            # If DB provided, ensure token jti exists and not used and not expired
            if db is not None:
                jti = payload.get("jti")
                q = await db.execute(select(PasswordResetToken).where(PasswordResetToken.jti == jti))
                rec = q.scalars().first()
                if not rec:
                    self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Password reset jti not found - jti={jti}")
                    raise UnauthorizedError("Invalid password reset token")

                if rec.used:
                    self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Password reset token already used - jti={jti}")
                    raise UnauthorizedError("Password reset token already used")

                # expires_at is stored naive UTC; payload exp may be aware — rely on jwt decode for expiration

            self.logger.debug(f"{context}TOKEN_VERIFY_SUCCESS: Password reset token verified - Employee ID: {payload.get('emp_id')}")
            return payload

        except jwt.ExpiredSignatureError:
            self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Password reset token expired")
            raise UnauthorizedError("Password reset token expired")
        except InvalidTokenError as e:
            self.logger.warning(f"{context}TOKEN_VERIFY_FAILED: Invalid password reset token - Error: {str(e)}")
            raise UnauthorizedError("Invalid password reset token")
        except UnauthorizedError:
            # re-raise
            raise
        except Exception as e:
            self.logger.error(f"{context}TOKEN_VERIFY_ERROR: Unexpected error verifying password reset token - Error: {str(e)}")
            raise UnauthorizedError("Invalid password reset token")

    @log_execution_time()
    async def reset_password(self, db: AsyncSession, *, token: str, new_password: str) -> None:
        """Reset the employee password using a valid password-reset token."""
        context = build_log_context()

        try:
            payload = await self.verify_password_reset_token(db, token)
            emp_id = payload.get("emp_id")
            jti = payload.get("jti")

            # Use employee service to set password (hashing handled there)
            await self.employee_service.set_password(db, employee_id=emp_id, new_password=new_password)

            # Mark token as used if exists
            try:
                await db.execute(
                    PasswordResetToken.__table__.update().where(PasswordResetToken.jti == jti).values(used=True)
                )
                await db.flush()
            except Exception:
                # Log and continue — do not fail password reset if marking fails
                self.logger.exception(f"{context}TOKEN_MARK_USED_WARN: Failed to mark password reset token used - jti={jti}")

            self.logger.info(f"{context}PASSWORD_RESET_SUCCESS: Password reset completed - Employee ID: {emp_id}")
            return

        except UnauthorizedError:
            raise
        except Exception as e:
            self.logger.error(f"{context}PASSWORD_RESET_ERROR: Failed to reset password - Error: {str(e)}")
            raise
    
    @log_execution_time()
    async def get_current_user_from_token(
        self,
        db: AsyncSession,
        *,
        token: str
    ) -> Employee:
        """Get current user from access token."""
        context = build_log_context()
        
        try:
            self.logger.debug(f"{context}GET_CURRENT_USER: Retrieving user from token")
            
            payload = self.verify_token(token, "access")
            email = payload.get("sub")
            emp_id = payload.get("emp_id")
            
            self.logger.debug(f"{context}GET_CURRENT_USER: Token verified - Employee ID: {emp_id}, Email: {sanitize_log_data(email)}")
            
            employee = await self.employee_service.get_employee_by_email(db, email=email)
            
            if not employee:
                self.logger.warning(f"{context}GET_CURRENT_USER_FAILED: Employee not found - Email: {sanitize_log_data(email)}")
                raise EntityNotFoundError("Employee")
            
            if not employee.emp_status:
                self.logger.warning(f"{context}GET_CURRENT_USER_FAILED: Account disabled - Employee ID: {employee.emp_id}")
                raise UnauthorizedError(ACCOUNT_DISABLED)
            
            self.logger.info(f"{context}GET_CURRENT_USER_SUCCESS: Current user retrieved - Employee ID: {employee.emp_id}")
            return employee
            
        except (UnauthorizedError, EntityNotFoundError):
            # Re-raise auth/entity errors as-is (already logged)
            raise
        except Exception as e:
            self.logger.error(f"{context}GET_CURRENT_USER_ERROR: Unexpected error retrieving current user - Error: {str(e)}")
            raise UnauthorizedError("Failed to retrieve current user")
    
    @log_execution_time()
    async def refresh_access_token(
        self,
        db: AsyncSession,
        *,
        refresh_token: str
    ) -> Dict[str, str]:
        """Refresh access token using refresh token."""
        context = build_log_context()
        
        try:
            self.logger.info(f"{context}TOKEN_REFRESH: Token refresh started")
            
            payload = self.verify_token(refresh_token, "refresh")
            email = payload.get("sub")
            emp_id = payload.get("emp_id")
            
            self.logger.debug(f"{context}TOKEN_REFRESH: Refresh token verified - Employee ID: {emp_id}")
            
            # Verify employee still exists and is active
            employee = await self.employee_service.get_employee_by_email(db, email=email)
            
            if not employee:
                self.logger.warning(f"{context}TOKEN_REFRESH_FAILED: Employee not found - Email: {sanitize_log_data(email)}")
                raise EntityNotFoundError("Employee")
            
            if not employee.emp_status:
                self.logger.warning(f"{context}TOKEN_REFRESH_FAILED: Account disabled - Employee ID: {employee.emp_id}")
                raise UnauthorizedError(ACCOUNT_DISABLED)
            
            # Create new tokens
            self.logger.debug(f"{context}TOKEN_REFRESH: Creating new tokens - Employee ID: {employee.emp_id}")
            new_access_token = self.create_access_token(employee=employee)
            new_refresh_token = self.create_refresh_token(employee=employee)
            
            self.logger.info(f"{context}TOKEN_REFRESH_SUCCESS: Tokens refreshed successfully - Employee ID: {employee.emp_id}")
            
            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer"
            }
            
        except (UnauthorizedError, EntityNotFoundError):
            # Re-raise auth/entity errors as-is (already logged)
            raise
        except Exception as e:
            self.logger.error(f"{context}TOKEN_REFRESH_ERROR: Unexpected error during token refresh - Error: {str(e)}")
            raise UnauthorizedError("Token refresh failed")
    
    @log_execution_time()
    async def login(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str
    ) -> Dict[str, str]:
        """Complete login process with token generation."""
        context = build_log_context()
        
        try:
            self.logger.info(f"{context}LOGIN_START: Login process initiated - Email: {sanitize_log_data(email)}")
            
            employee = await self.authenticate_user(db, email=email, password=password)
            
            self.logger.debug(f"{context}LOGIN_AUTH_SUCCESS: User authenticated, creating tokens - Employee ID: {employee.emp_id}")
            
            access_token = self.create_access_token(employee=employee)
            refresh_token = self.create_refresh_token(employee=employee)
            
            self.logger.info(f"{context}LOGIN_SUCCESS: Login completed successfully - Employee ID: {employee.emp_id}, Email: {sanitize_log_data(email)}")
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer"
            }
            
        except (UnauthorizedError, EntityNotFoundError):
            # Re-raise auth/entity errors as-is (already logged)
            raise
        except Exception as e:
            self.logger.error(f"{context}LOGIN_ERROR: Unexpected error during login - Email: {sanitize_log_data(email)}, Error: {str(e)}")
            raise UnauthorizedError("Login failed")