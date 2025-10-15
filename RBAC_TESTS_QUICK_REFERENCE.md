# Quick Reference - Appraisal Creation RBAC Tests

## Test File

`frontend/src/features/appraisal/__tests__/AppraisalCreationRBAC.test.tsx`

## Run Commands

```bash
# Run RBAC tests only
npx vitest run src/features/appraisal/__tests__/AppraisalCreationRBAC.test.tsx --reporter verbose

# Run all appraisal tests
npx vitest run src/features/appraisal/__tests__/

# Run all tests
npx vitest run

# Watch mode
npx vitest src/features/appraisal/__tests__/AppraisalCreationRBAC.test.tsx
```

## Test Results Summary

✅ **21/21 tests passing (100%)**
⏱️ **~2 seconds execution time**

## Test Breakdown

### Authorization Tests (4 tests)

- ✅ Manager (level=3) can create appraisal
- ✅ Manager can initiate creation workflow
- ✅ Employee (level=1) cannot see button
- ✅ Employee completely blocked from UI

### Level Enforcement (6 tests)

- ✅ Level 3 (Manager) - allowed
- ✅ Level 4 (Director) - allowed
- ✅ Recognized role names (Manager, Lead, Head, etc.) - allowed
- ✅ Level 2 (Senior Developer) - denied
- ✅ Level 1 (Employee) - denied
- ✅ Level 0 (Intern) - denied

### Validation Tests (5 tests)

- ✅ Valid reviewer (different from appraisee) - accepted
- ✅ Reviewer = Appraisee - rejected
- ✅ Reviewer = Appraiser - rejected
- ✅ All required fields present - accepted
- ✅ Missing required fields - rejected

### Edge Cases (4 tests)

- ✅ Null user handled gracefully
- ✅ Undefined role level handled
- ✅ Null role level handled
- ✅ Role name priority over level

### Integration (2 tests)

- ✅ Complete manager workflow
- ✅ Employee workflow blocked

## Authorization Rules

### Access Granted When:

```typescript
// Priority 1: Role name matches pattern
emp_roles matches /manager|lead|head|director|vp|chief|cxo|cto|ceo|admin/i

OR

// Priority 2: Level threshold
emp_roles_level > 2  // i.e., level 3+
```

### Recognized Manager Roles:

- Manager
- Lead / Team Lead
- Head / Department Head
- Director
- VP / Vice President
- Chief / Chief Officer
- CTO, CEO, CXO
- Admin / Administrator

### Access Denied When:

- `emp_roles_level` ≤ 2 AND role name doesn't match pattern
- User is null/undefined
- Role level is null/undefined/missing AND role name doesn't match

## Mock Users for Testing

```typescript
// ✅ Has Access
const mockManager = {
  emp_roles: "Manager",
  emp_roles_level: 3,
};

// ❌ No Access
const mockEmployee = {
  emp_roles: "Software Engineer",
  emp_roles_level: 1,
};

// ❌ No Access (level 2, no manager keyword in role)
const mockSupervisor = {
  emp_roles: "Senior Developer",
  emp_roles_level: 2,
};
```

## Key Test Patterns

### Testing Button Visibility

```typescript
// Should be visible
const createButton = screen.getByRole("button", { name: /create appraisal/i });
expect(createButton).toBeInTheDocument();

// Should NOT be visible
const createButton = screen.queryByRole("button", {
  name: /create appraisal/i,
});
expect(createButton).not.toBeInTheDocument();
```

### Testing API Validation

```typescript
const result = await apiFetch("/appraisals", {
  method: "POST",
  body: JSON.stringify({
    /* data */
  }),
});

expect(result.ok).toBe(true); // or false for errors
expect(result.error).toBe("Expected error message");
```

## Required Fields for Appraisal Creation

### Minimum Required:

- `appraisee_id` (number)
- `reviewer_id` (number)
- `appraisal_type_id` (number)

### Optional:

- `appraisal_type_range_id` (number)
- `period_start` (string/date)
- `period_end` (string/date)

### Validation Rules:

- `reviewer_id` ≠ `appraisee_id`
- `reviewer_id` ≠ `appraiser_id` (current user)
- All required fields must be present

## Troubleshooting

### Test Failures

**Button appears when it shouldn't:**

- Check if role name contains manager keywords
- Role name takes precedence over level

**Button doesn't appear when it should:**

- Verify emp_roles_level > 2 OR role name matches pattern
- Check AuthContext is properly mocked

**API validation tests fail:**

- Ensure apiFetch mock returns expected structure
- Check body parsing in mock implementation

### Common Issues

1. **Role name priority:** "Team Lead" role grants access even at level 2

   - Solution: Use "Senior Developer" or similar for level 2 tests

2. **Mock not applied:** Import order matters

   - vi.mock() must be before component imports

3. **Async timing:** Some interactions need await
   - Use userEvent.click() with await
   - waitFor() for async state updates

## Coverage Checklist

- [x] Positive cases (authorized users)
- [x] Negative cases (unauthorized users)
- [x] Boundary testing (level 3 threshold)
- [x] Role name pattern matching
- [x] Field validation (required/optional)
- [x] Reviewer assignment rules
- [x] Null/undefined handling
- [x] Integration workflow
- [x] Error messages

## Related Files

### Production Code

- `frontend/src/features/appraisal/CreateAppraisalButton.tsx` - Button component with RBAC
- `frontend/src/contexts/AuthContext.tsx` - User authentication context
- `frontend/src/pages/appraisal-create/CreateAppraisal.tsx` - Full create page

### Other Test Files

- `frontend/src/features/goals/__tests__/GoalWeightageCategory.test.tsx` - Similar test patterns

### Documentation

- `APPRAISAL_CREATION_RBAC_TESTS.md` - Detailed test documentation
- `TEST_FIXES_SUMMARY.md` - Goal test fixes (reference for patterns)
