# Create/Edit Appraisal Modal Implementation

## Overview

Converted b### 4. **Updated Component: TeamAppraisal.tsx**
**Location:** `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`

**Changes:**

- Imported `EditAppraisalButton` component
- Replaced Edit button navigation with `EditAppraisalButton` component
- Extracted `loadAppraisals` function for reuse
- Removed unused `handleEditDraft` function and `Edit` icon import
- Edit button now opens modal instead of navigating to separate page
- Passes `loadAppraisals` as `onSuccess` callback to refresh list after edit

**Before:**

```tsx
<Button onClick={() => handleEditDraft(a.appraisal_id)}>
  <Edit className="h-4 w-4 mr-1" />
  <span>Edit</span>
</Button>
```

**After:**

````tsx
<EditAppraisalButton
  appraisalId={a.appraisal_id}
  onSuccess={loadAppraisals}
  variant="outline"
  className="border-primary/30 text-primary hover:bg-primary/5"
/>
```th Create and Edit Appraisal pages into modal dialogs for better UX. The modals open when users click the "Create Appraisal" or "Edit" buttons instead of navigating to separate pages.

## Changes Made

### 1. **New Component: CreateAppraisalModal.tsx**
**Location:** `frontend/src/features/appraisal/CreateAppraisalModal.tsx`

**Features:**
- Full-featured appraisal creation AND editing interface in a modal dialog
- Uses shadcn/ui Dialog component for modal functionality
- Supports both create and edit modes via optional `appraisalId` prop
- Maintains all functionality from the original page:
  - Appraisal details form
  - Goals section with add/edit/remove capabilities
  - Import from template
  - Save draft
  - Submit for acknowledgement
- Automatic form reset and close on successful submission
- Support for callback on successful creation/edit via `onSuccess` prop

**Props:**
```typescript
interface CreateAppraisalModalProps {
  open: boolean;           // Controls modal visibility
  onClose: () => void;     // Called when modal should close
  onSuccess?: () => void;  // Called after successful submission
  appraisalId?: number;    // Optional: for editing existing appraisals
}
````

**Key Implementation Details:**

- Uses `Dialog`, `DialogContent`, `DialogHeader`, and `DialogTitle` from shadcn/ui
- Modal content is scrollable with `max-h-[90vh] overflow-y-auto`
- Large modal width with `max-w-5xl` for comfortable viewing
- All child modals (AddGoalModal, EditGoalModal, ImportFromTemplateModal) work within the modal
- Form state is fully reset when modal closes via cancel or successful submission
- When `appraisalId` is provided, loads existing appraisal data on mount
- Uses `loadAppraisalHelper` to fetch and populate form with existing data

### 2. **New Component: EditAppraisalButton.tsx**

**Location:** `frontend/src/features/appraisal/EditAppraisalButton.tsx`

**Features:**

- Reusable button component for editing draft appraisals
- Manages modal state internally
- Opens CreateAppraisalModal with the provided appraisalId
- Customizable variant and className props
- Default refresh behavior or custom onSuccess callback

**Props:**

```typescript
interface EditAppraisalButtonProps {
  appraisalId: number; // Required: ID of appraisal to edit
  onSuccess?: () => void; // Optional: callback after successful edit
  variant?: "default" | "outline" | "ghost" | "elevated"; // Button variant
  className?: string; // Additional CSS classes
}
```

**Usage Example:**

```tsx
<EditAppraisalButton
  appraisalId={appraisal.appraisal_id}
  onSuccess={refreshList}
  variant="outline"
  className="border-primary/30"
/>
```

### 3. **Updated Component: CreateAppraisalButton.tsx**

**Location:** `frontend/src/features/appraisal/CreateAppraisalButton.tsx`

**Changes:**

- Added state to control modal visibility: `const [modalOpen, setModalOpen] = useState(false)`
- Changed button onClick from `navigate('/appraisal/create')` to `setModalOpen(true)`
- Added CreateAppraisalModal component with proper props
- Added `handleSuccess` callback that closes modal and refreshes page
- Imported CreateAppraisalModal component

**Before:**

```tsx
<Button onClick={() => navigate("/appraisal/create")}>Create Appraisal</Button>
```

**After:**

```tsx
<Button onClick={() => setModalOpen(true)}>
  Create Appraisal
</Button>

<CreateAppraisalModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onSuccess={handleSuccess}
/>
```

## Files Modified

1. **Created:**

   - `frontend/src/features/appraisal/CreateAppraisalModal.tsx` (new file)
   - `frontend/src/features/appraisal/EditAppraisalButton.tsx` (new file)

2. **Modified:**
   - `frontend/src/features/appraisal/CreateAppraisalButton.tsx`
   - `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`

## Existing Page Preserved

**Important:** The original `CreateAppraisal.tsx` page component is preserved for:

- Direct URL access if needed (route: `/appraisal/create`)
- Backward compatibility with existing routes
- Testing and integration test compatibility
- Legacy support if needed

The modals are now the primary way to create/edit appraisals, while the page can still be accessed via direct URL if needed.

## Benefits

✅ **Better UX:**

- No page navigation required for create or edit
- Faster workflow for both operations
- Context is preserved (user stays on the same page)
- Quick access to edit drafts without page reload

✅ **Cleaner Interface:**

- Modal overlay provides focus
- Easy to dismiss without losing work (via Cancel button)
- Automatic cleanup on close
- Consistent experience for create and edit

✅ **Responsive:**

- Modal adapts to different screen sizes
- Scrollable content area for smaller viewports
- All form elements remain fully functional
- Works seamlessly on mobile devices

✅ **Backward Compatible:**

- Original page routes still work
- No breaking changes to existing functionality
- All helper functions reused (no duplication)
- Gradual migration path available

✅ **Reusable Components:**

- EditAppraisalButton can be used anywhere in the app
- CreateAppraisalModal handles both create and edit
- Easy to integrate into other parts of the application

## Testing Recommendations

1. **Create Flow:**

   - Click "Create Appraisal" button
   - Fill in appraisal details
   - Add goals
   - Save draft
   - Submit for acknowledgement
   - Verify modal closes and page refreshes

2. **Edit Flow:**

   - Navigate to Team Appraisal page
   - Find a draft appraisal
   - Click "Edit" button
   - Verify form is pre-populated with existing data
   - Modify goals and details
   - Save changes
   - Verify modal closes and list refreshes with updated data

3. **Modal Behavior:**

   - Test Cancel button (should reset form and close)
   - Test clicking outside modal (should NOT close to prevent accidental data loss)
   - Test ESC key (Dialog component default behavior)
   - Test nested modals (Add Goal, Edit Goal, Import from Template)

4. **Edge Cases:**

   - Test with incomplete form data
   - Test goal weightage validation (must equal 100%)
   - Test with missing required fields
   - Test error handling (network errors, validation errors)

5. **Responsive Testing:**
   - Test on mobile devices
   - Test on tablets
   - Test on desktop
   - Verify scrolling works on all devices

## Future Enhancements

- Consider adding draft auto-save functionality
- Add confirmation dialog for Cancel button if form has unsaved changes
- Add keyboard shortcuts for common actions
- Consider adding a minimize/maximize feature for the modal
- Add animation for modal open/close transitions
- Add optimistic UI updates for better perceived performance
- Consider adding a "duplicate appraisal" feature using the same modal

## Notes

- Both create and edit modals use the same `CreateAppraisalModal` component
- The modal uses the same helper functions from `pages/appraisal-create/helpers/` to maintain consistency
- All form validation logic is preserved
- Goal management (add, edit, remove) works identically to the page version
- The modal approach makes it easier to create/edit appraisals from multiple locations in the app
- Edit mode automatically loads existing appraisal data using `loadAppraisalHelper`
- The `EditAppraisalButton` component encapsulates all modal state management
- List refresh is handled via `onSuccess` callback, ensuring data is always up-to-date
