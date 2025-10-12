# Overall Assessment & Reviewer Evaluation Fixes

**Date**: October 10, 2025  
**Component**: `frontend/src/components/AppraisalWorkflow.tsx`

## Issues Fixed

### 1. Overall Assessment Not Saving on "Save & Close" ✅

**Problem**: When clicking "Save & Close", the overall assessment rating and comments were not being saved for both appraiser and reviewer evaluations.

**Root Cause**: The `handleSave` function had a comment saying "We don't have appraiser overall in this simplified version" and was not including the overall assessment data in the save payload.

**Solution**:

```typescript
// Added to handleSave function:
if (
  mode === "appraiser-evaluation" &&
  (appraiserOverall.rating || appraiserOverall.comment.trim())
) {
  payload.appraiser_overall_rating = appraiserOverall.rating;
  payload.appraiser_overall_comments = appraiserOverall.comment;
}

if (
  mode === "reviewer-evaluation" &&
  (reviewerOverall.rating || reviewerOverall.comment.trim())
) {
  payload.reviewer_overall_rating = reviewerOverall.rating;
  payload.reviewer_overall_comments = reviewerOverall.comment;
}
```

**Updated Dependencies**: Added `appraiserOverall` and `reviewerOverall` to the `handleSave` useCallback dependency array.

---

### 2. Default Rating Slider Position ✅

**Problem**: Rating slider was expected to default to "Average" (3) position.

**Status**: Already correctly implemented - both appraiser and reviewer overall assessment sliders default to position 3 when rating is null:

```typescript
value={appraiserOverall.rating == null ? [3] : [appraiserOverall.rating]}
value={reviewerOverall.rating == null ? [3] : [reviewerOverall.rating]}
```

**Note**: The slider shows position 3, but the state remains `null` until the user interacts with it. This is intentional - it shows a visual default but doesn't pre-fill the data unless the user explicitly selects it.

---

### 3. Reviewer Evaluation Goal Status ✅

**Problem**: In reviewer evaluation mode, goal squares were showing as incomplete even though reviewers cannot edit individual goals. They should always appear as complete since reviewers only provide overall assessment.

**Root Cause**: The `isGoalComplete` function was checking form data for reviewer mode, but reviewers don't have editable goal fields.

**Solution**:
Updated `isGoalComplete` to always return `true` for reviewer-evaluation mode:

```typescript
const isGoalComplete = useCallback(
  (goalId: number) => {
    // For reviewer evaluation, goals are not editable, so they're always "complete"
    if (mode === "reviewer-evaluation") return true;

    if (isReadOnly) return true;
    const goal = form[goalId];
    return !!(goal?.rating && goal?.comment && goal.comment.trim().length > 0);
  },
  [form, isReadOnly, mode]
);
```

**Result**:

- Goal selection squares show as **green (complete)** for all goals in reviewer mode
- Goal count shows "4 of 4 Goals" (all complete)
- Only the overall assessment button status reflects the reviewer's actual work

---

### 4. Reviewer Evaluation Validation ✅

**Problem**: Validation was checking if goals were filled for reviewer evaluation, but reviewers don't edit individual goals.

**Solution**:
Updated `handleSubmit` validation to skip goal validation for reviewer-evaluation mode:

```typescript
// Validate all goals filled (skip for reviewer-evaluation as they don't edit goals)
if (mode !== "reviewer-evaluation") {
  for (const ag of goals) {
    const v = form[ag.goal.goal_id];
    if (!v?.rating || !v?.comment?.trim()) {
      toast.error("Please provide rating and comment for all goals");
      // ... error handling
      return;
    }
  }
}
```

Also updated payload building to only include goal data when fields are configured:

```typescript
// Only include goal data if ratingField/commentField are configured
if (config.ratingField || config.commentField) {
  for (const ag of goals) {
    // ... build goal payload
  }
}
```

**Result**: Reviewers can submit with only overall assessment filled, without needing to edit individual goals.

---

## Configuration Reference

### Reviewer Evaluation Config

```typescript
"reviewer-evaluation": {
  ratingField: null,        // No individual goal ratings
  commentField: null,       // No individual goal comments
  editableSelfSection: false,
  editableAppraiserSection: false,
  editableReviewerSection: true,  // Only used for overall, not goals
}
```

This configuration makes it clear that reviewers:

- ✅ Can view self assessment sections (read-only)
- ✅ Can view appraiser evaluation sections (read-only)
- ✅ Cannot edit individual goal ratings/comments
- ✅ Can only provide overall assessment rating and comments

---

## Visual Changes

### Before Fix

**Appraiser Evaluation:**

- Save & Close: ❌ Overall assessment not saved
- Goal squares: ✅ Correctly showing progress

**Reviewer Evaluation:**

- Save & Close: ❌ Overall assessment not saved
- Goal squares: ❌ Showing as incomplete (orange/yellow)
- Submit validation: ❌ Incorrectly requiring goal data

### After Fix

**Appraiser Evaluation:**

- Save & Close: ✅ Overall assessment saved
- Goal squares: ✅ Correctly showing progress
- Overall button: 🟣→🟢 Changes to green when complete

**Reviewer Evaluation:**

- Save & Close: ✅ Overall assessment saved
- Goal squares: ✅ All showing as complete (green)
- Overall button: 🟣→🟢 Shows true status of reviewer's work
- Submit validation: ✅ Only validates overall assessment

---

## Testing Checklist

### Appraiser Evaluation Mode

- [ ] Fill in goal ratings and comments
- [ ] Fill in overall assessment rating and comments
- [ ] Click "Save & Close"
- [ ] Verify overall assessment data is saved
- [ ] Reopen page and confirm data is loaded
- [ ] Goal squares show progress correctly
- [ ] Submit validation requires all goals + overall

### Reviewer Evaluation Mode

- [ ] Open reviewer evaluation page
- [ ] Verify all goal squares are green (complete)
- [ ] Verify goal count shows "X of X Goals" (all complete)
- [ ] Goals are visible but not editable
- [ ] Fill in overall assessment rating and comments
- [ ] Click "Save & Close"
- [ ] Verify overall assessment data is saved
- [ ] Reopen page and confirm data is loaded
- [ ] Overall assessment button turns green when complete
- [ ] Submit validation only checks overall assessment
- [ ] Can submit without editing individual goals

---

## Files Modified

- `frontend/src/components/AppraisalWorkflow.tsx`
  - Updated `handleSave`: Added overall assessment data to save payload
  - Updated `handleSave` dependencies: Added `appraiserOverall`, `reviewerOverall`
  - Updated `isGoalComplete`: Added check for reviewer-evaluation mode
  - Updated `isGoalComplete` dependencies: Added `mode`
  - Updated `handleSubmit` validation: Skip goal validation for reviewer mode
  - Updated `handleSubmit` payload building: Conditional goal data inclusion

---

## Status

✅ **All Issues Fixed**

- Overall assessment saves correctly on "Save & Close"
- Default slider position at 3 (Average) - already implemented
- Reviewer goals always show as complete
- Reviewer validation only checks overall assessment
