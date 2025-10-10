# Delete Draft Appraisal Feature

## Overview

Added the ability to delete draft appraisals directly from the Team Appraisal page, similar to how goal templates can be deleted in the Goal Templates page.

## Changes Made

### 1. New Component: `DeleteAppraisalButton.tsx`

**Location:** `frontend/src/features/appraisal/DeleteAppraisalButton.tsx`

**Features:**

- Displays a destructive "Delete" button with trash icon
- Opens an AlertDialog to confirm deletion
- Shows loading state during deletion ("Deleting...")
- Makes DELETE API call to `/api/appraisals/{id}`
- Shows success/error toast notifications
- Triggers `onSuccess` callback to refresh the appraisal list

**Props:**

- `appraisalId` (number, required): ID of the appraisal to delete
- `appraisalTitle` (string, optional): Description for the confirmation dialog
- `onSuccess` (function, optional): Callback after successful deletion
- `variant` (string, optional): Button variant, defaults to "destructive"
- `className` (string, optional): Additional CSS classes

**Styling:**

- Uses destructive variant (red theme)
- Hover shadow glow effect
- Responsive text (hidden on small screens, shown on larger screens)
- Matches the design pattern from Goal Templates delete button

### 2. Updated: `TeamAppraisal.tsx`

**Location:** `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`

**Changes:**

- Imported `DeleteAppraisalButton` component
- Added delete button alongside edit button for draft appraisals
- Delete button appears only when `status === "Draft"`
- Passes appraisal details to the delete button:
  - `appraisalId`: The ID of the appraisal
  - `appraisalTitle`: Descriptive text showing employee name and appraisal type
  - `onSuccess`: Calls `loadAppraisals()` to refresh the list after deletion
  - `variant`: Set to "destructive" for red styling
  - `className`: Custom styling for borders and shadows

**Button Layout:**

```tsx
{a.status === "Draft" && (
  <>
    <EditAppraisalButton ... />
    <DeleteAppraisalButton ... />
  </>
)}
```

## User Experience

### Before Deletion:

1. User sees "Edit" and "Delete" buttons on draft appraisals
2. Delete button has red/destructive styling to indicate caution

### During Deletion:

1. User clicks "Delete" button
2. AlertDialog opens with:
   - Title: "Delete appraisal?"
   - Description: "This action cannot be undone. This will permanently delete the draft appraisal for [Employee Name] - [Appraisal Type]."
   - Cancel button (outline, gray)
   - Confirm delete button (destructive, red)
3. If user confirms, button shows "Deleting..." loading state

### After Deletion:

1. Success toast: "Appraisal deleted"
2. Appraisal list automatically refreshes
3. Deleted appraisal is removed from the list

### Error Handling:

- If deletion fails, shows error toast with the error message
- Button returns to normal state
- User can try again

## API Endpoint

**DELETE** `/api/appraisals/{appraisal_id}`

- Deletes the specified appraisal
- Should only work for draft appraisals
- Returns success/error response

## Design Pattern

This implementation follows the same pattern as the Goal Template deletion:

- ✅ AlertDialog for confirmation
- ✅ Destructive button styling
- ✅ Loading state during deletion
- ✅ Toast notifications
- ✅ Callback to refresh list
- ✅ Responsive text labels
- ✅ Hover effects and shadows
- ✅ Cannot be undone warning

## Security Considerations

- Only draft appraisals should be deletable
- Backend should verify:
  - Appraisal exists
  - Appraisal is in "Draft" status
  - User has permission to delete (e.g., is the appraiser/creator)
- Frontend only shows delete button for draft status

## Future Enhancements

- Could add permission checks (only show delete to appraisers who created the draft)
- Could add bulk delete functionality
- Could add "soft delete" with restore option
- Could add confirmation checkbox for extra safety

## Testing Checklist

- [x] Delete button appears only for draft appraisals
- [ ] Clicking delete opens confirmation dialog
- [ ] Cancel button closes dialog without deleting
- [ ] Confirm button triggers deletion
- [ ] Success toast appears after deletion
- [ ] List refreshes automatically after deletion
- [ ] Error toast appears if deletion fails
- [ ] Loading state shows during deletion
- [ ] Button is disabled during deletion
- [ ] Responsive layout works on mobile and desktop
- [ ] API returns appropriate error for non-draft appraisals
- [ ] API checks user permissions

## Notes

- MyAppraisal page filters out draft appraisals, so delete button not needed there
- Only Team Appraisal page shows drafts and includes delete functionality
- The delete button uses the same AlertDialog component as Goal Templates for consistency
