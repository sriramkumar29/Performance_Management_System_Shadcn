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
- Add `msal==1.31.1` (Microsoft Authentication Library)
- Add `cryptography>=45.0.0` (already present, ensure compatible version)

#### 1.2 Environment Configuration
**File**: `backend/.env.development` (and production)
```env
# Microsoft SSO Configuration
MICROSOFT_CLIENT_ID=<your-client-id>
MICROSOFT_CLIENT_SECRET=<your-client-secret>
MICROSOFT_TENANT_ID=<your-tenant-id>
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/<tenant-id>
MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/api/auth/microsoft/callback
MICROSOFT_SCOPES=openid profile email User.Read

# SSO Settings
ENABLE_SSO=true
ENABLE_PASSWORD_LOGIN=true  # Keep traditional login active
AUTO_PROVISION_USERS=false  # Set true to auto-create users from tenant
```

**File**: `backend/app/core/config.py`
- Add Microsoft SSO settings to `Settings` class:
  - `MICROSOFT_CLIENT_ID: str`
  - `MICROSOFT_CLIENT_SECRET: str`
  - `MICROSOFT_TENANT_ID: str`
  - `MICROSOFT_AUTHORITY: str`
  - `MICROSOFT_REDIRECT_URI: str`
  - `MICROSOFT_SCOPES: list[str]`
  - `ENABLE_SSO: bool`
  - `ENABLE_PASSWORD_LOGIN: bool`
  - `AUTO_PROVISION_USERS: bool`

#### 1.3 Create Microsoft Auth Service
**New File**: `backend/app/services/microsoft_auth_service.py`

**Purpose**: Handle Microsoft authentication flows
- Initialize MSAL `ConfidentialClientApplication`
- `get_authorization_url()` - Generate OAuth2 authorization URL
- `acquire_token_by_authorization_code(code)` - Exchange auth code for tokens
- `acquire_token_silent(account)` - Silent token acquisition
- `validate_microsoft_token(access_token)` - Validate MS token
- `get_user_info_from_token(token)` - Extract user claims (email, name, etc.)
- Error handling with comprehensive logging

#### 1.4 Update Auth Service
**File**: `backend/app/services/auth_service.py`

**New Methods**:
- `authenticate_with_microsoft(db, microsoft_token)` → Employee
  - Validate Microsoft token
  - Extract email from token claims
  - Look up employee by email
  - If not found and `AUTO_PROVISION_USERS=true`, create employee
  - Return Employee object
- `login_with_microsoft(db, microsoft_token)` → Dict[str, str]
  - Call `authenticate_with_microsoft()`
  - Generate JWT access + refresh tokens
  - Return token response

#### 1.5 Create Microsoft Auth Schemas
**File**: `backend/app/schemas/microsoft_auth.py`

```python
class MicrosoftAuthRequest(BaseModel):
    code: str  # Authorization code from Microsoft

class MicrosoftTokenRequest(BaseModel):
    access_token: str  # Microsoft access token

class MicrosoftAuthResponse(BaseModel):
    authorization_url: str
    state: str  # CSRF protection
```

#### 1.6 Create Microsoft Auth Routes
**File**: `backend/app/routers/microsoft_auth.py`

**Endpoints**:
- `GET /api/auth/microsoft/login` → `MicrosoftAuthResponse`
  - Generate and return Microsoft OAuth2 URL with state parameter
  - Store state in cache/session for CSRF validation

- `POST /api/auth/microsoft/callback` → `TokenResponse`
  - Receive authorization code
  - Validate state parameter
  - Exchange code for Microsoft tokens
  - Authenticate user via `login_with_microsoft()`
  - Return JWT tokens

- `POST /api/auth/microsoft/token` → `TokenResponse`
  - For silent/implicit flow from SharePoint
  - Receive Microsoft access token directly
  - Validate and exchange for JWT tokens

#### 1.7 Update Main App
**File**: `backend/main.py`
- Import and include `microsoft_auth.router` with prefix `/api/auth/microsoft`

#### 1.8 Update Employee Repository
**File**: `backend/app/repositories/employee_repository.py`

**New Method** (if `AUTO_PROVISION_USERS=true`):
- `get_or_create_by_email(db, email, defaults)` → Employee
  - Check if employee exists by email
  - If not, create with defaults (name from token, no password, default role)
  - Return employee

---

### Phase 2: Frontend Setup

#### 2.1 Install Dependencies
**File**: `frontend/package.json`
- Add `@azure/msal-browser@^3.0.0` (Microsoft Authentication Library for React)
- Add `@azure/msal-react@^2.0.0` (React wrapper for MSAL)

#### 2.2 Environment Configuration
**File**: `frontend/.env.development` (and production)
```env
VITE_MICROSOFT_CLIENT_ID=<your-client-id>
VITE_MICROSOFT_TENANT_ID=<your-tenant-id>
VITE_MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/auth/callback
VITE_ENABLE_SSO=true
```

#### 2.3 Create MSAL Configuration
**New File**: `frontend/src/config/msalConfig.ts`

```typescript
import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};

export const msalInstance = new PublicClientApplication(msalConfig);
```

#### 2.4 Create Microsoft Auth Utilities
**New File**: `frontend/src/utils/microsoft-auth.ts`

**Functions**:
- `initializeMsal()` - Initialize MSAL instance
- `loginWithMicrosoftRedirect()` - Trigger redirect flow
- `loginWithMicrosoftPopup()` - Trigger popup flow
- `handleRedirectCallback()` - Process redirect response
- `acquireTokenSilent()` - Silent token acquisition (for SharePoint)
- `getMicrosoftAccount()` - Get current Microsoft account
- `isMicrosoftAuthenticated()` - Check if user has active MS session

#### 2.5 Update Auth Context
**File**: `frontend/src/contexts/AuthContext.tsx`

**New State**:
```typescript
const [microsoftAccount, setMicrosoftAccount] = useState<AccountInfo | null>(null);
```

**New Methods**:
```typescript
// Login with Microsoft (popup)
const loginWithMicrosoft = async () => {
  setStatus('loading');
  try {
    const msalResponse = await loginWithMicrosoftPopup();
    const backendTokens = await exchangeMicrosoftToken(msalResponse.accessToken);

    sessionStorage.setItem('auth_token', backendTokens.access_token);
    sessionStorage.setItem('refresh_token', backendTokens.refresh_token);

    const userRes = await apiFetch('/employees/profile');
    setUser(userRes.data);
    setStatus('succeeded');
    scheduleAutoLogout();
  } catch (error) {
    setStatus('failed');
    throw error;
  }
};

// Silent SSO check (for SharePoint scenario)
const checkSilentSSO = async () => {
  try {
    const token = await acquireTokenSilent();
    if (token) {
      await loginWithMicrosoft(); // Auto-login
      return true;
    }
  } catch {
    return false;
  }
  return false;
};
```

**Updated Interface**:
```typescript
export interface AuthContextValue {
  // ... existing fields
  loginWithMicrosoft: () => Promise<void>;
  checkSilentSSO: () => Promise<boolean>;
  microsoftAccount: AccountInfo | null;
}
```

#### 2.6 Update Login Page
**File**: `frontend/src/pages/auth/Login.tsx`

**Add Microsoft Login Button**:
```tsx
{/* Microsoft SSO Button */}
{import.meta.env.VITE_ENABLE_SSO === 'true' && (
  <>
    <Button
      type="button"
      onClick={handleMicrosoftLogin}
      disabled={status === 'loading'}
      className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
    >
      <MicrosoftIcon className="h-5 w-5 mr-2" />
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
```

**Add Silent SSO Check on Mount**:
```tsx
useEffect(() => {
  if (import.meta.env.VITE_ENABLE_SSO === 'true') {
    checkSilentSSO(); // Attempt silent login for SharePoint users
  }
}, []);
```

#### 2.7 Create Microsoft Callback Page
**New File**: `frontend/src/pages/auth/MicrosoftCallback.tsx`

**Purpose**: Handle redirect from Microsoft login
- Process authorization code
- Exchange for backend JWT tokens
- Redirect to dashboard or original destination
- Show loading state during processing
- Error handling

#### 2.8 Update Routes
**File**: `frontend/src/App.tsx` or router config
- Add route: `/auth/callback` → `MicrosoftCallback` component

#### 2.9 Create Microsoft Icon Component
**New File**: `frontend/src/components/icons/MicrosoftIcon.tsx`
- SVG icon for Microsoft logo

---

### Phase 3: Database & User Management

#### 3.1 Update Employee Model (Optional)
**File**: `backend/app/models/employee.py`

**Considerations**:
- Current: `emp_password` is NOT NULL
- **Option A**: Make `emp_password` nullable for SSO-only users
  ```python
  emp_password = Column(String, nullable=True)
  ```
- **Option B**: Set dummy password for SSO users
- **Option C**: Add `auth_provider` field to track login method

**Recommendation**: Option A (nullable password) + add migration

#### 3.2 Database Migration
**New File**: `backend/alembic/versions/XXXX_add_sso_support.py`

```python
# Make emp_password nullable
op.alter_column('employees', 'emp_password', nullable=True)

# Optional: Add auth_provider column
op.add_column('employees', sa.Column('auth_provider', sa.String(), nullable=True))
```

#### 3.3 Update Employee Schemas
**File**: `backend/app/schemas/employee.py`

**Update `EmployeeCreate`**:
```python
class EmployeeCreate(EmployeeBase):
    password: Optional[str] = Field(None, min_length=8)
    auth_provider: Optional[str] = Field(None, description="microsoft, password, or None")
```

---

### Phase 4: Security & Validation

#### 4.1 CSRF Protection
**Implementation**:
- Generate state parameter in `/api/auth/microsoft/login`
- Store in backend cache/session (Redis recommended)
- Validate state in `/api/auth/microsoft/callback`

#### 4.2 Token Validation
**Microsoft Token Validation**:
- Verify token signature using Microsoft public keys
- Validate issuer, audience, expiration
- Check tenant ID matches configured tenant
- Use MSAL built-in validation

#### 4.3 Email Domain Validation (Optional)
**Add to**: `backend/app/services/microsoft_auth_service.py`
```python
def validate_email_domain(email: str) -> bool:
    allowed_domains = settings.ALLOWED_EMAIL_DOMAINS  # e.g., ["yourcompany.com"]
    domain = email.split('@')[1]
    return domain in allowed_domains
```

---

### Phase 5: Testing & Deployment

#### 5.1 Backend Testing
**New File**: `backend/tests/test_microsoft_auth.py`
- Test authorization URL generation
- Test token exchange (mock MSAL)
- Test user authentication flow
- Test error scenarios (invalid token, user not found)

#### 5.2 Frontend Testing
**New File**: `frontend/src/test/microsoft-auth.test.tsx`
- Test MSAL initialization
- Test login flow (mock MSAL)
- Test silent SSO check
- Test callback handling

#### 5.3 Azure App Registration Configuration
**Manual Steps**:
1. Add redirect URIs:
   - `https://your-app.herokuapp.com/auth/callback` (frontend)
   - `https://your-app.herokuapp.com/api/auth/microsoft/callback` (backend)
2. Enable ID tokens and access tokens
3. Add API permissions: `User.Read`, `openid`, `profile`, `email`
4. Grant admin consent for tenant
5. Add client secret (copy to env vars)

#### 5.4 Heroku Deployment
**Environment Variables** (set in Heroku dashboard):
```bash
# Backend
MICROSOFT_CLIENT_ID=<value>
MICROSOFT_CLIENT_SECRET=<value>
MICROSOFT_TENANT_ID=<value>
ENABLE_SSO=true
ENABLE_PASSWORD_LOGIN=true
AUTO_PROVISION_USERS=false

# Frontend (build-time vars)
VITE_MICROSOFT_CLIENT_ID=<value>
VITE_MICROSOFT_TENANT_ID=<value>
VITE_ENABLE_SSO=true
```

---

## Authentication Flow Diagrams

### Flow 1: Seamless SharePoint SSO
```
User clicks link in SharePoint → Frontend loads
→ checkSilentSSO() detects Microsoft session
→ acquireTokenSilent() gets MS token
→ POST /api/auth/microsoft/token with MS token
→ Backend validates MS token
→ Backend generates JWT tokens
→ User logged in (no interaction required)
```

### Flow 2: Microsoft Account Login
```
User clicks "Sign in with Microsoft"
→ Redirect to Microsoft login
→ User authenticates with tenant credentials
→ Redirect back to /auth/callback with code
→ Exchange code for MS token (backend)
→ Backend validates and generates JWT
→ User logged in
```

### Flow 3: Traditional Email/Password
```
User enters email + password
→ POST /api/employees/login
→ Backend validates credentials (existing flow)
→ Backend generates JWT tokens
→ User logged in
```

---

## File Summary

### New Files (14)
**Backend (7)**:
1. `backend/app/services/microsoft_auth_service.py` - MSAL integration
2. `backend/app/schemas/microsoft_auth.py` - Request/response schemas
3. `backend/app/routers/microsoft_auth.py` - SSO endpoints
4. `backend/tests/test_microsoft_auth.py` - Unit tests
5. `backend/alembic/versions/XXXX_add_sso_support.py` - DB migration

**Frontend (7)**:
1. `frontend/src/config/msalConfig.ts` - MSAL configuration
2. `frontend/src/utils/microsoft-auth.ts` - Auth utilities
3. `frontend/src/pages/auth/MicrosoftCallback.tsx` - Callback handler
4. `frontend/src/components/icons/MicrosoftIcon.tsx` - UI icon
5. `frontend/src/test/microsoft-auth.test.tsx` - Unit tests

### Modified Files (10)
**Backend (5)**:
1. `backend/requirements.txt` - Add msal
2. `backend/app/core/config.py` - Add SSO settings
3. `backend/app/services/auth_service.py` - Add Microsoft auth methods
4. `backend/app/models/employee.py` - Make password nullable
5. `backend/main.py` - Register Microsoft router

**Frontend (5)**:
1. `frontend/package.json` - Add MSAL packages
2. `frontend/src/contexts/AuthContext.tsx` - Add Microsoft auth methods
3. `frontend/src/pages/auth/Login.tsx` - Add SSO UI
4. `frontend/.env.development` - Add Microsoft config
5. Router configuration - Add callback route

---

## Rollback Strategy

If issues arise:
1. Set `ENABLE_SSO=false` in environment variables
2. Traditional login remains fully functional
3. Database migration is backward compatible (nullable password)
4. No data loss risk

---

## Next Steps After Implementation

1. **User Communication**: Notify users about new SSO option
2. **Migration Plan**: Optionally migrate existing users to SSO
3. **Monitor Logs**: Check for authentication errors
4. **Performance**: Monitor token refresh patterns
5. **Security Audit**: Review token storage and validation

---

## Estimated Effort
- Backend: 6-8 hours
- Frontend: 4-6 hours
- Testing: 3-4 hours
- Azure setup: 1-2 hours
- **Total**: 14-20 hours
