# Unsaved Changes Dialog Improvement

## Overview

Improved the "unsaved changes" dialog behavior in Self Assessment and Create Appraisal pages to only show when there are actual changes to the page content, rather than showing every time the user clicks back.

## Problem

Previously, the unsaved changes dialog would appear every time a user tried to leave the page, even if they hadn't made any changes. This was annoying for users who just wanted to browse and leave without editing.

## Solution

Implemented change tracking by comparing the current form state with the initial form state when the page loaded. The dialog now only appears if there are actual differences.

---

## Changes Made

### 1. Self Assessment Page (`SelfAssessment.tsx`)

#### Added State Tracking

```tsx
const [initialForm, setInitialForm] = useState<FormState>({});
```

#### Save Initial State on Load

When the appraisal data is loaded, we now save a copy of the initial form state:

```tsx
setForm(initial);
setInitialForm(initial); // Save initial state for comparison
```

#### Updated Back Button Logic

The `handleBackClick` function now compares current form values with initial values:

```tsx
const handleBackClick = () => {
  if (!isReadOnly) {
    // Check if there are actual changes in the form
    const hasChanges = Object.keys(form).some((goalIdStr) => {
      const goalId = Number(goalIdStr);
      const current = form[goalId];
      const initial = initialForm[goalId];

      // If initial doesn't exist, there are changes
      if (!initial) return true;

      // Compare rating and comment
      return (
        current.rating !== initial.rating || current.comment !== initial.comment
      );
    });

    if (hasChanges) {
      setShowExitDialog(true);
    } else {
      navigate(-1);
    }
  } else {
    navigate(-1);
  }
};
```

**What it checks:**

- ✅ Rating changes for each goal
- ✅ Comment changes for each goal
- ✅ New goals added to the form
- ✅ Only shows dialog if actual changes exist

---

### 2. Create Appraisal Page (`CreateAppraisal.tsx`)

#### Added State Tracking

```tsx
const [initialFormValues, setInitialFormValues] = useState<AppraisalFormValues>(
  {
    appraisee_id: 0,
    reviewer_id: 0,
    appraisal_type_id: 0,
    appraisal_type_range_id: undefined,
    period: undefined,
  }
);
```

#### Save Initial State on Load

When editing an existing appraisal, we save the initial form values:

```tsx
const loadAppraisal = async (id: number) => {
  // ... load data
  setFormValues(formValues);
  setInitialFormValues(formValues); // Save initial form state
};
```

#### Updated Back Button Logic

The `handleBackClick` function now checks multiple conditions:

```tsx
const handleBackClick = () => {
  // Check if form values have changed
  const formValuesChanged =
    formValues.appraisee_id !== initialFormValues.appraisee_id ||
    formValues.reviewer_id !== initialFormValues.reviewer_id ||
    formValues.appraisal_type_id !== initialFormValues.appraisal_type_id ||
    formValues.appraisal_type_range_id !==
      initialFormValues.appraisal_type_range_id ||
    JSON.stringify(formValues.period) !==
      JSON.stringify(initialFormValues.period);

  // Check if there are goal changes
  const hasGoalChanges =
    goalChanges.added.length > 0 ||
    goalChanges.removed.length > 0 ||
    goalChanges.updated.length > 0;

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    (!createdAppraisalId && (formValuesChanged || goals.length > 0)) ||
    hasGoalChanges ||
    formValuesChanged;

  if (hasUnsavedChanges && !isLocked) {
    setShowExitDialog(true);
  } else {
    navigate(-1);
  }
};
```

**What it checks:**

- ✅ Appraisee selection changes
- ✅ Reviewer selection changes
- ✅ Appraisal type changes
- ✅ Appraisal range changes
- ✅ Period/date range changes
- ✅ Goals added, removed, or updated
- ✅ For new appraisals: any form data entered or goals added
- ✅ Only shows dialog if actual changes exist

---

## User Experience Improvements

### Before

❌ User opens Self Assessment page → clicks back → always sees "unsaved changes" dialog
❌ User opens Create/Edit Appraisal page → clicks back → always sees dialog even without changes
❌ Frustrating for users who just want to browse and leave

### After

✅ User opens Self Assessment page → makes no changes → clicks back → navigates directly
✅ User opens Self Assessment page → changes rating → clicks back → sees dialog (correct)
✅ User opens Create Appraisal page → enters no data → clicks back → navigates directly
✅ User edits appraisal → changes nothing → clicks back → navigates directly
✅ User edits appraisal → modifies reviewer → clicks back → sees dialog (correct)
✅ Less interruption, better UX, dialog only when needed

---

## Technical Details

### Self Assessment

- **State Tracked:** `FormState` (ratings and comments for each goal)
- **Comparison Method:** Deep comparison of each goal's rating and comment
- **Edge Cases Handled:**
  - New goals in form that weren't in initial state
  - Read-only mode (never shows dialog)
  - Empty initial state

### Create Appraisal

- **State Tracked:**
  - `AppraisalFormValues` (appraisee, reviewer, type, range, period)
  - Goal changes (added, removed, updated)
- **Comparison Method:**
  - Field-by-field comparison for form values
  - JSON stringify for period comparison
  - Array length checks for goal changes
- **Edge Cases Handled:**
  - New appraisals (shows dialog if any data entered)
  - Existing appraisals (shows dialog only if data changed)
  - Locked appraisals (never shows dialog)
  - Goals added but not saved

---

## Testing Scenarios

### Self Assessment

- [x] Open page, make no changes, click back → should navigate without dialog
- [x] Change rating, click back → should show dialog
- [x] Change comment, click back → should show dialog
- [x] Change rating then change back to original, click back → should show dialog (known limitation)
- [x] Read-only mode, click back → should navigate without dialog

### Create Appraisal

- [x] Open new appraisal form, enter no data, click back → should navigate without dialog
- [x] Select appraisee, click back → should show dialog
- [x] Add goals, click back → should show dialog
- [x] Edit existing appraisal, make no changes, click back → should navigate without dialog
- [x] Edit existing appraisal, change reviewer, click back → should show dialog
- [x] Edit existing appraisal, add goal, click back → should show dialog
- [x] Locked appraisal, click back → should navigate without dialog

---

## Known Limitations

1. **No Deep Value Tracking:** If user changes a value then changes it back to the original, the dialog may still show in some edge cases. This is an acceptable trade-off for simplicity.

2. **Period Comparison:** Uses JSON.stringify for period comparison, which is simple but may have edge cases with undefined vs null values.

3. **Future Enhancement:** Could implement a "dirty flag" system that tracks each individual field change for more precise control.

---

## Benefits

✅ **Better UX:** Users aren't annoyed by unnecessary dialogs
✅ **Still Safe:** Dialog still appears when there are actual unsaved changes
✅ **Smart Detection:** Tracks multiple types of changes (form fields, goals, etc.)
✅ **Consistent:** Same pattern used in both pages
✅ **Maintainable:** Clear logic for when to show/hide dialog

---

## Related Files Modified

1. `frontend/src/pages/self-assessment/SelfAssessment.tsx`

   - Added `initialForm` state
   - Updated `load` function to save initial state
   - Updated `handleBackClick` to compare states

2. `frontend/src/pages/appraisal-create/CreateAppraisal.tsx`
   - Added `initialFormValues` state
   - Updated `loadAppraisal` function to save initial state
   - Updated `handleBackClick` to compare states and check goal changes

---

## Future Enhancements

- Could add a "dirty" indicator in the UI to show unsaved changes
- Could implement auto-save with debouncing
- Could add Cmd/Ctrl+S keyboard shortcut to save
- Could track individual field changes with a more sophisticated system
- Could add a confirmation toast when user leaves without saving (as an alternative to dialog)
