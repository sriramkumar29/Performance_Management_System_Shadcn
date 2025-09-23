# REST API Best Practices Implementation

## Overview

This document outlines the implementation of REST API design principles, proper validation, error handling, dependency injection, and separation of concerns in the Performance Management System.

## 🏗️ Architecture Improvements

### 1. Service Layer Architecture

**Before (Issues):**
- Business logic mixed in router files
- Direct database operations in controllers
- No separation of concerns
- Difficult to test and maintain

**After (Improved):**
```
├── app/
│   ├── services/           # Business logic layer
│   │   ├── auth_service.py
│   │   ├── employee_service.py
│   │   ├── appraisal_service.py
│   │   └── goal_service.py
│   ├── dependencies/       # Dependency injection
│   ├── middleware/         # Custom middleware
│   ├── exceptions/         # Custom exceptions
│   └── routers/           # HTTP layer (thin controllers)
```

### 2. Dependency Injection Container

**Implementation:**
```python
# app/dependencies/__init__.py
from fastapi import Depends
from typing import Annotated

# Service dependencies
EmployeeServiceDep = Annotated[EmployeeService, Depends(get_employee_service)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[Employee, Depends(get_current_user)]
```

**Benefits:**
- Loose coupling between components
- Easy testing with mock dependencies
- Centralized service management
- Type safety with annotated dependencies

### 3. Custom Exception Hierarchy

**Implementation:**
```python
# app/exceptions/__init__.py
class BaseAPIException(HTTPException):
    """Base exception for consistent error handling"""

class ValidationError(BaseAPIException):
    """400 - Validation errors"""

class NotFoundError(BaseAPIException):
    """404 - Resource not found"""

class BusinessLogicError(BaseAPIException):  
    """422 - Business rule violations"""
```

## 🔧 REST API Design Principles

### 1. Resource-Based URLs

**✅ Correct Implementation:**
```
GET    /api/v2/employees           # Get all employees
GET    /api/v2/employees/{id}      # Get specific employee
POST   /api/v2/employees           # Create employee
PUT    /api/v2/employees/{id}      # Update employee
DELETE /api/v2/employees/{id}      # Delete employee
GET    /api/v2/employees/managers  # Get managers (collection action)
```

### 2. HTTP Status Codes

**Proper Usage:**
```python
# Success responses
@router.post("/", status_code=status.HTTP_201_CREATED)  # Created
@router.get("/", status_code=status.HTTP_200_OK)        # OK
@router.put("/", status_code=status.HTTP_200_OK)        # Updated
@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)  # Deleted

# Error responses
400 - Bad Request (validation errors)
401 - Unauthorized (authentication required)
403 - Forbidden (insufficient permissions)
404 - Not Found (resource doesn't exist)
422 - Unprocessable Entity (business logic errors)
500 - Internal Server Error (unexpected errors)
```

### 3. Request/Response Models

**Pydantic Schemas:**
```python
class EmployeeCreate(BaseModel):
    emp_name: str
    emp_email: EmailStr
    emp_department: str
    # ... validation rules

class EmployeeResponse(BaseModel):
    emp_id: int
    emp_name: str
    emp_email: str
    # ... response fields only
    
    class Config:
        from_attributes = True
```

## 🛡️ Validation & Error Handling

### 1. Request Validation Decorators

**Implementation:**
```python
@router.post("/")
@handle_validation_errors
@validate_pagination()
async def create_employee(
    employee: EmployeeCreate,  # Automatic Pydantic validation
    db: DatabaseSession,
    service: EmployeeServiceDep
):
    return await service.create_employee(db, employee)
```

### 2. Global Error Handling Middleware

**Features:**
- Consistent error response format
- Automatic exception logging
- Security header injection
- Request/response timing

```python
class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except BaseAPIException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail, "type": "api_error"}
            )
```

### 3. Business Logic Validation

**Service Layer Validation:**
```python
class EmployeeService:
    async def validate_create(self, db: AsyncSession, obj_in: EmployeeCreate):
        """Validate business rules before creation"""
        await self.auth_service.validate_email_unique(db, obj_in.emp_email)
        if obj_in.emp_reporting_manager_id:
            await self._validate_reporting_manager(db, obj_in.emp_reporting_manager_id)
```

## 🔐 Security Implementation

### 1. Authentication & Authorization

**JWT-based Authentication:**
```python
class AuthService:
    def create_tokens(self, employee: Employee) -> Tuple[str, str]:
        """Create access and refresh tokens"""
        # Implementation with proper expiration
        
    async def get_current_user(self, db: AsyncSession, token: str) -> Employee:
        """Validate token and return user"""
        # Token validation and user retrieval
```

### 2. Security Headers Middleware

**Automatic Security Headers:**
```python
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"  
response.headers["X-XSS-Protection"] = "1; mode=block"
response.headers["Strict-Transport-Security"] = "max-age=31536000"
```

## 📊 Testing Strategy

### 1. Unit Tests for Services

**Service Layer Testing:**
```python
class TestEmployeeService:
    def setup_method(self):
        self.employee_service = EmployeeService()
        self.mock_db = AsyncMock()
    
    @pytest.mark.asyncio
    async def test_create_employee_success(self):
        # Test business logic in isolation
```

### 2. Integration Tests for Endpoints

**Router Testing:**
```python
class TestEmployeeRouterRefactored:
    @patch('app.routers.employees_refactored.get_employee_service')
    def test_create_employee_success(self, mock_service):
        # Test HTTP layer with mocked services
```

### 3. Test Coverage

**Current Coverage:**
- ✅ Service layer unit tests
- ✅ Router integration tests  
- ✅ Validation decorator tests
- ✅ Exception handling tests
- ✅ Authentication flow tests

## 🚀 API Versioning Strategy

### 1. Dual Version Support

**Implementation:**
```python
# V1 - Legacy (backward compatibility)
app.include_router(employees.router, prefix="/api/employees", tags=["Employees V1 (Legacy)"])

# V2 - Refactored (new implementation)
app.include_router(employees_v2_router, prefix="/api/v2/employees", tags=["Employees V2"])
```

### 2. Migration Path

**Strategy:**
1. Keep V1 endpoints for backward compatibility
2. Implement V2 with improved architecture
3. Gradually migrate clients to V2
4. Deprecate V1 after migration period

## 📈 Performance & Monitoring

### 1. Request Logging Middleware

**Features:**
- Request/response timing
- Automatic logging
- Performance metrics
- Process time headers

```python
class RequestLoggingMiddleware:
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
```

### 2. Health Check Endpoints

**Monitoring:**
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": "2025-09-23T00:00:00Z"
    }
```

## 🔄 Usage Examples

### 1. Creating an Employee (V2 API)

**Request:**
```bash
POST /api/v2/employees
Content-Type: application/json
Authorization: Bearer <token>

{
    "emp_name": "John Doe",
    "emp_email": "john@example.com",
    "emp_department": "IT",
    "emp_roles": "Developer",
    "emp_roles_level": 3,
    "emp_reporting_manager_id": 2,
    "password": "password123"
}
```

**Response:**
```json
{
    "emp_id": 1,
    "emp_name": "John Doe",
    "emp_email": "john@example.com",
    "emp_department": "IT",
    "emp_roles": "Developer",
    "emp_roles_level": 3,
    "emp_reporting_manager_id": 2,
    "emp_status": true
}
```

### 2. Error Response Format

**Validation Error:**
```json
{
    "detail": "Validation failed: emp_email: field required",
    "type": "api_error"
}
```

**Business Logic Error:**
```json
{
    "detail": "Employee cannot report to themselves",
    "type": "api_error"
}
```

## 🎯 Key Benefits Achieved

### 1. ✅ REST API Design Principles
- Resource-based URLs
- Proper HTTP methods and status codes
- Consistent request/response formats
- Stateless design

### 2. ✅ Request Validation & Error Handling
- Pydantic schema validation
- Custom validation decorators
- Global error handling middleware
- Consistent error response format

### 3. ✅ Dependency Injection
- Service layer injection
- Database session management
- Authentication dependencies
- Type-safe dependency annotations

### 4. ✅ Separation of Concerns
- Business logic in services
- HTTP handling in routers
- Data validation in schemas
- Database operations abstracted

### 5. ✅ Comprehensive Testing
- Unit tests for services
- Integration tests for endpoints
- Validation testing
- Error handling verification

## 🔧 Running the Improved API

### 1. Start the Refactored API

```bash
cd backend
python main_refactored.py
```

### 2. API Documentation

- **Swagger UI:** http://localhost:7000/docs
- **ReDoc:** http://localhost:7000/redoc
- **API Info:** http://localhost:7000/api/info

### 3. Test the Implementation

```bash
# Run service unit tests
pytest tests/unit/services/ -v

# Run router integration tests  
pytest tests/unit/routers/ -v

# Run all tests
pytest -v
```

## 📝 Migration Notes

### For Development Teams:

1. **Gradual Migration:** Use V2 endpoints for new features
2. **Backward Compatibility:** V1 endpoints remain functional
3. **Testing:** All V2 endpoints have comprehensive test coverage
4. **Documentation:** Updated API documentation available

### For Frontend Teams:

1. **New Base URL:** Use `/api/v2/` for new implementations
2. **Authentication:** Same JWT token structure
3. **Error Handling:** Improved error response format
4. **Validation:** Better client-side error handling support

This implementation demonstrates industry-standard REST API development practices with proper architecture, validation, error handling, and testing strategies.