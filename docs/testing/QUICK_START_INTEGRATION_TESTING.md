# Quick Start: Integration Testing

## One-Command Setup & Execution

**Run all integration tests:**
```powershell
.\run_integration_tests.ps1
```

This script automatically:
1. ✅ Creates test database (`performance_management_test`)
2. ✅ Seeds test data (CEO, Manager, Developer + appraisal types)
3. ✅ Runs backend integration tests (`pytest -m integration`)
4. ✅ Starts test backend server (port 7001)
5. ✅ Runs frontend integration tests (`npm run test:integration`)
6. ✅ Cleans up background processes

## Manual Step-by-Step

### 1. Database Setup
```powershell
cd .\backend\
.\.venv\Scripts\Activate.ps1
python create_test_db.py
python seed_test_data.py
```

### 2. Backend Tests
```powershell
pytest -m integration -v
```

### 3. Frontend Tests
```powershell
# Terminal 1: Start test backend
python run_test_server.py

# Terminal 2: Run frontend tests
cd ..\frontend\
npm run test:integration
```

## Test Credentials

**Login credentials for integration tests:**
- Email: `john.ceo@example.com`
- Password: `password123`

## Test Database

**Separate test database:**
- Name: `performance_management_test`
- Port: 7001 (isolated from dev port 7000)
- Environment: `APP_ENV=test`

## Troubleshooting

**Backend not starting:**
```powershell
# Check if port 7001 is available
netstat -ano | findstr :7001

# Test database connection
cd .\backend\
.\.venv\Scripts\Activate.ps1
python -c "from app.core.config import settings; print(f'DB: {settings.DATABASE_URL}')"
```

**Frontend tests failing:**
```powershell
# Verify backend is running
curl http://localhost:7001/

# Check CORS configuration
# Should allow http://localhost:5173
```

## What Gets Tested

### Backend Integration Tests
- ✅ Real database operations (CREATE/READ appraisals)
- ✅ Authentication flow (login → JWT tokens)
- ✅ Employee profile retrieval
- ✅ Database record verification

### Frontend Integration Tests
- ✅ Login form submission to real backend
- ✅ Token storage in sessionStorage
- ✅ Dashboard loading with authenticated user
- ✅ Role-based UI (CEO sees Team Appraisal tab)

## File Structure

```
backend/
├── tests/
│   ├── conftest.py              # Test fixtures & DB setup
│   ├── test_integration_appraisal.py  # Integration test examples
│   └── test_db_utils.py         # DB reset utilities
├── create_test_db.py            # Database creation script
├── seed_test_data.py            # Test data seeding
├── run_test_server.py           # Test server runner
└── .env.test                    # Test environment config

frontend/
├── src/test/
│   ├── integration-setup.ts     # Backend connectivity helpers
│   └── App.integration.test.tsx # Frontend integration tests
├── vitest.integration.config.ts # Integration test config
└── package.json                 # npm run test:integration

run_integration_tests.ps1        # Automated test execution
```
