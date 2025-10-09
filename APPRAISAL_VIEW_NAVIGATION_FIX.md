# Appraisal View Navigation Enhancement

## Issue Description

When viewing a completed appraisal from the Team Appraisal page, clicking "Go Home" would always navigate to the My Appraisal page, losing context of where the user came from. This required users to manually navigate back to Team Appraisal.

**Original Flow:**

1. Click Team Appraisal tab
2. Click "Completed" tab
3. Click "View" on an appraisal
4. Navigate through goals/overall summary
5. Click "Go Home" → Goes to My Appraisal ❌

**Desired Flow:**

1. Click Team Appraisal tab
2. Click "Completed" tab
3. Click "View" on an appraisal
4. Navigate through goals/overall summary
5. Click "Close" → Returns to Team Appraisal (Completed tab) ✅

## Solution Implemented

### 1. Pass Navigation Context via URL Parameters

**File**: `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`

When navigating to view a completed appraisal, we now include query parameters indicating the source:

```tsx
{
  /* Only show View button for Complete status */
}
{
  a.status === "Complete" && (
    <Button
      variant="outline"
      onClick={() =>
        navigate(
          `/appraisal/${a.appraisal_id}?from=team-appraisal&tab=${teamFilterWithDraft}`
        )
      }
      className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40"
      aria-label="View appraisal"
      title="View appraisal"
    >
      <span className="hidden sm:inline">View</span>
      <ArrowRight className="h-4 w-4 sm:ml-2" />
    </Button>
  );
}
```

**Parameters Added:**

- `from=team-appraisal` - Indicates navigation source
- `tab=${teamFilterWithDraft}` - Preserves which tab was active (Active/Completed/Draft)

### 2. Update Appraisal View to Handle Navigation Context

**File**: `frontend/src/pages/appraisal-view/AppraisalView.tsx`

#### Added useSearchParams Hook:

```tsx
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

const AppraisalView = () => {
  const [searchParams] = useSearchParams();
  const fromPage = searchParams.get("from");
  const fromTab = searchParams.get("tab");
  // ...
};
```

#### Added X Icon Import:

```tsx
import {
  Calendar,
  Target,
  // ...
  Home,
  X, // Added for "Close" button
} from "lucide-react";
```

#### Updated Navigation Button Logic:

```tsx
<Button
  onClick={() => {
    // Navigate back to source page if coming from team-appraisal
    if (fromPage === "team-appraisal" && fromTab) {
      navigate(`/team-appraisal?tab=${fromTab}`);
    } else {
      navigate("/");
    }
  }}
  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
  aria-label={fromPage === "team-appraisal" ? "Close" : "Home"}
  title={fromPage === "team-appraisal" ? "Close" : "Home"}
>
  {fromPage === "team-appraisal" ? (
    <X className="h-4 w-4" />
  ) : (
    <Home className="h-4 w-4" />
  )}
  <span className="hidden sm:inline">
    {fromPage === "team-appraisal" ? "Close" : "Go Home"}
  </span>
</Button>
```

## How It Works

### Navigation from Team Appraisal:

1. User is on `/team-appraisal?tab=Completed`
2. Clicks "View" on an appraisal
3. Navigates to `/appraisal/123?from=team-appraisal&tab=Completed`
4. Button shows "Close" with X icon
5. Clicking "Close" navigates back to `/team-appraisal?tab=Completed`

### Navigation from My Appraisal (unchanged):

1. User is on `/my-appraisal` or `/`
2. Clicks "View" on an appraisal
3. Navigates to `/appraisal/123` (no query params)
4. Button shows "Go Home" with Home icon
5. Clicking "Go Home" navigates to `/`

## Benefits

✅ **Context Preservation**: Users return to the exact tab they were viewing  
✅ **Better UX**: "Close" is more intuitive when viewing from a specific context  
✅ **Backward Compatible**: Works seamlessly for navigation from My Appraisal  
✅ **Consistent**: Leverages the same tab persistence mechanism  
✅ **Clean URLs**: Query parameters clearly indicate navigation context

## Example URLs

### From Team Appraisal:

- Viewing from Active tab: `/appraisal/123?from=team-appraisal&tab=Active`
- Viewing from Completed tab: `/appraisal/123?from=team-appraisal&tab=Completed`
- Viewing from Draft tab: `/appraisal/123?from=team-appraisal&tab=Draft`

### From My Appraisal:

- Standard view: `/appraisal/123` (no query params)

## Testing Recommendations

### Test Case 1: Team Appraisal Navigation

1. Navigate to Team Appraisal
2. Click "Completed" tab
3. Click "View" on any completed appraisal
4. Navigate through goals using "Next Goal"
5. View "Overall Summary"
6. Click "Close" button
7. ✅ Verify: Returns to Team Appraisal with "Completed" tab active

### Test Case 2: My Appraisal Navigation (Regression)

1. Navigate to My Appraisal
2. Click "View" on a completed appraisal
3. Navigate through goals
4. Click "Go Home" button
5. ✅ Verify: Returns to My Appraisal page

### Test Case 3: Different Tabs

1. Repeat Test Case 1 from "Active" tab
2. Repeat Test Case 1 from "Draft" tab
3. ✅ Verify: Each returns to the correct tab

### Test Case 4: Direct URL Access

1. Open `/appraisal/123` directly (without query params)
2. ✅ Verify: Button shows "Go Home" and navigates to My Appraisal

## Related Features

This enhancement works in conjunction with:

- **Tab Persistence** (TEAM_APPRAISAL_TAB_PERSISTENCE_FIX.md): Tab state is preserved in URL
- **Performance Optimizations** (PERFORMANCE_OPTIMIZATIONS_COMPLETE.md): Smooth navigation without stuttering

## Future Enhancements

Potential future improvements:

1. Apply same pattern to Appraiser Evaluation and Reviewer Evaluation pages
2. Add "Back" button in addition to "Close" for clearer navigation
3. Store navigation history in a breadcrumb component
4. Add keyboard shortcut (Escape key) to trigger "Close" action

## Files Modified

- `frontend/src/pages/team-appraisal/TeamAppraisal.tsx` - Added query params to View button
- `frontend/src/pages/appraisal-view/AppraisalView.tsx` - Added context-aware navigation logic

---

**Status**: ✅ Complete  
**Date**: January 2025  
**Related Issues**: Tab persistence, Navigation UX
