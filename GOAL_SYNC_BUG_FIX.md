# Goal Sync Bug Fix

## Issue

When creating a new appraisal and adding goals, clicking "Submit for Acknowledgement" would fail with a 500 error:

```
Cannot submit appraisal: must have goals totalling 100% weightage (current: 0 goals, 0% weightage)
```

Even though goals were added in the UI, they were never saved to the database.

## Root Cause

In `CreateAppraisalModal.tsx`, the `handleSubmit` function had a critical bug:

```typescript
if (!createdAppraisalId) {
  setCreatedAppraisalId(appraisalId);
  setCreatedAppraisalStatus("Draft");
  setOriginalGoals([...goals]); // ❌ BUG: Marking goals as "original" without saving them
  toast.success("Draft saved successfully");
}
```

### The Problem:

1. When saving a new appraisal for the first time, only the appraisal metadata was saved to the backend
2. `setOriginalGoals([...goals])` marked the goals as "already in database"
3. The `goalChanges.added` array still contained the goals
4. When submitting, `syncGoalChanges` would run, but the logic had a check:
   ```typescript
   const alreadyOnServer = originalGoals.some(
     (g) => g.goal.goal_id === goalData.goal.goal_id
   );
   if (alreadyOnServer) continue; // ❌ Skipped adding the goal!
   ```
5. Result: Goals were never sent to the backend database

## Solution

Modified `handleSubmit` to sync goals immediately after creating a new appraisal:

```typescript
if (!createdAppraisalId) {
  // New appraisal created - sync goals immediately
  setCreatedAppraisalId(appraisalId);
  setCreatedAppraisalStatus("Draft");

  // Sync goals to the backend
  if (
    goalChanges.added.length > 0 ||
    goalChanges.removed.length > 0 ||
    goalChanges.updated.length > 0
  ) {
    await syncGoalChanges(appraisalId); // ✅ Save goals to database
  } else {
    // No changes to sync, just update original goals
    setOriginalGoals([...goals]);
  }

  toast.success("Draft saved successfully");
}
```

## How It Works Now

### Creating New Appraisal:

1. User fills in appraisal details and adds goals
2. Goals are tracked in `goalChanges.added` array
3. User clicks "Save Draft"
4. Appraisal metadata is saved → receives `appraisalId`
5. **NEW:** `syncGoalChanges(appraisalId)` is called immediately
6. Goals are created and attached to the appraisal in the database
7. `originalGoals` is updated after successful sync
8. User can now submit for acknowledgement

### Editing Existing Appraisal:

- Works as before - changes are synced when saving

### Submitting for Acknowledgement:

1. User clicks "Submit for Acknowledgement"
2. `syncGoalChanges` runs (saves any pending changes)
3. `submitAppraisal` changes status to "Submitted"
4. Backend validates that goals total 100% ✅
5. Success!

## Files Changed

- `frontend/src/features/appraisal/CreateAppraisalModal.tsx` - Fixed goal sync logic

## Testing

1. ✅ Create new appraisal
2. ✅ Add goals (ensure total weightage = 100%)
3. ✅ Click "Save Draft"
4. ✅ Check that goals are saved (refresh and reopen modal)
5. ✅ Click "Submit for Acknowledgement"
6. ✅ Should succeed without error

## Related Issues

This also fixes a potential data loss issue where users could:

- Add goals
- Save draft
- Close modal
- Goals would be lost on next open

Now goals are properly persisted to the database on first save.
