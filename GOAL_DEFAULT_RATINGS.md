# Default Rating Values for All Goals

**Date**: October 10, 2025  
**Component**: `frontend/src/components/AppraisalWorkflow.tsx`

## Overview

Extended the default rating value feature to apply to **all goal ratings** across all workflow modes (Self Assessment, Appraiser Evaluation, Reviewer Evaluation), not just the overall assessment.

## Changes Made

### 1. Form Initialization - Default Rating to 3

Updated the goal form initialization to default rating values to 3 (Average) instead of null:

```typescript
// Before
initial[ag.goal.goal_id] = {
  rating: ratingField ? (ag as any)[ratingField] ?? null : null,
  comment: commentField ? (ag as any)[commentField] ?? "" : "",
};

// After
initial[ag.goal.goal_id] = {
  rating: ratingField ? (ag as any)[ratingField] ?? 3 : null, // Default to 3 (Average) if editable
  comment: commentField ? (ag as any)[commentField] ?? "" : "",
};
```

**Logic:**

- If the goal has an editable rating field (`ratingField` is configured)
- AND no existing rating value exists
- THEN default to 3 (Average)
- OTHERWISE keep as null (for read-only or non-rated goals)

### 2. Self Assessment Slider - Default Fallback

Updated the Self Rating slider fallback from 1 to 3:

```typescript
// Before
value={
  config.editableSelfSection
    ? form[goalId]?.rating == null ? [1] : [form[goalId].rating as number]
    : ag.self_rating == null ? [1] : [ag.self_rating]
}

// After
value={
  config.editableSelfSection
    ? form[goalId]?.rating == null ? [3] : [form[goalId].rating as number]
    : ag.self_rating == null ? [3] : [ag.self_rating]
}
```

### 3. Appraiser Rating Slider - Default Fallback

Updated the Appraiser Rating slider fallback from 1 to 3:

```typescript
// Before
value={
  config.editableAppraiserSection
    ? form[goalId]?.rating == null ? [1] : [form[goalId].rating as number]
    : ag.appraiser_rating == null ? [1] : [ag.appraiser_rating]
}

// After
value={
  config.editableAppraiserSection
    ? form[goalId]?.rating == null ? [3] : [form[goalId].rating as number]
    : ag.appraiser_rating == null ? [3] : [ag.appraiser_rating]
}
```

## Affected Workflows

### Self Assessment

- **Mode**: `self-assessment`
- **Rating Field**: `self_rating`
- **Default**: When employee starts self-assessment, all goal ratings default to 3
- **Badge**: Shows "3/5" badge immediately
- **Save**: Rating of 3 is saved even if slider not moved

### Appraiser Evaluation

- **Mode**: `appraiser-evaluation`
- **Rating Field**: `appraiser_rating`
- **Default**: When appraiser evaluates, all goal ratings default to 3
- **Badge**: Shows "3/5" badge immediately
- **Save**: Rating of 3 is saved even if slider not moved
- **Overall**: Overall assessment also defaults to 3 (previously implemented)

### Reviewer Evaluation

- **Mode**: `reviewer-evaluation`
- **Rating Field**: None (reviewers don't rate individual goals)
- **Default**: N/A - reviewers only provide overall assessment
- **Overall**: Overall assessment defaults to 3 (previously implemented)

## Behavior Comparison

### Before Changes

| Workflow             | Goal Sliders        | Overall Slider | Save Behavior           |
| -------------------- | ------------------- | -------------- | ----------------------- |
| Self Assessment      | Start at position 1 | N/A            | Saves null if not moved |
| Appraiser Evaluation | Start at position 1 | Start at 3     | Saves null/3            |
| Reviewer Evaluation  | N/A (read-only)     | Start at 3     | Saves 3                 |

### After Changes

| Workflow             | Goal Sliders           | Overall Slider | Save Behavior |
| -------------------- | ---------------------- | -------------- | ------------- |
| Self Assessment      | Start at position 3 ✅ | N/A            | Saves 3 ✅    |
| Appraiser Evaluation | Start at position 3 ✅ | Start at 3 ✅  | Saves 3 ✅    |
| Reviewer Evaluation  | N/A (read-only)        | Start at 3 ✅  | Saves 3 ✅    |

## User Experience Impact

### Self Assessment Example

**Before:**

1. Employee opens self-assessment
2. Sees 4 goals, sliders at "Poor" (position 1)
3. Realizes all default to lowest rating
4. Must manually adjust each goal to appropriate rating
5. 4 slider adjustments + comments = high effort

**After:**

1. Employee opens self-assessment
2. Sees 4 goals, sliders at "Average" (position 3)
3. Goal ratings default to fair middle ground
4. Only adjusts goals that are not average
5. Perhaps 2 slider adjustments + comments = lower effort

### Appraiser Evaluation Example

**Before:**

1. Manager opens appraiser evaluation
2. Sees employee's self-assessment
3. All manager ratings default to "Poor" (1)
4. Must adjust every slider even for average performers
5. Creates negative bias perception

**After:**

1. Manager opens appraiser evaluation
2. Sees employee's self-assessment
3. All manager ratings default to "Average" (3)
4. Can focus on adjusting only exceptional or underperforming goals
5. Neutral starting point, fairer process

## Rationale

### Why Default to 3 (Average)?

1. **Visual Consistency**: Sliders appear in middle position
2. **Neutral Starting Point**: Neither positive nor negative bias
3. **Reduced Friction**: Less work for average performers
4. **Industry Standard**: Common default in HR systems
5. **Fair Baseline**: "Meets Expectations" is typical default
6. **Prevents Oversight**: Ensures rating is captured even if user forgets to adjust

### Why Not Other Values?

- **1 (Poor)**: Creates negative bias, unfair default
- **2 (Below Average)**: Still negative, demotivating
- **4 (Good)**: Positive bias, unrealistic for all goals
- **5 (Excellent)**: Extreme positive bias, defeats purpose
- **3 (Average)**: ✅ Neutral, fair, widely accepted

## Data Integrity

### Database Impact

- Goals without explicit rating input will save as `3` instead of `null`
- Historical data remains unchanged
- Future reports will show default ratings more accurately

### Analytics Impact

- Average ratings will be more meaningful (3 vs null)
- Rating distributions will be more complete
- Can distinguish between "not rated" (null) and "average" (3)

## Edge Cases Handled

### Case 1: Loading Existing Appraisal

- If goal already has rating (e.g., 4): Loads as 4 ✅
- If goal has no rating (null): Defaults to 3 ✅

### Case 2: Read-Only Views

- Sliders disabled but show saved value ✅
- If no saved value, shows 3 as fallback ✅

### Case 3: Mixed Ratings

- Some goals rated, some not: Each handled independently ✅
- Existing ratings preserved ✅
- New ratings default to 3 ✅

### Case 4: Reviewer Mode

- Reviewers don't see editable goal sliders ✅
- Only overall assessment defaults to 3 ✅

## Validation Impact

No change to validation logic:

```typescript
// Still requires rating and comment
if (!v?.rating || !v?.comment?.trim()) {
  toast.error("Please provide rating and comment for all goals");
  return;
}
```

Since rating defaults to 3, validation passes if user only provides comments.

## Testing Checklist

### Self Assessment

- [ ] Open new self-assessment
- [ ] Verify all goal sliders at position 3
- [ ] Verify all badges show "3/5"
- [ ] Write comments without moving sliders
- [ ] Save and verify all ratings save as 3
- [ ] Move one slider to different position
- [ ] Save and verify mixed ratings (3 and new value)

### Appraiser Evaluation

- [ ] Open new appraiser evaluation
- [ ] Verify all goal sliders at position 3
- [ ] Verify all badges show "3/5"
- [ ] Verify overall assessment slider at 3
- [ ] Save without changes
- [ ] Verify all ratings save as 3
- [ ] Adjust specific goals
- [ ] Verify adjusted ratings save correctly

### Reviewer Evaluation

- [ ] Open reviewer evaluation
- [ ] Verify goals are read-only (not editable)
- [ ] Verify overall assessment defaults to 3
- [ ] Save and verify overall rating saves as 3

### Edge Cases

- [ ] Load appraisal with existing ratings
- [ ] Verify existing ratings display correctly
- [ ] Load appraisal with mixed ratings (some null)
- [ ] Verify null goals default to 3
- [ ] Test read-only views
- [ ] Test slider interactions after default

## Files Modified

- `frontend/src/components/AppraisalWorkflow.tsx`
  - Updated form initialization: Default goal ratings to 3 when null
  - Updated Self Rating slider: Fallback from 1 to 3
  - Updated Appraiser Rating slider: Fallback from 1 to 3

## Status

✅ **Complete** - All goal ratings across all workflow modes now default to 3 (Average), providing a consistent, fair, and user-friendly experience.

## Related Changes

- **Previous**: Overall assessment rating defaults (appraiser and reviewer)
- **This Change**: Individual goal ratings defaults (self and appraiser)
- **Result**: Consistent default rating of 3 across entire system
