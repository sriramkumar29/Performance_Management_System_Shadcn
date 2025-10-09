# Unsaved Changes Exit Dialog

## Changes Made

### ✅ Added Exit Confirmation Dialog

Implemented a dialog box that appears when the back button is pressed, warning users about unsaved changes with options to save or discard.

## Features

### Dialog Components

1. **Dialog Header**: Title and description
2. **Two Action Buttons**: "Close Without Saving" and "Save & Close"
3. **X Close Button**: Built-in dialog close (top right)
4. **Backdrop**: Click outside to close

### User Flow

```
User clicks Back button
    ↓
Is Read-Only mode?
    ↓ No
Show "Unsaved Changes" Dialog
    ↓
User chooses:
    ├── "Close Without Saving" → Navigate away immediately
    ├── "Save & Close" → Save data, then navigate away
    └── Close (X) or backdrop → Cancel and stay on page
```

## Code Implementation

### 1. Added Dialog Import

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
```

### 2. Added State

```tsx
const [showExitDialog, setShowExitDialog] = useState(false);
```

### 3. Added Handler Functions

#### Back Button Handler

```tsx
const handleBackClick = () => {
  if (!isReadOnly) {
    setShowExitDialog(true); // Show dialog if editing
  } else {
    navigate(-1); // Direct navigation if read-only
  }
};
```

#### Save & Close Handler

```tsx
const handleSaveAndClose = async () => {
  setShowExitDialog(false);
  await handleSave(); // Existing save function
};
```

#### Close Without Saving Handler

```tsx
const handleCloseWithoutSaving = () => {
  setShowExitDialog(false);
  navigate(-1);
};
```

### 4. Updated Back Button

**Before:**

```tsx
<Button onClick={() => navigate(-1)}>
  <ArrowLeft />
</Button>
```

**After:**

```tsx
<Button onClick={handleBackClick}>
  <ArrowLeft />
</Button>
```

### 5. Added Dialog Component

```tsx
<Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Unsaved Changes</DialogTitle>
      <DialogDescription>
        You have unsaved changes. Would you like to save your progress before
        leaving?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        onClick={handleCloseWithoutSaving}
        className="w-full sm:w-auto"
      >
        Close Without Saving
      </Button>
      <Button
        onClick={handleSaveAndClose}
        disabled={saving}
        className="w-full sm:w-auto"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save & Close"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Dialog Design

### Visual Layout

```
┌────────────────────────────────────┐
│  Unsaved Changes              [X]  │  ← Title with close button
├────────────────────────────────────┤
│  You have unsaved changes.         │  ← Description
│  Would you like to save your       │
│  progress before leaving?          │
├────────────────────────────────────┤
│  [Close Without Saving]  [Save & Close] │  ← Action buttons
└────────────────────────────────────┘
```

### Styling

- **Max Width**: `sm:max-w-md` (448px on desktop)
- **Responsive**: Stacked buttons on mobile, horizontal on desktop
- **Button Widths**: Full width on mobile, auto on desktop
- **Gap**: 8px between buttons
- **Icon**: Save icon on "Save & Close" button

## Button Behavior

### "Close Without Saving" Button

```tsx
<Button
  variant="outline"
  onClick={handleCloseWithoutSaving}
  className="w-full sm:w-auto"
>
  Close Without Saving
</Button>
```

- **Variant**: Outline (secondary appearance)
- **Action**: Immediately navigate away
- **No loading state**: Instant action

### "Save & Close" Button

```tsx
<Button
  onClick={handleSaveAndClose}
  disabled={saving}
  className="w-full sm:w-auto"
>
  <Save className="h-4 w-4 mr-2" />
  {saving ? "Saving..." : "Save & Close"}
</Button>
```

- **Variant**: Default (primary appearance)
- **Action**: Save data, then navigate
- **Loading state**: Shows "Saving..." and disabled during save
- **Icon**: Save icon (16x16px)

### X Close Button

Built-in Dialog close button:

- **Location**: Top-right corner
- **Action**: Closes dialog (stays on page)
- **Keyboard**: ESC key also closes

### Backdrop Click

- **Action**: Closes dialog (stays on page)
- **Visual**: Semi-transparent overlay

## User Experience

### Decision Flow

```
1. User clicks Back button
   ↓
2. Dialog appears with clear message
   ↓
3. User has 3 options:

   Option A: "Close Without Saving"
   - Quick exit for users who don't want to save
   - Gray outline button (less prominent)

   Option B: "Save & Close"
   - Primary action (colored button)
   - Shows loading state
   - Saves then navigates

   Option C: Cancel (X or backdrop)
   - Stays on page
   - Can continue editing
```

### Read-Only Mode

```
If isReadOnly === true:
  Back button → Direct navigation (no dialog)

If isReadOnly === false:
  Back button → Show dialog
```

This prevents unnecessary dialogs when users are just viewing.

## Responsive Design

### Mobile (<640px)

```
┌──────────────────────────┐
│  Unsaved Changes    [X]  │
├──────────────────────────┤
│  You have unsaved...     │
├──────────────────────────┤
│  [Close Without Saving]  │  ← Full width
│  [Save & Close]          │  ← Full width
└──────────────────────────┘
```

- Buttons stacked vertically
- Full width buttons
- Gap between buttons

### Desktop (>640px)

```
┌────────────────────────────────────┐
│  Unsaved Changes              [X]  │
├────────────────────────────────────┤
│  You have unsaved changes...       │
├────────────────────────────────────┤
│     [Close Without Saving] [Save & Close] │  ← Horizontal
└────────────────────────────────────┘
```

- Buttons side by side
- Auto width buttons
- Right-aligned layout

## Accessibility

### Keyboard Navigation

- **Tab**: Cycles through buttons
- **Enter/Space**: Activates focused button
- **ESC**: Closes dialog (cancels action)
- **Focus trap**: Can't tab outside dialog

### Screen Reader Support

```tsx
<DialogTitle>Unsaved Changes</DialogTitle>
<DialogDescription>
  You have unsaved changes. Would you like to save your progress before leaving?
</DialogDescription>
```

- Title announced as heading
- Description provides context
- Button labels clearly describe action

### ARIA Attributes

Automatically added by Dialog component:

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` (links to title)
- `aria-describedby` (links to description)

### Focus Management

1. Dialog opens → Focus moves to dialog
2. Tab key → Cycles through interactive elements
3. Dialog closes → Focus returns to Back button

## Button States

### "Close Without Saving"

```tsx
Normal:   [Close Without Saving]  // Gray outline
Hover:    [Close Without Saving]  // Darker background
Focus:    [Close Without Saving]  // Focus ring
Active:   [Close Without Saving]  // Pressed state
```

### "Save & Close"

```tsx
Normal:   [💾 Save & Close]        // Primary color
Hover:    [💾 Save & Close]        // Darker shade
Focus:    [💾 Save & Close]        // Focus ring
Saving:   [💾 Saving...]           // Disabled, spinner
Disabled: [💾 Save & Close]        // Grayed out
```

## Integration with Existing Save Logic

### handleSave Function

The dialog reuses the existing `handleSave` function:

```tsx
const handleSave = useCallback(async () => {
  if (!appraisal) return;

  setSaving(true);
  try {
    // Save logic...
    toast.success("Assessment saved successfully");
    navigate(-1); // Navigate after save
  } catch (e) {
    toast.error(e.message || "Failed to save assessment");
  } finally {
    setSaving(false);
  }
}, [appraisal, goals, form, navigate]);
```

When called from dialog:

1. Dialog closes
2. Save executes
3. Success toast appears
4. Navigation happens
5. User returns to previous page

## Error Handling

### Save Failure

```tsx
try {
  await handleSave();
} catch (e) {
  // handleSave already shows error toast
  // Dialog is already closed
  // User stays on current page
}
```

If save fails:

- Error toast appears (from handleSave)
- Dialog is already closed
- User remains on self-assessment page
- Can try saving again manually

### Network Error

- Same handling as above
- Error message shown via toast
- User can retry or close without saving

## Comparison with Other Patterns

### Pattern 1: Dialog (Chosen) ✅

```tsx
<Dialog open={show}>
  <DialogContent>Message + Buttons</DialogContent>
</Dialog>
```

✅ Clear modal focus
✅ Can't miss it
✅ Standard pattern
✅ Accessible

### Pattern 2: Inline Warning

```tsx
<Alert>⚠️ Unsaved changes!</Alert>
```

❌ Easy to miss
❌ Less urgent
❌ Doesn't block action

### Pattern 3: Browser Prompt

```tsx
window.onbeforeunload = () => "Unsaved changes";
```

❌ Can't customize
❌ Browser-dependent
❌ Poor UX

### Pattern 4: Toast Notification

```tsx
toast.warning("Unsaved changes!");
```

❌ Dismissible
❌ Doesn't block action
❌ User might miss

## Testing Checklist

- [x] Dialog component added
- [x] State management implemented
- [x] Handler functions created
- [x] Back button updated
- [ ] Test dialog appears on back click (edit mode)
- [ ] Test dialog doesn't appear (read-only mode)
- [ ] Test "Close Without Saving" navigates away
- [ ] Test "Save & Close" saves then navigates
- [ ] Test X button closes dialog
- [ ] Test backdrop click closes dialog
- [ ] Test ESC key closes dialog
- [ ] Test loading state during save
- [ ] Test error handling if save fails
- [ ] Test on mobile (stacked buttons)
- [ ] Test on desktop (horizontal buttons)
- [ ] Test keyboard navigation
- [ ] Test screen reader announcements

## Benefits

### 1. Prevents Data Loss

- ✅ **Warns users** before losing unsaved work
- ✅ **Offers to save** with one click
- ✅ **Clear choice** between saving or discarding
- ✅ **Can cancel** and continue editing

### 2. Better UX

- ✅ **Clear messaging** - Users understand what will happen
- ✅ **Easy actions** - Two clear buttons
- ✅ **No surprises** - User controls the outcome
- ✅ **Quick save** - One click to save and exit

### 3. Standard Pattern

- ✅ **Familiar** - Users recognize this pattern
- ✅ **Expected** - Common in applications
- ✅ **Professional** - Polished experience
- ✅ **Accessible** - Works with assistive tech

### 4. Flexible

- ✅ **Can save** - Preserve work and leave
- ✅ **Can discard** - Quick exit if changes unwanted
- ✅ **Can cancel** - Stay and continue editing
- ✅ **Smart** - Only shows when needed (not in read-only)

## Potential Enhancements (Optional)

### 1. Show What Changed

```tsx
<DialogDescription>
  You have unsaved changes in {changedGoalsCount} goal(s). Would you like to
  save?
</DialogDescription>
```

### 2. Dirty Check

Only show dialog if actual changes were made:

```tsx
const hasChanges = useMemo(() => {
  // Compare form with original data
  return /* has changes */;
}, [form, originalData]);

const handleBackClick = () => {
  if (!isReadOnly && hasChanges) {
    setShowExitDialog(true);
  } else {
    navigate(-1);
  }
};
```

### 3. Auto-save Draft

```tsx
// Periodically save draft
useEffect(() => {
  const interval = setInterval(() => {
    saveDraft();
  }, 60000); // Every minute
  return () => clearInterval(interval);
}, [form]);
```

### 4. Different Message Based on Completion

```tsx
<DialogDescription>
  {completedCount === total
    ? "You've completed all goals but haven't submitted."
    : `You've completed ${completedCount} of ${total} goals.`}
  Would you like to save before leaving?
</DialogDescription>
```

## Files Modified

1. `frontend/src/pages/self-assessment/SelfAssessment.tsx`
   - Added Dialog imports (line ~9-16)
   - Added showExitDialog state (line ~84)
   - Added handleBackClick function (line ~264-271)
   - Added handleSaveAndClose function (line ~273-276)
   - Added handleCloseWithoutSaving function (line ~278-281)
   - Updated back button onClick (line ~311)
   - Added Dialog component (line ~636-661)

## Summary

### Changes Made

1. ✅ **Imported Dialog components** from UI library
2. ✅ **Added dialog state** to control visibility
3. ✅ **Created handler functions** for all actions
4. ✅ **Updated back button** to show dialog
5. ✅ **Added Dialog component** with two action buttons
6. ✅ **Smart behavior** - Only shows in edit mode

### User Flow

```
Back Button Clicked
    ↓
Read-Only? → Yes → Navigate Away
    ↓ No
Show Dialog
    ↓
User Chooses:
    • Close Without Saving → Leave immediately
    • Save & Close → Save, then leave
    • X or backdrop → Stay on page
```

### Visual Result

```
┌────────────────────────────────────┐
│  Unsaved Changes              [X]  │
├────────────────────────────────────┤
│  You have unsaved changes.         │
│  Would you like to save your       │
│  progress before leaving?          │
├────────────────────────────────────┤
│  [Close Without Saving] [💾 Save & Close] │
└────────────────────────────────────┘
```

The dialog now warns users about unsaved changes when clicking the back button, with clear options to save or discard their work! 🎯
