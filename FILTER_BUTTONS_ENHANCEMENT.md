# Filter Buttons Enhancement

## Summary

Added "All" and "Overdue" filter buttons to both My Appraisal and Team Appraisal pages for better appraisal management and visibility.

## Changes Made

### 1. Team Appraisal Page (`frontend/src/pages/team-appraisal/TeamAppraisal.tsx`)

#### New Filter Options

- **All**: Shows all appraisals (drafts, active, completed) for the user as appraiser or reviewer
- **Active**: Shows non-draft, non-complete appraisals (existing functionality)
- **Completed**: Shows completed appraisals (existing functionality)
- **Draft**: Shows draft appraisals (existing functionality)
- **Overdue**: Shows appraisals where the end date has passed and status is not "Complete"

#### Implementation Details

- Updated `TeamTab` type to include "All" and "Overdue"
- Added filtering logic for overdue appraisals (end_date < today AND status !== "Complete")
- Added `allTeam` and `overdueTeam` arrays to compute filtered lists
- Updated `filteredTeamWithDraft` useMemo to handle all 5 filter cases
- Added two new filter buttons to the UI with badge counts
- Updated URL parameter handling to persist "All" and "Overdue" tab states
- Made button container flex-wrap for responsive layout on smaller screens

#### Code Structure

```typescript
type TeamTab = "All" | "Active" | "Completed" | "Draft" | "Overdue";

const overdueTeam = appraisalsInPeriod.filter((a) => {
  const endDate = new Date(a.end_date);
  endDate.setHours(0, 0, 0, 0);
  return (
    endDate < today &&
    a.status !== "Complete" &&
    (a.appraiser_id === user?.emp_id || a.reviewer_id === user?.emp_id)
  );
});

const allTeam = appraisalsInPeriod.filter(
  (a) => a.appraiser_id === user?.emp_id || a.reviewer_id === user?.emp_id
);
```

### 2. My Appraisal Page (`frontend/src/pages/my-appraisal/MyAppraisal.tsx`)

#### New Filter Options

- **All**: Shows all appraisals for the user (as appraisee)
- **Active**: Shows non-draft, non-complete appraisals (existing functionality)
- **Completed**: Shows completed appraisals (existing functionality)
- **Overdue**: Shows appraisals where the end date has passed and status is not "Complete"

#### Implementation Details

- Updated `FilterType` type to include "All" and "Overdue"
- Modified `useAppraisalFiltering` hook to compute and return `myOverdue` and `myAll` arrays
- Updated filtering switch statement to handle all 4 filter cases
- Added two new filter buttons to the UI with badge counts
- Made button container flex-wrap for responsive layout on smaller screens
- Extracted nested ternary for borderLeftColor into simple if/else for better code quality

#### Code Structure in Hook

```typescript
const myOverdue = useMemo(() => {
  return appraisalsInPeriod.filter((a) => {
    const endDate = new Date(a.end_date);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today && a.status !== "Complete";
  });
}, [appraisalsInPeriod]);

const myAll = useMemo(() => appraisalsInPeriod, [appraisalsInPeriod]);
```

## User Benefits

### 1. Better Visibility

- **All Button**: Quickly see total count of all appraisals in the selected period
- **Overdue Button**: Immediately identify appraisals that need urgent attention

### 2. Improved Time Management

- Overdue filter helps managers and appraisees prioritize tasks
- Red badge count shows how many appraisals are past their due date

### 3. Consistent Experience

- Both My Appraisal and Team Appraisal pages have identical filtering options
- Persistent tab state via URL parameters (Team Appraisal)

### 4. Responsive Design

- Filter buttons wrap on smaller screens for better mobile experience
- Badge counts remain visible on all screen sizes

## Technical Notes

### Date Comparison Logic

- Time component is normalized to 00:00:00 for accurate date-only comparison
- Uses client-side date object: `new Date()` with `setHours(0, 0, 0, 0)`
- Overdue condition: `endDate < today && status !== "Complete"`

### Performance

- All filtering logic uses `useMemo` hooks to avoid unnecessary recalculations
- Filters are computed once per period/data change and cached

### Code Quality Improvements

- Extracted nested ternary operators into clear if/else blocks
- Added flex-wrap to button containers for better responsive behavior
- Maintained consistent styling with existing button patterns

## Testing Checklist

- [ ] Verify "All" button shows correct total count in both pages
- [ ] Verify "Overdue" button filters correctly based on end_date
- [ ] Verify overdue count updates when appraisals are completed
- [ ] Test filter button active/inactive states
- [ ] Test responsive layout on mobile/tablet screen sizes
- [ ] Verify URL parameter persistence for Team Appraisal tabs
- [ ] Verify pagination resets when changing filters
- [ ] Test search/type filters work correctly with new "All" and "Overdue" filters

## Future Enhancements

1. **Visual Indicators**: Add red/orange visual cues for overdue items in the list
2. **Notifications**: Send automatic reminders for overdue appraisals
3. **Sort Options**: Add ability to sort overdue items by urgency (days overdue)
4. **Filter Combinations**: Allow multiple filters to be active simultaneously (e.g., "Active + Overdue")
5. **Date Range Selector**: Quick filters for "Last 7 Days", "Last 30 Days", "Last Quarter"

## Related Files

- `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`
- `frontend/src/pages/my-appraisal/MyAppraisal.tsx`
- `frontend/src/components/PeriodFilter.tsx` (used for date filtering)
- `frontend/src/components/AppraisalCard.tsx` (display component)

## Date

January 2025
