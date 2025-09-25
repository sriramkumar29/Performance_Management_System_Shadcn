# Test Organization Documentation

This document outlines the organized test structure for the Performance Management System, covering both frontend and backend testing strategies.

## 📁 Directory Structure

### Backend Tests (`backend/tests/`)

```
backend/tests/
├── README.md                           # Backend test documentation
├── __init__.py                         # Package initialization
├── conftest.py                         # Pytest configuration and fixtures
├── BACKEND_INTEGRATION_TEST_CASES.md   # Test case documentation
├── unit/                               # Unit tests for individual components
│   ├── __init__.py
│   ├── test_auth.py                   # Authentication unit tests
│   ├── test_employees.py              # Employee model/service unit tests
│   ├── test_employees_final.py        # Final employee tests
│   ├── test_appraisals.py             # Appraisal unit tests
│   ├── test_appraisal_types.py        # Appraisal types unit tests
│   ├── test_goals.py                  # Goals unit tests
│   ├── test_models.py                 # Database model tests
│   ├── test_simple.py                 # Simple unit tests
│   ├── test_simple_appraisal.py       # Simple appraisal tests
│   ├── test_final_appraisal.py        # Final appraisal tests
│   ├── test_validation.py             # Validation tests
│   └── test_date_calculator_comprehensive.py  # Date calculation tests
├── integration/                        # Integration tests for API endpoints
│   ├── __init__.py
│   ├── test_integration_appraisal.py  # Appraisal integration tests
│   ├── test_integration_workflows.py # Workflow integration tests
│   ├── test_integration_router_middleware.py  # Router/middleware tests
│   └── test_simple_integration.py     # Simple integration tests
├── utils/                              # Database and utility tests
│   ├── __init__.py
│   ├── test_config.py                 # Configuration tests
│   ├── test_database.py               # Database connection tests
│   ├── test_db_utils.py               # Database utility tests
│   └── test_date_calculator.py        # Date calculator utility tests
└── fixtures/                           # Test data and fixtures
    └── __init__.py
```

### Frontend Tests (`frontend/src/test/`)

```
frontend/src/test/
├── README.md                           # Frontend test documentation
├── mocks/                              # Mock data and handlers
│   ├── handlers.ts                    # MSW request handlers
│   └── server.ts                      # MSW test server setup
├── unit/                               # Unit tests for components
│   ├── index.ts                       # Unit tests exports
│   └── rbac-stage.test.tsx            # RBAC component unit tests
├── integration/                        # Integration tests
│   ├── index.ts                       # Integration tests exports
│   ├── App.integration.test.tsx       # App integration tests
│   └── integration-setup.ts           # Integration test setup
└── utils/                              # Test utilities and setup
    ├── index.ts                       # Utils exports
    ├── test-utils.tsx                 # Testing utilities and providers
    ├── setup.ts                      # Global test setup
    └── ployfill.ts                   # Polyfills for testing
```

### Frontend E2E Tests (`frontend/e2e/`)

```
frontend/e2e/
├── tests/                              # Playwright E2E tests
│   ├── framework-validation.spec.ts   # Framework validation tests
│   ├── working-e2e.spec.ts           # Working E2E scenarios
│   ├── robust-smoke.spec.ts          # Smoke tests
│   └── business-rules/                # Business logic tests
│       ├── fixed-goal-weightage-validation.spec.ts
│       └── fixed-business-rules.spec.ts
├── fixtures/                           # Test data and fixtures
│   ├── test-data.ts                   # TypeScript test data
│   └── test-data.json                 # JSON test data
└── utils/                              # E2E utilities
    └── test-data-manager.ts           # Test data management
```

## 🚀 Running Tests

### Backend Tests

#### Using PowerShell Script (Recommended)

```powershell
# Run all backend tests
.\run_backend_tests.ps1

# Run specific test categories
.\run_backend_tests.ps1 unit
.\run_backend_tests.ps1 integration
.\run_backend_tests.ps1 utils

# Run with coverage and verbose output
.\run_backend_tests.ps1 all -Coverage -Verbose
```

#### Using Python Script

```bash
# Run all tests
python run_tests.py all

# Run specific categories
python run_tests.py unit
python run_tests.py integration
python run_tests.py utils

# Run with coverage
python run_tests.py all --coverage --verbose
```

#### Using Pytest Directly

```bash
# All tests
pytest tests/

# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# Utility tests only
pytest tests/utils/

# Specific test file
pytest tests/unit/test_auth.py -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Frontend Tests

#### Using PowerShell Script (Recommended)

```powershell
# Run all frontend tests
.\run_frontend_tests.ps1

# Run specific test categories
.\run_frontend_tests.ps1 unit
.\run_frontend_tests.ps1 integration
.\run_frontend_tests.ps1 e2e

# Run with watch mode, coverage, or UI
.\run_frontend_tests.ps1 all -Watch
.\run_frontend_tests.ps1 all -Coverage
.\run_frontend_tests.ps1 all -UI
```

#### Using NPM Scripts

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

## 📋 Test Categories

### Backend

- **Unit Tests (`tests/unit/`)**: Test individual functions, classes, and components in isolation

  - Model tests
  - Service tests
  - Utility function tests
  - Authentication tests
  - Validation tests

- **Integration Tests (`tests/integration/`)**: Test API endpoints and component interactions

  - Router tests
  - Middleware tests
  - Workflow tests
  - End-to-end API tests

- **Utility Tests (`tests/utils/`)**: Test database connections, configuration, and helper functions
  - Database connection tests
  - Configuration tests
  - Helper utility tests

### Frontend

- **Unit Tests (`src/test/unit/`)**: Test individual React components and utilities in isolation

  - Component rendering tests
  - Hook tests
  - Utility function tests
  - RBAC tests

- **Integration Tests (`src/test/integration/`)**: Test component interactions and data flow

  - App integration tests
  - Context provider tests
  - API integration tests

- **E2E Tests (`e2e/tests/`)**: Test complete user workflows with Playwright
  - User journey tests
  - Business rule validation
  - Cross-browser testing

## 🔧 Configuration Files

### Backend

- `pytest.ini` - Pytest configuration with organized test paths
- `conftest.py` - Shared fixtures and test configuration

### Frontend

- `vitest.config.ts` - Vitest configuration for unit tests
- `vitest.integration.config.ts` - Vitest configuration for integration tests
- `playwright.config.ts` - Playwright configuration for E2E tests

## 📊 Test Scripts

### Root Level Scripts

- `run_backend_tests.ps1` - PowerShell script for backend test execution
- `run_frontend_tests.ps1` - PowerShell script for frontend test execution

### Backend Scripts

- `run_tests.py` - Python script for organized test execution

### Frontend Package.json Scripts

- `test` - Run all unit tests
- `test:unit` - Run unit tests only
- `test:integration` - Run integration tests only
- `test:e2e` - Run E2E tests
- `test:watch` - Run tests in watch mode
- `test:coverage` - Run tests with coverage report
- `test:ui` - Run tests with UI interface

## 🎯 Best Practices

1. **Organized Structure**: Tests are organized by type and functionality
2. **Clear Naming**: Test files follow consistent naming conventions
3. **Proper Imports**: Each test directory has index files for easy imports
4. **Documentation**: Each test directory includes README files
5. **Easy Execution**: Multiple ways to run tests with convenient scripts
6. **Coverage Reports**: Built-in coverage reporting for both frontend and backend
7. **Watch Mode**: Development-friendly watch modes for continuous testing

## 🚀 Getting Started

1. **Backend Testing**:

   ```powershell
   cd backend
   .\run_backend_tests.ps1 unit -Verbose
   ```

2. **Frontend Testing**:

   ```powershell
   cd frontend
   .\run_frontend_tests.ps1 unit -Watch
   ```

3. **Full Test Suite**:
   ```powershell
   # From root directory
   .\run_backend_tests.ps1 all -Coverage
   .\run_frontend_tests.ps1 all -Coverage
   ```

This organized structure makes it easy to run specific test categories, understand test coverage, and maintain a clean testing workflow.
