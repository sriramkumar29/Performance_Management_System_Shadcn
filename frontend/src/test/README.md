# Frontend Test Organization

This directory contains all frontend tests organized by type and functionality.

## Directory Structure

```
src/test/
├── README.md                       # This file
├── mocks/                          # Mock data and handlers
│   ├── handlers.ts                # MSW request handlers
│   └── server.ts                  # MSW test server setup
├── unit/                           # Unit tests for components
│   └── rbac-stage.test.tsx        # RBAC component unit tests
├── integration/                    # Integration tests
│   ├── App.integration.test.tsx   # App integration tests
│   └── integration-setup.ts      # Integration test setup
├── utils/                          # Test utilities and setup
│   ├── test-utils.tsx             # Testing utilities and providers
│   ├── setup.ts                   # Global test setup
│   └── ployfill.ts               # Polyfills for testing
└── __tests__/                      # Auto-discovered tests (optional)
```

## E2E Tests Structure

```
e2e/
├── tests/                          # Playwright E2E tests
│   ├── framework-validation.spec.ts    # Framework validation tests
│   ├── working-e2e.spec.ts            # Working E2E scenarios
│   ├── robust-smoke.spec.ts           # Smoke tests
│   └── business-rules/                 # Business logic tests
│       ├── fixed-goal-weightage-validation.spec.ts
│       └── fixed-business-rules.spec.ts
├── fixtures/                       # Test data and fixtures
│   ├── test-data.ts               # TypeScript test data
│   └── test-data.json             # JSON test data
└── utils/                          # E2E utilities
    └── test-data-manager.ts       # Test data management
```

## Running Tests

### Unit Tests

```bash
npm run test
# or
vitest run src/test/unit/
```

### Integration Tests

```bash
npm run test:integration
# or
vitest run src/test/integration/
```

### E2E Tests

```bash
npm run test:e2e
# or
npx playwright test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## Test Categories

- **Unit Tests**: Test individual React components and utilities in isolation
- **Integration Tests**: Test component interactions and data flow
- **E2E Tests**: Test complete user workflows with Playwright
- **Mocks**: Mock API responses and external dependencies
- **Utils**: Shared testing utilities and setup functions

## Configuration Files

- `vitest.config.ts` - Vitest configuration for unit tests
- `vitest.integration.config.ts` - Vitest configuration for integration tests
- `playwright.config.ts` - Playwright configuration for E2E tests
