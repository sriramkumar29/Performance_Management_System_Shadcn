# Employee ID Validation Error - Debug Guide

## Problem

The frontend login page is generating a validation error:

```json
{
  "error": {
    "type": "ValidationError",
    "message": "Request validation failed",
    "status_code": 422,
    "details": [
      {
        "field": "path -> employee_id",
        "message": "The provided value is not a valid integer. Please provide a numeric ID (e.g., 1, 2, 3). Original error: Input should be a valid integer, unable to parse string as an integer",
        "type": "int_parsing"
      }
    ]
  }
}
```

## Analysis

This error suggests that a string (likely "login") is being passed as an employee_id path parameter to the `/{employee_id}` route instead of the `/login` route.

## Possible Causes

### 1. Frontend Route Configuration Issue

- The frontend might be making a GET request to `/login` instead of POST
- URL construction might be incorrect
- Base URL configuration might be wrong

### 2. Route Ordering Issue (Less Likely)

- Although routes are correctly ordered, there might be a matching issue
- The `/{employee_id}` route might be catching requests meant for `/login`

### 3. Browser/Network Issue

- Browser might be making additional requests
- CORS preflight requests might be involved
- Network redirection might be occurring

## Solutions

### Immediate Fix: Add Route Guards

The backend now includes improved validation with better error messages and logging.

### Frontend Debugging Steps

1. **Check Network Tab**:

   - Open browser DevTools → Network tab
   - Reproduce the login error
   - Look for any GET requests to `/api/employees/login` or similar
   - Check if there are failed requests to unexpected URLs

2. **Verify API Calls**:

   - Check that login requests are POST, not GET
   - Verify the URL being called is `/api/employees/login`
   - Ensure proper headers are being sent

3. **Console Logging**:
   Add logging to the frontend AuthContext:
   ```typescript
   const loginRes = await apiFetch<{
     access_token: string;
     refresh_token: string;
   }>(
     "/employees/login", // This should become /api/employees/login
     {
       method: "POST",
       body: JSON.stringify({ email, password }),
     }
   );
   ```

### Backend Debugging

The backend now has enhanced logging that will show:

- All API requests with their methods and paths
- Path parameters for employee-related requests
- Detailed validation error messages

### Quick Test Commands

1. **Test Login Endpoint Directly**:

   ```bash
   curl -X POST http://localhost:8000/api/employees/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password"}'
   ```

2. **Test Invalid Employee ID**:

   ```bash
   curl http://localhost:8000/api/employees/login
   # This should return a validation error showing "login" as invalid employee_id
   ```

3. **Check Available Routes**:
   ```bash
   curl http://localhost:8000/api/debug/routes
   ```

## Expected Behavior

- POST `/api/employees/login` → Login endpoint (✅ Working)
- GET `/api/employees/login` → Should return 405 Method Not Allowed
- GET `/api/employees/123` → Employee by ID endpoint (✅ Working)
- GET `/api/employees/login` → Should NOT match the `/{employee_id}` route

## Next Steps

1. **Run the backend with logging enabled**
2. **Reproduce the error in frontend**
3. **Check backend console logs** to see exactly what request is being made
4. **Verify the frontend is making the correct API calls**

The improved validation and logging will help identify exactly what's happening and provide better error messages to guide the fix.
