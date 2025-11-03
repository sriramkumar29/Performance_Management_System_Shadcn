# Microsoft SSO Setup Guide

This guide will help you complete the Microsoft SSO integration for the Performance Management System.

## ✅ What's Already Done

- ✅ Backend code implementation (services, routes, schemas)
- ✅ Frontend code implementation (MSAL config, auth utilities, UI)
- ✅ Database migration files created
- ✅ Environment variable templates added

## 🔴 What You Need to Do

### Step 1: Configure Azure App Registration

1. **Go to Azure Portal**
   - Navigate to https://portal.azure.com
   - Sign in with your tenant admin account

2. **Create or Select App Registration**
   - Go to **Azure Active Directory** → **App registrations**
   - Either create new or select existing app registration
   - Note down the **Application (client) ID** and **Directory (tenant) ID**

3. **Configure Authentication**
   - Click on **Authentication** in the left menu
   - Click **Add a platform** → Select **Single-page application**

   **Add these Redirect URIs:**
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://hibiz-tr-wsf-dev-1ac682fa9c0e.herokuapp.com/auth/callback`

   **Token configuration:**
   - ✅ Check **Access tokens** (for implicit flows)
   - ✅ Check **ID tokens**

   **Supported account types:**
   - Select: "Accounts in this organizational directory only (Single tenant)"

4. **Configure API Permissions**
   - Click on **API permissions** in the left menu
   - Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**

   **Add these permissions:**
   - ✅ `User.Read`
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`

   - Click **Grant admin consent for [Your Organization]**

5. **Create Client Secret**
   - Click on **Certificates & secrets** in the left menu
   - Click **New client secret**
   - Description: "Performance Management SSO"
   - Expires: Choose duration (recommended: 24 months)
   - Click **Add**
   - **IMPORTANT:** Copy the **Value** immediately (shown only once!)

6. **Optional: Add Token Configuration**
   - Click on **Token configuration** in the left menu
   - Click **Add optional claim** → **ID**
   - Select: `email`, `preferred_username`
   - Click **Add**

---

### Step 2: Update Environment Variables

#### Backend (.env.development)

Edit: `backend/.env.development`

Replace these placeholders with your actual values:

```env
MICROSOFT_CLIENT_ID=your-client-id-here          # Replace with Application (client) ID from Azure
MICROSOFT_CLIENT_SECRET=your-client-secret-here  # Replace with secret value you copied
MICROSOFT_TENANT_ID=your-tenant-id-here          # Replace with Directory (tenant) ID from Azure
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/your-tenant-id-here  # Use your tenant ID
```

**Example:**
```env
MICROSOFT_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
MICROSOFT_CLIENT_SECRET=ABC~8Q~xyz123...
MICROSOFT_TENANT_ID=9876fedc-ba98-7654-3210-fedcba987654
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/9876fedc-ba98-7654-3210-fedcba987654
```

#### Frontend (.env.development)

Edit: `frontend/.env.development`

Replace these placeholders:

```env
VITE_MICROSOFT_CLIENT_ID=your-client-id-here     # Same as backend CLIENT_ID
VITE_MICROSOFT_TENANT_ID=your-tenant-id-here     # Same as backend TENANT_ID
```

#### Production Environment Variables

**Backend (.env.production)** - Create this file or update:
```env
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_TENANT_ID=your-tenant-id-here
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/your-tenant-id-here
MICROSOFT_REDIRECT_URI=https://hibiz-tr-wsf-dev-1ac682fa9c0e.herokuapp.com/auth/callback
ENABLE_SSO=true
ENABLE_PASSWORD_LOGIN=true
AUTO_PROVISION_USERS=false
ALLOWED_EMAIL_DOMAINS=hibizsolutions.com
```

**Frontend (.env.production)** - Already updated, just replace placeholders

**Heroku Config Vars** - Set in Heroku dashboard or CLI:
```bash
heroku config:set MICROSOFT_CLIENT_ID=your-value
heroku config:set MICROSOFT_CLIENT_SECRET=your-value
heroku config:set MICROSOFT_TENANT_ID=your-value
heroku config:set MICROSOFT_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
heroku config:set MICROSOFT_REDIRECT_URI=https://hibiz-tr-wsf-dev-1ac682fa9c0e.herokuapp.com/auth/callback
heroku config:set ENABLE_SSO=true
heroku config:set ENABLE_PASSWORD_LOGIN=true
heroku config:set AUTO_PROVISION_USERS=false
heroku config:set ALLOWED_EMAIL_DOMAINS=hibizsolutions.com

# Frontend build-time variables
heroku config:set VITE_MICROSOFT_CLIENT_ID=your-value
heroku config:set VITE_MICROSOFT_TENANT_ID=your-value
heroku config:set VITE_MICROSOFT_REDIRECT_URI=https://hibiz-tr-wsf-dev-1ac682fa9c0e.herokuapp.com/auth/callback
heroku config:set VITE_ENABLE_SSO=true
```

---

### Step 3: Run Database Migration

**Option 1: Using psql (Recommended)**

```bash
# Connect to your database
psql "postgresql://postgres:sri%40123@localhost:5432/performance_management_test"

# Run the migration
\i backend/migrations/add_sso_support.sql

# Verify the changes
\d employees
```

**Option 2: Using pgAdmin or Database GUI**

1. Open pgAdmin or your PostgreSQL GUI tool
2. Connect to database: `performance_management_test`
3. Open Query Tool
4. Copy contents of `backend/migrations/add_sso_support.sql`
5. Execute the query
6. Verify that:
   - `emp_password` column is now nullable
   - `auth_provider` column exists

**Option 3: Using Python Script**

```python
# In backend directory, create: run_migration.py
import asyncpg
import asyncio

async def run_migration():
    conn = await asyncpg.connect(
        "postgresql://postgres:sri%40123@localhost:5432/performance_management_test"
    )

    with open('migrations/add_sso_support.sql', 'r') as f:
        sql = f.read()

    await conn.execute(sql)
    print("Migration completed successfully!")

    await conn.close()

asyncio.run(run_migration())
```

Then run: `python run_migration.py`

---

### Step 4: Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

### Step 5: Test Locally

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 7000
   ```

2. **Start Frontend (in new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser:**
   - Navigate to: http://localhost:5173
   - You should see the login page with "Sign in with Microsoft" button

4. **Test Scenarios:**

   **✅ Traditional Login:**
   - Enter email and password
   - Click "Sign In"
   - Should work as before

   **✅ Microsoft SSO (Popup):**
   - Click "Sign in with Microsoft"
   - Popup opens with Microsoft login
   - Sign in with your tenant email
   - Should redirect back and log you in

   **✅ Silent SSO (SharePoint scenario):**
   - Open app in browser where you're already signed into Microsoft 365
   - Should automatically sign you in without showing login page

---

### Step 6: Troubleshooting

#### Issue: "Microsoft SSO is not enabled"
**Solution:** Check that `ENABLE_SSO=true` in backend `.env` file

#### Issue: "No email found in Microsoft token"
**Solution:**
- Verify API permissions in Azure (email scope granted)
- Check token configuration (optional claims added)

#### Issue: "This account uses Microsoft SSO. Please sign in with Microsoft."
**Solution:** This is expected! This employee was created via SSO and doesn't have a password. They must use Microsoft login.

#### Issue: "Employee not found. Please contact your administrator."
**Solution:**
- Either: Set `AUTO_PROVISION_USERS=true` to auto-create users from tenant
- Or: Manually create employee record in database with same email as Microsoft account

#### Issue: Migration fails with "column already exists"
**Solution:** Migration was already run. Check `\d employees` to verify columns exist.

#### Issue: "Failed to exchange Microsoft token"
**Solution:**
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Check that TENANT_ID matches the user's tenant
- Ensure redirect URI matches exactly in Azure

#### Issue: CORS errors during Microsoft login
**Solution:**
- Microsoft login uses popup/redirect, shouldn't hit CORS
- If you see CORS errors, check your backend CORS configuration

---

### Step 7: Verify Installation

**Check Backend:**
```bash
# Start backend
cd backend
uvicorn main:app --reload

# In browser, visit:
http://localhost:7000/docs

# You should see these new endpoints under "microsoft-auth" tag:
# - GET /api/auth/microsoft/login
# - POST /api/auth/microsoft/callback
# - POST /api/auth/microsoft/token
```

**Check Database:**
```sql
-- Verify table structure
\d employees

-- Should show:
-- emp_password | character varying | | nullable
-- auth_provider | character varying(50) | | nullable

-- Check if any SSO users exist
SELECT emp_id, emp_name, emp_email, auth_provider
FROM employees
WHERE auth_provider = 'microsoft';
```

**Check Frontend:**
- Login page should show "Sign in with Microsoft" button
- Button should only appear if `VITE_ENABLE_SSO=true`
- Browser console should show: `[MSAL] Initialized successfully`

---

## 🎯 Next Steps

1. **Test in Development:**
   - Test all three login flows (email/password, Microsoft popup, silent SSO)
   - Verify tokens are stored correctly
   - Test logout functionality

2. **Deploy to Production:**
   - Set Heroku config vars (see Step 2)
   - Update Azure redirect URIs for production
   - Test in production environment

3. **User Migration (Optional):**
   - Identify which users should use SSO
   - Optionally set their `auth_provider = 'microsoft'`
   - Remove their password (set to NULL) to force SSO

4. **Monitor:**
   - Check application logs for SSO errors
   - Monitor authentication patterns
   - Verify email domain restrictions work

---

## 📞 Support

If you encounter issues:

1. Check logs: Backend console and browser console
2. Verify Azure configuration matches this guide
3. Ensure environment variables are set correctly
4. Review the Microsoft SSO implementation plan: `Microsoft_sso.md`

---

## 🔒 Security Notes

- **Never commit `.env` files** to git
- **Client secrets** should be rotated every 12-24 months
- **Email domain restriction** prevents unauthorized tenant users
- **Traditional login** still works as fallback
- **SSO can be disabled** by setting `ENABLE_SSO=false`

---

## ✅ Quick Checklist

Before testing, ensure:

- [ ] Azure App Registration created
- [ ] Client ID, Secret, and Tenant ID obtained
- [ ] Redirect URIs configured in Azure
- [ ] API permissions granted and consented
- [ ] Backend `.env` updated with Azure credentials
- [ ] Frontend `.env` updated with Client ID and Tenant ID
- [ ] Database migration executed successfully
- [ ] Dependencies installed (pip and npm)
- [ ] Backend running on port 7000
- [ ] Frontend running on port 5173
- [ ] "Sign in with Microsoft" button appears on login page

---

## 📚 Additional Resources

- [Microsoft SSO Implementation Plan](./Microsoft_sso.md)
- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Backend Migration Files](./backend/migrations/)

---

**Good luck! 🚀**
