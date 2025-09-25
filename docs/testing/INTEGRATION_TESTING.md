# Integration Testing Guide

This guide covers setting up integration tests for the Performance Management System without Docker or Alembic, using real database operations against a dedicated test database.

## Stack Overview
- **Frontend**: React + TypeScript + Vite + Vitest + React Testing Library
- **Backend**: FastAPI + Python + pytest + httpx + SQLAlchemy ORM
- **Database**: PostgreSQL (local installation with dedicated test database)

## Prerequisites

### 1. PostgreSQL Test Database Setup
**Automated setup (recommended):**
```powershell
cd .\backend\
.\.venv\Scripts\Activate.ps1
python create_test_db.py
```

**Manual setup (if automated fails):**
```powershell
# Connect to PostgreSQL as superuser
psql -U postgres

# Create test database
CREATE DATABASE performance_management_test;

# Grant permissions (adjust username as needed)
GRANT ALL PRIVILEGES ON DATABASE performance_management_test TO postgres;

# Exit psql
\q
```

### 2. Environment Configuration
The `backend/.env.test` file is configured for test isolation:
```env
APP_ENV=test
DATABASE_URL=postgresql+asyncpg://postgres:sri%40123@localhost:5432/performance_management_test
DEBUG=True
SECRET_KEY=test-secret-key
PORT=7001  # Separate port from development (7000)
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
TEST_MODE=True
```

## Backend Integration Tests

### Test Structure
- **`tests/conftest.py`**: Database fixtures and TestClient setup
- **`tests/test_db_utils.py`**: Database reset utilities
- **`tests/test_integration_appraisal.py`**: Example integration tests

### Key Features
- Uses dedicated test database with real SQLAlchemy operations
- Automatic schema creation/destruction per test session
- Table cleanup between individual tests
- TestClient for FastAPI endpoint testing
- Authentication fixtures for protected endpoints

### Running Backend Tests
```powershell
# Navigate to backend directory
cd .\backend\

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install test dependencies
pip install -r requirements-test.txt

# Run all tests
pytest

# Run only integration tests
pytest -m integration

# Run with coverage
pytest --cov=app --cov-report=html
```

### Database Reset Strategy
The `reset_db_tables()` function in `tests/test_db_utils.py` clears all tables between tests:
```python
async def reset_db_tables(session: AsyncSession):
    """Clear all tables in reverse dependency order to avoid FK constraints."""
    try:
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise e
```

## Frontend Integration Tests

### Test Structure
- **`src/test/integration-setup.ts`**: Backend connectivity and auth helpers
- **`src/test/App.integration.test.tsx`**: Example frontend ↔ backend tests
- **`vitest.integration.config.ts`**: Separate config for integration tests

### Key Features
- No API mocking - communicates with real FastAPI backend
- Backend health check before tests run
- Real authentication flow with token management
- Separate test configuration to avoid conflicts with unit tests

### Running Frontend Integration Tests
```powershell
# Navigate to frontend directory
cd .\frontend\

# Install dependencies
npm install

# Start backend server (in separate terminal)
cd ..\backend\
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 7000

# Run integration tests (back in frontend directory)
cd ..\frontend\
npm run test:integration

# Run with UI
npm run test:integration -- --ui
```

## Full Integration Test Workflow

### 1. Database Setup
```powershell
cd .\backend\
.\.venv\Scripts\Activate.ps1

# Create test database and schema (automated)
python create_test_db.py

# Seed test data
python seed_test_data.py
```

### 2. Backend Test Run
```powershell
cd .\backend\
.\.venv\Scripts\Activate.ps1

# Run backend tests
pytest -m integration -v
```

### 3. Frontend Integration Test Run
```powershell
# Terminal 1: Start backend (test mode)
cd .\backend\
.\.venv\Scripts\Activate.ps1
$env:APP_ENV="test"
uvicorn main:app --host 0.0.0.0 --port 7001

# Terminal 2: Run frontend integration tests
cd .\frontend\
npm run test:integration
```

## Test Database Management

### Manual Reset Between Test Runs
```powershell
cd .\backend\
.\.venv\Scripts\Activate.ps1

# Drop and recreate all tables
python -c "
import asyncio
from app.db.database import engine, Base
async def reset():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
asyncio.run(reset())
"

# Seed test data if needed
python seed_data.py
```

### Automated Reset (in tests)
The test fixtures automatically handle cleanup:
- Schema created once per test session
- Tables cleared between individual tests
- Schema dropped at session end

## CI/CD Setup (Without Docker)

### GitHub Actions Example
```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: performance_management_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-test.txt
          
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run backend integration tests
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:testpass@localhost:5432/performance_management_test
        run: |
          cd backend
          pytest -m integration
          
      - name: Start backend for frontend tests
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:testpass@localhost:5432/performance_management_test
        run: |
          cd backend
          uvicorn main:app --host 0.0.0.0 --port 7000 &
          sleep 5
          
      - name: Run frontend integration tests
        run: |
          cd frontend
          npm run test:integration
```

## Test Examples

### Backend Integration Test
```python
def test_create_appraisal_full_flow(client, auth_headers, test_employee, test_appraisal_type, db_session):
    """Test creating an appraisal and verify DB record is created."""
    appraisal_data = {
        "appraisee_id": test_employee.emp_id,
        "appraiser_id": test_employee.emp_id,
        "reviewer_id": test_employee.emp_id,
        "appraisal_type_id": test_appraisal_type.id,
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=365))
    }

    # API request
    response = client.post("/api/appraisals/", json=appraisal_data, headers=auth_headers)
    
    # Verify API response
    assert response.status_code == 201
    assert response.json()["status"] == "Draft"
    
    # Verify database record
    # (async verification code in actual test)
```

### Frontend Integration Test
```typescript
test('login form submits to real backend and shows success', async () => {
  render(<TestWrapper><Login /></TestWrapper>)

  // Fill and submit form
  fireEvent.change(screen.getByLabelText(/work email/i), { 
    target: { value: TEST_CREDENTIALS.email } 
  })
  fireEvent.change(screen.getByLabelText(/password/i), { 
    target: { value: TEST_CREDENTIALS.password } 
  })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

  // Verify real backend response
  await waitFor(() => {
    expect(sessionStorage.getItem('auth_token')).toBeTruthy()
  })
})
```

## Troubleshooting

### Common Issues

**Backend tests fail with connection errors:**
- Verify PostgreSQL is running: `pg_isready`
- Check test database exists: `psql -l | grep performance_management_test`
- Verify connection string in `.env.test`

**Frontend integration tests timeout:**
- Ensure backend is running on port 7000
- Check CORS settings allow `http://localhost:5173`
- Verify `VITE_API_BASE_URL=http://localhost:7000` in frontend env

**Database permission errors:**
- Grant proper permissions: `GRANT ALL ON DATABASE performance_management_test TO postgres;`
- Check PostgreSQL user has CREATE/DROP privileges

### Debug Commands
```powershell
# Check if backend is running
netstat -ano | findstr :7000

# Test backend health
curl http://localhost:7000/

# Check database connection
cd .\backend\
.\.venv\Scripts\Activate.ps1
python -c "from app.db.database import engine; print('DB connection OK')"
```

## Test Organization

### Backend Test Markers
- `@pytest.mark.integration`: Full integration tests with DB
- `@pytest.mark.unit`: Unit tests (fast, no DB)
- `@pytest.mark.slow`: Long-running tests

### Frontend Test Separation
- **Unit tests**: `*.test.tsx` (with MSW mocking)
- **Integration tests**: `*.integration.test.tsx` (real backend calls)
- **E2E tests**: `e2e/*.spec.ts` (Playwright browser automation)

Run different test types:
```powershell
# Backend
pytest -m unit          # Fast unit tests only
pytest -m integration   # Integration tests with DB
pytest -m "not slow"    # Exclude slow tests

# Frontend  
npm run test            # Unit tests with mocks
npm run test:integration # Integration tests with real backend
npm run test:e2e        # E2E tests with browser
```

This setup provides comprehensive testing coverage from unit tests to full end-to-end flows, all without Docker dependencies.
