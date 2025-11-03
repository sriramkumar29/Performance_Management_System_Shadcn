# Microsoft SSO Integration Plan for Performance Management System

## Overview
Implement Microsoft Entra ID (Azure AD) Single Sign-On with three authentication flows:
1. **Seamless SSO from SharePoint** - Silent authentication for users already logged into Microsoft 365
2. **Microsoft Account Login** - Redirect to Microsoft login for tenant users
3. **Traditional Email/Password** - Keep existing credential-based login

## Architecture Analysis

### Current Authentication Flow
- **Backend**: FastAPI with JWT tokens (access + refresh)
- **Frontend**: React with sessionStorage for tokens
- **Token Lifetime**: 30 min access, 7 day refresh
- **Password**: Bcrypt hashing via passlib
- **User Model**: Employee table with emp_email, emp_password

### Target Integration Points
- **Backend Routes**: `/api/employees/login`, `/api/employees/refresh`, `/api/employees/profile`
- **Auth Service**: `backend/app/services/auth_service.py` (JWT generation)
- **Dependencies**: `backend/app/dependencies/auth.py` (OAuth2 bearer)
- **Frontend**: `Login.tsx`, `AuthContext.tsx`

---

## Implementation Plan

### Phase 1: Backend Setup

#### 1.1 Install Dependencies
**File**: `backend/requirements.txt`
- Add `msal==1.31.1` (Microsoft Authentication Library for Python)
- **Note**: `PyJWT==2.10.1` and `cryptography>=45.0.0` already present (needed for token validation)

#### 1.2 Environment Configuration
**File**: `backend/.env.development` (and production)
```env
# Microsoft SSO Configuration
MICROSOFT_CLIENT_ID=<your-client-id>
MICROSOFT_CLIENT_SECRET=<your-client-secret>
MICROSOFT_TENANT_ID=<your-tenant-id>
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/<tenant-id>
MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/auth/callback

# SSO Settings
ENABLE_SSO=true
ENABLE_PASSWORD_LOGIN=true  # Keep traditional login active
AUTO_PROVISION_USERS=false  # Set true to auto-create users from tenant
ALLOWED_EMAIL_DOMAINS=yourcompany.com  # Optional: restrict to specific domains
```

**File**: `backend/app/core/config.py`
- Add Microsoft SSO settings to `Settings` class:
  ```python
  # Microsoft SSO Configuration
  MICROSOFT_CLIENT_ID: str = ""
  MICROSOFT_CLIENT_SECRET: str = ""
  MICROSOFT_TENANT_ID: str = ""
  MICROSOFT_AUTHORITY: str = ""
  MICROSOFT_REDIRECT_URI: str = ""

  # SSO Settings
  ENABLE_SSO: bool = False
  ENABLE_PASSWORD_LOGIN: bool = True
  AUTO_PROVISION_USERS: bool = False
  ALLOWED_EMAIL_DOMAINS: str = ""  # Comma-separated list
  ```

#### 1.3 Create Microsoft Auth Service
**New File**: `backend/app/services/microsoft_auth_service.py`

**Purpose**: Handle Microsoft authentication flows using MSAL Python

**Key Methods**:
```python
class MicrosoftAuthService:
    def __init__(self):
        # Initialize MSAL ConfidentialClientApplication
        self.msal_app = msal.ConfidentialClientApplication(
            client_id=settings.MICROSOFT_CLIENT_ID,
            client_credential=settings.MICROSOFT_CLIENT_SECRET,
            authority=settings.MICROSOFT_AUTHORITY
        )

    def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Generate OAuth2 authorization URL with PKCE"""
        # MSAL handles state parameter automatically
        # Returns URL for user to authenticate

    def acquire_token_by_code(self, code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for tokens"""
        # Returns: {id_token, access_token, refresh_token}

    def validate_id_token(self, id_token: str) -> dict:
        """Validate and decode Microsoft ID token"""
        # Validates signature using Microsoft's JWKS
        # Returns decoded claims (email, name, etc.)

    def get_user_info_from_id_token(self, id_token: str) -> dict:
        """Extract user information from ID token claims"""
        # Returns: {email, name, tenant_id}

    def validate_email_domain(self, email: str) -> bool:
        """Validate email domain against allowed list"""
        # Optional: restrict to specific domains
```

**Important Notes**:
- Use **ID tokens** (not access tokens) for user authentication
- ID tokens contain user claims (email, name, etc.)
- Access tokens are for calling Microsoft Graph API
- MSAL handles token validation, state management, and PKCE automatically

#### 1.4 Update Auth Service
**File**: `backend/app/services/auth_service.py`

**New Methods**:
```python
async def authenticate_with_microsoft(
    self,
    db: AsyncSession,
    id_token_claims: dict
) -> Employee:
    """
    Authenticate user with Microsoft ID token claims.

    Args:
        db: Database session
        id_token_claims: Decoded claims from Microsoft ID token

    Returns:
        Employee object

    Process:
    1. Extract email from claims (preferred_username or email)
    2. Look up employee by email
    3. If not found and AUTO_PROVISION_USERS=true, create employee
    4. Verify email domain if ALLOWED_EMAIL_DOMAINS is set
    5. Return Employee object
    """

async def login_with_microsoft(
    self,
    db: AsyncSession,
    id_token_claims: dict
) -> Dict[str, str]:
    """
    Complete Microsoft SSO login and generate JWT tokens.

    Args:
        db: Database session
        id_token_claims: Decoded claims from Microsoft ID token

    Returns:
        Dict with access_token, refresh_token, token_type
    """
```

**Update existing method**:
```python
async def authenticate_user(
    self,
    db: AsyncSession,
    *,
    email: str,
    password: str
) -> Employee:
    """Update to handle SSO users (who may not have passwords)"""
    employee = await self.employee_service.get_employee_by_email(db, email=email)

    if not employee:
        raise UnauthorizedError(INVALID_EMAIL_OR_PASSWORD)

    if not employee.emp_status:
        raise UnauthorizedError(ACCOUNT_DISABLED)

    # Handle SSO users who don't have passwords
    if employee.emp_password is None:
        raise UnauthorizedError("This account uses Microsoft SSO. Please sign in with Microsoft.")

    if not await self.employee_service.verify_password(password, employee.emp_password):
        raise UnauthorizedError(INVALID_EMAIL_OR_PASSWORD)

    return employee
```

#### 1.5 Create Microsoft Auth Schemas
**File**: `backend/app/schemas/microsoft_auth.py`

```python
from pydantic import BaseModel
from typing import Optional

class MicrosoftAuthInitRequest(BaseModel):
    """Request to initiate Microsoft auth flow"""
    redirect_uri: Optional[str] = None  # Override default redirect URI

class MicrosoftAuthInitResponse(BaseModel):
    """Response with Microsoft authorization URL"""
    authorization_url: str
    state: str  # CSRF protection (MSAL generates this)

class MicrosoftAuthCallbackRequest(BaseModel):
    """Callback from Microsoft with authorization code"""
    code: str
    state: str
    redirect_uri: Optional[str] = None

class MicrosoftTokenRequest(BaseModel):
    """Direct token submission (for SharePoint SSO scenario)"""
    id_token: str  # Microsoft ID token from frontend MSAL

class MicrosoftUserInfo(BaseModel):
    """User info extracted from Microsoft token"""
    email: str
    name: str
    tenant_id: str
```

#### 1.6 Create Microsoft Auth Routes
**File**: `backend/app/routers/microsoft_auth.py`

**Endpoints**:

```python
@router.get("/login", response_model=MicrosoftAuthInitResponse)
async def initiate_microsoft_login(
    request: MicrosoftAuthInitRequest,
    ms_auth_service: MicrosoftAuthService = Depends(get_microsoft_auth_service)
):
    """
    Initiate Microsoft OAuth2 flow.

    Returns authorization URL for frontend to redirect user to Microsoft login.
    MSAL automatically handles state parameter for CSRF protection.
    """

@router.post("/callback", response_model=TokenResponse)
async def microsoft_auth_callback(
    request: MicrosoftAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
    ms_auth_service: MicrosoftAuthService = Depends(get_microsoft_auth_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Handle Microsoft OAuth2 callback.

    Process:
    1. Validate state parameter (CSRF protection)
    2. Exchange authorization code for tokens
    3. Validate ID token
    4. Extract user claims
    5. Authenticate/create user in database
    6. Generate our JWT tokens
    7. Return JWT tokens to frontend
    """

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
    """
```

#### 1.7 Update Main App
**File**: `backend/main.py`
```python
from app.routers import microsoft_auth

# Include router
app.include_router(
    microsoft_auth.router,
    prefix="/api/auth/microsoft",
    tags=["microsoft-auth"]
)
```

#### 1.8 Update Employee Repository
**File**: `backend/app/repositories/employee_repository.py`

**New Method** (if `AUTO_PROVISION_USERS=true`):
```python
async def get_or_create_by_email(
    self,
    db: AsyncSession,
    email: str,
    defaults: dict
) -> Employee:
    """
    Get employee by email or create if not exists.

    Args:
        db: Database session
        email: Employee email
        defaults: Default values for new employee
            {
                "emp_name": str,
                "emp_department": str,
                "role_id": int,
                "auth_provider": "microsoft",
                "emp_password": None  # SSO users don't have passwords
            }

    Returns:
        Employee object (existing or newly created)
    """
```

#### 1.9 Update Employee Service
**File**: `backend/app/services/employee_service.py`

**Update password validation**:
```python
async def create_employee(
    self,
    db: AsyncSession,
    *,
    employee_data: EmployeeCreate
) -> Employee:
    """Update to handle SSO users without passwords"""

    # Validate email uniqueness
    await self._validate_email_unique(db, employee_data.emp_email)

    # Hash password only if provided (password is optional for SSO users)
    obj_data = employee_data.model_dump()
    if obj_data.get("password"):
        plain_password = obj_data.pop("password")
        hashed_password = pwd_context.hash(plain_password)
        obj_data["emp_password"] = hashed_password
    else:
        obj_data.pop("password", None)
        obj_data["emp_password"] = None  # SSO users

    # Create employee
    db_employee = Employee(**obj_data)
    created_employee = await self.repository.create(db, db_employee)

    return created_employee
```

---

### Phase 2: Frontend Setup

#### 2.1 Install Dependencies
**File**: `frontend/package.json`
```json
{
  "dependencies": {
    "@azure/msal-browser": "^3.28.0",
    "@azure/msal-react": "^2.1.3"
  }
}
```

**Install command**:
```bash
cd frontend
npm install @azure/msal-browser@^3.28.0 @azure/msal-react@^2.1.3
```

#### 2.2 Environment Configuration
**File**: `frontend/.env.development` (and `.env.production`)
```env
VITE_MICROSOFT_CLIENT_ID=<your-client-id>
VITE_MICROSOFT_TENANT_ID=<your-tenant-id>
VITE_MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/auth/callback
VITE_ENABLE_SSO=true
```

**Important**: For local development:
```env
# .env.development
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/callback
```

#### 2.3 Create MSAL Configuration
**New File**: `frontend/src/config/msalConfig.ts`

```typescript
import {
  Configuration,
  PublicClientApplication,
  LogLevel,
  BrowserCacheLocation
} from '@azure/msal-browser';

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin + '/auth/callback',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage, // Use sessionStorage
    storeAuthStateInCookie: false, // Set to true for IE11 compatibility
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// Login request configuration
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'], // Basic scopes for authentication
};

// Silent SSO request (for SharePoint scenario)
export const ssoSilentRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'none', // Don't show UI, fail if user interaction required
};

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
export const initializeMsal = async (): Promise<void> => {
  await msalInstance.initialize();

  // Handle redirect promise (for redirect flow)
  await msalInstance.handleRedirectPromise();
};
```

**Key Changes**:
- Use `BrowserCacheLocation.SessionStorage` to match your current auth pattern
- Added `ssoSilentRequest` for SharePoint SSO scenario
- Added proper initialization function
- Removed `User.Read` scope (not needed for basic auth)

#### 2.4 Create Microsoft Auth Utilities
**New File**: `frontend/src/utils/microsoft-auth.ts`

```typescript
import {
  msalInstance,
  loginRequest,
  ssoSilentRequest
} from '../config/msalConfig';
import type {
  AuthenticationResult,
  AccountInfo,
  SilentRequest
} from '@azure/msal-browser';
import { apiFetch } from './api';

/**
 * Check if user has an active Microsoft session (for SharePoint SSO).
 * Uses ssoSilent to attempt authentication without user interaction.
 */
export const attemptSilentSSO = async (): Promise<AuthenticationResult | null> => {
  try {
    // Try to get accounts from cache
    const accounts = msalInstance.getAllAccounts();

    if (accounts.length > 0) {
      // User has previously signed in, try silent token acquisition
      const silentRequest: SilentRequest = {
        ...ssoSilentRequest,
        account: accounts[0],
      };

      const response = await msalInstance.acquireTokenSilent(silentRequest);
      return response;
    } else {
      // No cached accounts, try ssoSilent (for SharePoint scenario)
      // This attempts to sign in using existing browser session
      const response = await msalInstance.ssoSilent(ssoSilentRequest);
      return response;
    }
  } catch (error) {
    console.log('Silent SSO failed:', error);
    return null;
  }
};

/**
 * Login with Microsoft using popup window.
 */
export const loginWithMicrosoftPopup = async (): Promise<AuthenticationResult> => {
  try {
    const response = await msalInstance.loginPopup(loginRequest);
    return response;
  } catch (error) {
    console.error('Microsoft popup login failed:', error);
    throw error;
  }
};

/**
 * Login with Microsoft using redirect flow.
 */
export const loginWithMicrosoftRedirect = async (): Promise<void> => {
  try {
    await msalInstance.loginRedirect(loginRequest);
  } catch (error) {
    console.error('Microsoft redirect login failed:', error);
    throw error;
  }
};

/**
 * Handle redirect callback after Microsoft login.
 * Call this on app initialization.
 */
export const handleMicrosoftRedirect = async (): Promise<AuthenticationResult | null> => {
  try {
    const response = await msalInstance.handleRedirectPromise();
    return response;
  } catch (error) {
    console.error('Error handling redirect:', error);
    throw error;
  }
};

/**
 * Get current Microsoft account from cache.
 */
export const getMicrosoftAccount = (): AccountInfo | null => {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
};

/**
 * Exchange Microsoft ID token for backend JWT tokens.
 */
export const exchangeMicrosoftTokenForJWT = async (
  idToken: string
): Promise<{ access_token: string; refresh_token: string }> => {
  const response = await apiFetch('/auth/microsoft/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok || !response.data) {
    throw new Error(response.error || 'Failed to exchange Microsoft token');
  }

  return response.data;
};

/**
 * Logout from Microsoft.
 */
export const logoutFromMicrosoft = async (): Promise<void> => {
  const account = getMicrosoftAccount();
  if (account) {
    await msalInstance.logoutPopup({ account });
  }
};
```

**Key Features**:
- `attemptSilentSSO()` - Handles SharePoint SSO scenario using `ssoSilent()`
- `loginWithMicrosoftPopup()` - Standard popup login flow
- `exchangeMicrosoftTokenForJWT()` - Exchanges Microsoft ID token for your backend JWT

#### 2.5 Update Auth Context
**File**: `frontend/src/contexts/AuthContext.tsx`

**Add imports**:
```typescript
import {
  attemptSilentSSO,
  loginWithMicrosoftPopup,
  exchangeMicrosoftTokenForJWT,
  getMicrosoftAccount
} from '../utils/microsoft-auth';
import type { AccountInfo } from '@azure/msal-browser';
```

**Add state**:
```typescript
const [microsoftAccount, setMicrosoftAccount] = useState<AccountInfo | null>(
  () => getMicrosoftAccount()
);
```

**Add methods**:
```typescript
const loginWithMicrosoft = async () => {
  setStatus('loading');
  try {
    // Popup login
    const msalResponse = await loginWithMicrosoftPopup();

    // Exchange Microsoft ID token for backend JWT
    const backendTokens = await exchangeMicrosoftTokenForJWT(msalResponse.idToken);

    // Store tokens
    sessionStorage.setItem('auth_token', backendTokens.access_token);
    sessionStorage.setItem('refresh_token', backendTokens.refresh_token);

    // Fetch user profile
    const userRes = await apiFetch('/employees/profile');
    if (!userRes.ok || !userRes.data) {
      throw new Error('Failed to fetch user profile');
    }

    setUser(userRes.data);
    setMicrosoftAccount(msalResponse.account);
    setStatus('succeeded');
    scheduleAutoLogout();
  } catch (error) {
    setStatus('failed');
    throw error;
  }
};

const checkSilentSSO = async (): Promise<boolean> => {
  try {
    const msalResponse = await attemptSilentSSO();

    if (msalResponse && msalResponse.idToken) {
      setStatus('loading');

      // Exchange for backend JWT
      const backendTokens = await exchangeMicrosoftTokenForJWT(msalResponse.idToken);

      sessionStorage.setItem('auth_token', backendTokens.access_token);
      sessionStorage.setItem('refresh_token', backendTokens.refresh_token);

      // Fetch user profile
      const userRes = await apiFetch('/employees/profile');
      if (userRes.ok && userRes.data) {
        setUser(userRes.data);
        setMicrosoftAccount(msalResponse.account);
        setStatus('succeeded');
        scheduleAutoLogout();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Silent SSO check failed:', error);
    return false;
  }
};
```

**Update interface**:
```typescript
export interface AuthContextValue {
  user: Employee | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  checkSilentSSO: () => Promise<boolean>;
  logout: () => void;
  microsoftAccount: AccountInfo | null;
}
```

**Update provider value**:
```typescript
const value = useMemo(
  () => ({
    user,
    status,
    loginWithCredentials,
    loginWithMicrosoft,
    checkSilentSSO,
    logout,
    microsoftAccount
  }),
  [user, status, microsoftAccount]
);
```

#### 2.6 Update Login Page
**File**: `frontend/src/pages/auth/Login.tsx`

**Add imports**:
```typescript
import { Building2 } from 'lucide-react'; // For Microsoft icon
```

**Add Microsoft login handler**:
```typescript
const handleMicrosoftLogin = async () => {
  try {
    await loginWithMicrosoft();
    toast.success('Welcome back!');
    navigate('/');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Microsoft sign-in failed. Please try again.';
    toast.error(errorMessage);
  }
};
```

**Add silent SSO check on mount**:
```typescript
useEffect(() => {
  // Check for existing user session
  if (user) {
    navigate('/');
    return;
  }

  // Try silent SSO if enabled (for SharePoint scenario)
  if (import.meta.env.VITE_ENABLE_SSO === 'true') {
    checkSilentSSO().then((success) => {
      if (success) {
        toast.success('Signed in automatically');
        navigate('/');
      }
    }).catch(() => {
      // Silent SSO failed, show login form
    });
  }
}, [user, navigate, checkSilentSSO]);
```

**Add Microsoft button in form** (after CardHeader, before existing form):
```tsx
<CardContent className="space-y-6">
  {/* Microsoft SSO Button */}
  {import.meta.env.VITE_ENABLE_SSO === 'true' && (
    <>
      <Button
        type="button"
        onClick={handleMicrosoftLogin}
        disabled={status === 'loading'}
        className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
      >
        <Building2 className="h-5 w-5 mr-2" />
        Sign in with Microsoft
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>
    </>
  )}

  {/* Existing email/password form */}
  <form noValidate onSubmit={handleSubmit} className="space-y-6">
    {/* ... existing form fields ... */}
  </form>
</CardContent>
```

#### 2.7 Create Microsoft Callback Page
**New File**: `frontend/src/pages/auth/MicrosoftCallback.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleMicrosoftRedirect } from '../../utils/microsoft-auth';
import { exchangeMicrosoftTokenForJWT } from '../../utils/microsoft-auth';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MicrosoftCallback = () => {
  const navigate = useNavigate();
  const { setUser, setStatus } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Handle redirect response
        const response = await handleMicrosoftRedirect();

        if (!response || !response.idToken) {
          throw new Error('No authentication response received');
        }

        // Exchange Microsoft ID token for backend JWT
        const backendTokens = await exchangeMicrosoftTokenForJWT(response.idToken);

        // Store tokens
        sessionStorage.setItem('auth_token', backendTokens.access_token);
        sessionStorage.setItem('refresh_token', backendTokens.refresh_token);

        // Fetch user profile
        const userRes = await apiFetch('/employees/profile');
        if (!userRes.ok || !userRes.data) {
          throw new Error('Failed to fetch user profile');
        }

        setUser(userRes.data);
        setStatus('succeeded');

        toast.success('Successfully signed in with Microsoft');

        // Redirect to home or intended destination
        const intended = sessionStorage.getItem('intended_destination');
        sessionStorage.removeItem('intended_destination');
        navigate(intended || '/');

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        toast.error(errorMessage);

        // Redirect to login after delay
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processCallback();
  }, [navigate, setUser, setStatus]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Authentication Failed</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold">Signing you in...</h2>
        <p className="text-muted-foreground">Please wait while we complete your authentication</p>
      </div>
    </div>
  );
};

export default MicrosoftCallback;
```

#### 2.8 Update Routes
**File**: `frontend/src/AppRouter.tsx` or main router config

**Add route**:
```typescript
import MicrosoftCallback from './pages/auth/MicrosoftCallback';

// In routes array
{
  path: '/auth/callback',
  element: <MicrosoftCallback />
}
```

#### 2.9 Wrap App with MsalProvider
**File**: `frontend/src/main.tsx` or `App.tsx`

```typescript
import { MsalProvider } from '@azure/msal-react';
import { msalInstance, initializeMsal } from './config/msalConfig';

// Initialize MSAL before rendering
initializeMsal().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MsalProvider>
    </React.StrictMode>
  );
});
```

---

### Phase 3: Database & User Management

#### 3.1 Update Employee Model
**File**: `backend/app/models/employee.py`

**Changes**:
```python
class Employee(Base):
    """Employee model."""
    __tablename__ = "employees"

    emp_id = Column(Integer, primary_key=True, index=True)
    emp_name = Column(String, nullable=False)
    emp_email = Column(String, unique=True, nullable=False, index=True)
    emp_department = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    emp_reporting_manager_id = Column(Integer, ForeignKey(EMPLOYEES_EMP_ID, ondelete=ON_DELETE_SET_NULL), nullable=True)
    emp_status = Column(Boolean, default=True)

    # Make password nullable for SSO users
    emp_password = Column(String, nullable=True)  # Changed from nullable=False

    # Track authentication provider (optional but recommended)
    auth_provider = Column(String, nullable=True)  # "microsoft" or "password"

    # Relationships...
```

#### 3.2 Database Migration
**Create new migration**:
```bash
cd backend
alembic revision -m "add_sso_support"
```

**File**: `backend/alembic/versions/XXXX_add_sso_support.py`

```python
"""add_sso_support

Revision ID: xxxx
Revises: previous_revision
Create Date: 2025-xx-xx
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'xxxx'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Make emp_password nullable
    op.alter_column('employees', 'emp_password',
                    existing_type=sa.String(),
                    nullable=True)

    # Add auth_provider column
    op.add_column('employees', sa.Column('auth_provider', sa.String(), nullable=True))

def downgrade() -> None:
    # Remove auth_provider column
    op.drop_column('employees', 'auth_provider')

    # Revert emp_password to NOT NULL (may fail if SSO users exist)
    op.alter_column('employees', 'emp_password',
                    existing_type=sa.String(),
                    nullable=False)
```

**Run migration**:
```bash
alembic upgrade head
```

#### 3.3 Update Employee Schemas
**File**: `backend/app/schemas/employee.py`

```python
class EmployeeCreate(EmployeeBase):
    """Schema for creating an Employee."""

    # Make password optional for SSO users
    password: Optional[str] = Field(None, min_length=8, max_length=100, description="Employee password (optional for SSO)")
    auth_provider: Optional[str] = Field(None, description="Authentication provider: 'microsoft' or 'password'")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v, values):
        # Password required if auth_provider is 'password' or not set
        auth_provider = values.data.get('auth_provider')
        if auth_provider != 'microsoft' and not v:
            raise ValueError('Password is required for non-SSO users')
        if v and len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
```

---

### Phase 4: Security & Validation

#### 4.1 CSRF Protection
**Implementation**:
- MSAL automatically generates and validates `state` parameter
- No manual implementation needed
- Backend should verify state if implementing custom flow

#### 4.2 Token Validation
**Microsoft ID Token Validation** (handled by MSAL Python):

```python
# In microsoft_auth_service.py
def validate_id_token(self, id_token: str) -> dict:
    """
    Validate Microsoft ID token.

    MSAL automatically validates:
    - Token signature using Microsoft's JWKS
    - Issuer (https://login.microsoftonline.com/{tenant_id}/v2.0)
    - Audience (must match CLIENT_ID)
    - Expiration (exp claim)
    - Not before (nbf claim)

    Returns decoded claims if valid, raises exception if invalid.
    """
    try:
        # MSAL handles validation internally
        claims = jwt.decode(
            id_token,
            options={"verify_signature": True},
            # MSAL fetches signing keys from Microsoft
        )

        # Additional validation
        if claims.get('tid') != settings.MICROSOFT_TENANT_ID:
            raise ValueError('Token from wrong tenant')

        return claims
    except Exception as e:
        logger.error(f"ID token validation failed: {str(e)}")
        raise
```

#### 4.3 Email Domain Validation
**File**: `backend/app/services/microsoft_auth_service.py`

```python
def validate_email_domain(self, email: str) -> bool:
    """
    Validate email domain against allowed list.

    Returns True if domain is allowed or if ALLOWED_EMAIL_DOMAINS is not set.
    """
    if not settings.ALLOWED_EMAIL_DOMAINS:
        return True  # No restriction

    allowed = [d.strip() for d in settings.ALLOWED_EMAIL_DOMAINS.split(',')]
    domain = email.split('@')[1].lower()

    return domain in allowed
```

---

### Phase 5: Testing & Deployment

#### 5.1 Backend Testing
**New File**: `backend/tests/test_microsoft_auth.py`

```python
import pytest
from unittest.mock import Mock, patch
from app.services.microsoft_auth_service import MicrosoftAuthService

@pytest.mark.asyncio
async def test_get_authorization_url():
    """Test authorization URL generation"""
    service = MicrosoftAuthService()
    url = service.get_authorization_url(
        state="test_state",
        redirect_uri="http://localhost/callback"
    )
    assert "login.microsoftonline.com" in url
    assert "client_id" in url

@pytest.mark.asyncio
async def test_validate_id_token():
    """Test ID token validation"""
    # Mock ID token validation
    pass

@pytest.mark.asyncio
async def test_authenticate_with_microsoft():
    """Test user authentication with Microsoft token"""
    # Mock authentication flow
    pass
```

#### 5.2 Frontend Testing
**New File**: `frontend/src/test/microsoft-auth.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { attemptSilentSSO, loginWithMicrosoftPopup } from '../utils/microsoft-auth';

describe('Microsoft Auth', () => {
  it('should initialize MSAL', async () => {
    // Test MSAL initialization
  });

  it('should handle silent SSO', async () => {
    // Mock ssoSilent
    vi.mock('@azure/msal-browser', () => ({
      PublicClientApplication: vi.fn(),
    }));
  });
});
```

#### 5.3 Azure App Registration Configuration
**Manual Steps** (in Azure Portal):

1. **Navigate to Azure AD** → App registrations → Your app

2. **Authentication** section:
   - Add platform: Single-page application
   - Redirect URIs:
     - Production: `https://your-app.herokuapp.com/auth/callback`
     - Development: `http://localhost:5173/auth/callback`
   - Enable: Access tokens, ID tokens
   - Supported account types: Accounts in this organizational directory only (Single tenant)

3. **API permissions**:
   - Microsoft Graph:
     - `User.Read` (Delegated)
     - `openid` (Delegated)
     - `profile` (Delegated)
     - `email` (Delegated)
   - Grant admin consent for your organization

4. **Certificates & secrets**:
   - New client secret
   - Copy value immediately (shown only once)

5. **Token configuration** (optional):
   - Add optional claims to ID token:
     - `email`
     - `preferred_username`

6. **Branding** (optional):
   - Add logo, terms of service, privacy statement

#### 5.4 Heroku Deployment

**Set environment variables**:
```bash
# Backend
heroku config:set MICROSOFT_CLIENT_ID=<your-client-id>
heroku config:set MICROSOFT_CLIENT_SECRET=<your-client-secret>
heroku config:set MICROSOFT_TENANT_ID=<your-tenant-id>
heroku config:set MICROSOFT_AUTHORITY=https://login.microsoftonline.com/<tenant-id>
heroku config:set MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/auth/callback
heroku config:set ENABLE_SSO=true
heroku config:set ENABLE_PASSWORD_LOGIN=true
heroku config:set AUTO_PROVISION_USERS=false
heroku config:set ALLOWED_EMAIL_DOMAINS=yourcompany.com

# Frontend build-time vars (add to heroku-postbuild or build script)
heroku config:set VITE_MICROSOFT_CLIENT_ID=<your-client-id>
heroku config:set VITE_MICROSOFT_TENANT_ID=<your-tenant-id>
heroku config:set VITE_MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/auth/callback
heroku config:set VITE_ENABLE_SSO=true
```

**Update build script** in `package.json`:
```json
{
  "scripts": {
    "heroku-postbuild": "cd frontend && npm install && npm run build"
  }
}
```

---

## Authentication Flow Diagrams

### Flow 1: Seamless SharePoint SSO (Silent Authentication)
```
User clicks link in SharePoint
  ↓
Frontend loads
  ↓
checkSilentSSO() called on mount
  ↓
attemptSilentSSO() tries to get token silently
  ↓
If user has active Microsoft session:
  ↓
ssoSilent() returns ID token without showing UI
  ↓
POST /api/auth/microsoft/token with ID token
  ↓
Backend validates ID token signature
  ↓
Backend extracts user claims (email, name)
  ↓
Backend looks up/creates employee record
  ↓
Backend generates JWT tokens
  ↓
Frontend stores JWT tokens
  ↓
User logged in automatically (no UI shown)
```

### Flow 2: Microsoft Account Login (Interactive)
```
User clicks "Sign in with Microsoft" button
  ↓
loginWithMicrosoftPopup() called
  ↓
Popup opens to Microsoft login page
  ↓
User enters Microsoft credentials
  ↓
Microsoft validates credentials
  ↓
Popup closes, returns ID token to frontend
  ↓
POST /api/auth/microsoft/token with ID token
  ↓
Backend validates ID token signature
  ↓
Backend extracts user claims
  ↓
Backend looks up/creates employee
  ↓
Backend generates JWT tokens
  ↓
Frontend stores JWT tokens
  ↓
User logged in
```

### Flow 3: Traditional Email/Password (Existing Flow)
```
User enters email + password
  ↓
POST /api/employees/login
  ↓
Backend validates credentials against database
  ↓
Backend checks password hash
  ↓
Backend generates JWT tokens
  ↓
Frontend stores JWT tokens
  ↓
User logged in
```

---

## Critical Implementation Notes

### 🔴 Important Token Clarifications
1. **Use ID tokens for authentication** (not access tokens)
   - ID tokens contain user identity claims (email, name, etc.)
   - Access tokens are for calling APIs (Microsoft Graph)
   - Backend receives and validates ID tokens

2. **Frontend uses `idToken` from MSAL response**
   - `msalResponse.idToken` - Send this to backend
   - `msalResponse.accessToken` - Only if calling Microsoft Graph

3. **Backend validates ID token signature**
   - Uses Microsoft's public keys (JWKS)
   - Verifies issuer, audience, expiration
   - MSAL Python handles this automatically

### 🔴 SharePoint SSO Requirements
1. **Use `ssoSilent()` method** (not `acquireTokenSilent()`)
   - `ssoSilent()` works on first visit
   - `acquireTokenSilent()` requires cached account
   - Both are implemented in `attemptSilentSSO()`

2. **Silent SSO may fail** - gracefully fallback
   - User must click "Sign in with Microsoft"
   - Show error only if explicit login also fails

### 🔴 Security Considerations
1. **State parameter** - MSAL handles automatically
2. **Token validation** - Always validate on backend
3. **Email domain restriction** - Use `ALLOWED_EMAIL_DOMAINS`
4. **HTTPS required** - Microsoft requires HTTPS for production

---

## File Summary

### New Files (12)
**Backend (6)**:
1. `backend/app/services/microsoft_auth_service.py` - MSAL integration
2. `backend/app/schemas/microsoft_auth.py` - Request/response schemas
3. `backend/app/routers/microsoft_auth.py` - SSO endpoints
4. `backend/tests/test_microsoft_auth.py` - Unit tests
5. `backend/alembic/versions/XXXX_add_sso_support.py` - DB migration

**Frontend (6)**:
1. `frontend/src/config/msalConfig.ts` - MSAL configuration
2. `frontend/src/utils/microsoft-auth.ts` - Auth utilities
3. `frontend/src/pages/auth/MicrosoftCallback.tsx` - Callback handler
4. `frontend/src/test/microsoft-auth.test.tsx` - Unit tests

### Modified Files (11)
**Backend (6)**:
1. `backend/requirements.txt` - Add msal
2. `backend/app/core/config.py` - Add SSO settings
3. `backend/app/services/auth_service.py` - Add Microsoft auth methods
4. `backend/app/services/employee_service.py` - Handle SSO users (no password)
5. `backend/app/models/employee.py` - Make password nullable, add auth_provider
6. `backend/main.py` - Register Microsoft router

**Frontend (5)**:
1. `frontend/package.json` - Add MSAL packages
2. `frontend/src/contexts/AuthContext.tsx` - Add Microsoft auth methods
3. `frontend/src/pages/auth/Login.tsx` - Add SSO UI
4. `frontend/.env.development` - Add Microsoft config
5. `frontend/src/main.tsx` - Wrap with MsalProvider

---

## Rollback Strategy

If issues arise:
1. Set `ENABLE_SSO=false` in environment variables
2. Traditional login remains fully functional
3. Database migration is backward compatible (nullable password)
4. SSO users can still be created with passwords later
5. No data loss risk

---

## Testing Checklist

### Before Deployment
- [ ] Azure app registration configured correctly
- [ ] Environment variables set in Heroku
- [ ] Database migration completed successfully
- [ ] Local testing with popup login works
- [ ] Silent SSO works from SharePoint (if applicable)
- [ ] Traditional email/password login still works
- [ ] Error handling tested (invalid token, user not found)
- [ ] Token refresh works correctly
- [ ] Logout clears both Microsoft and app sessions

### Post Deployment
- [ ] Monitor logs for authentication errors
- [ ] Verify SharePoint SSO works in production
- [ ] Test with different user types (SSO, password)
- [ ] Check performance of token validation
- [ ] Verify email domain restrictions work

---

## Common Issues & Solutions

### Issue: Silent SSO not working from SharePoint
**Solution**:
- Verify redirect URI matches exactly in Azure
- Check that user is actually signed into Microsoft
- Try with `prompt=none` parameter

### Issue: ID token validation fails
**Solution**:
- Verify tenant ID matches in token claims
- Check client ID matches in token audience
- Ensure token hasn't expired

### Issue: User not auto-provisioned
**Solution**:
- Set `AUTO_PROVISION_USERS=true`
- Verify email domain is allowed
- Check default role exists in database

### Issue: CORS errors during Microsoft login
**Solution**:
- Microsoft login opens in popup/redirect, shouldn't hit CORS
- If using iframe, configure Azure app registration

---

## Estimated Effort
- Backend: 6-8 hours
- Frontend: 4-6 hours
- Testing: 3-4 hours
- Azure setup: 1-2 hours
- **Total**: 14-20 hours

---

## Next Steps After Implementation

1. **User Communication**: Notify users about new SSO option
2. **Migration Plan**: Optionally migrate existing users to SSO
3. **Monitor Logs**: Check for authentication errors
4. **Performance**: Monitor token refresh patterns
5. **Security Audit**: Review token storage and validation
6. **Documentation**: Update user guide with SSO instructions
