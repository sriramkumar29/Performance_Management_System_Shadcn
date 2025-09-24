# Backend Test Organization

This directory contains all backend tests organized by type and functionality.

## Directory Structure

```
tests/
├── README.md                       # This file
├── conftest.py                     # Pytest configuration and fixtures
├── BACKEND_INTEGRATION_TEST_CASES.md  # Test case documentation
├── unit/                           # Unit tests for individual components
│   ├── test_auth.py               # Authentication unit tests
│   ├── test_employees.py          # Employee model/service unit tests
│   ├── test_employees_final.py    # Final employee tests
│   ├── test_appraisals.py         # Appraisal unit tests
│   ├── test_appraisal_types.py    # Appraisal types unit tests
│   ├── test_goals.py              # Goals unit tests
│   ├── test_models.py             # Database model tests
│   ├── test_simple.py             # Simple unit tests
│   ├── test_simple_appraisal.py   # Simple appraisal tests
│   ├── test_final_appraisal.py    # Final appraisal tests
│   ├── test_validation.py         # Validation tests
│   └── test_date_calculator_comprehensive.py  # Date calculation tests
├── integration/                    # Integration tests for API endpoints
│   ├── test_integration_appraisal.py    # Appraisal integration tests
│   ├── test_integration_workflows.py   # Workflow integration tests
│   ├── test_integration_router_middleware.py  # Router/middleware tests
│   └── test_simple_integration.py      # Simple integration tests
├── utils/                          # Database and utility tests
│   ├── test_config.py             # Configuration tests
│   ├── test_database.py           # Database connection tests
│   ├── test_db_utils.py           # Database utility tests
│   └── test_date_calculator.py    # Date calculator utility tests
├── fixtures/                       # Test data and fixtures
└── __init__.py                     # Make tests a package
```

## Running Tests

### All Tests

```bash
pytest
```

### Unit Tests Only

```bash
pytest tests/unit/
```

### Integration Tests Only

```bash
pytest tests/integration/
```

### Utility Tests Only

```bash
pytest tests/utils/
```

### Specific Test File

```bash
pytest tests/unit/test_auth.py -v
```

## Test Categories

- **Unit Tests**: Test individual functions, classes, and components in isolation
- **Integration Tests**: Test API endpoints and component interactions
- **Utility Tests**: Test database connections, configuration, and helper functions
- **Fixtures**: Reusable test data and setup functions
