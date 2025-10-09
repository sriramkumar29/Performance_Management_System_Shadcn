# Team Appraisal Tab Persistence Fix

## Issue Description

When users opened an appraisal from the Team Appraisal page (e.g., from the "Completed" or "Draft" tab) and then navigated back, the page would always reset to the "Active" tab instead of staying on the tab where they opened the appraisal.

## Root Cause

The `teamFilterWithDraft` state was initialized to `"Active"` by default every time the component mounted. When users navigated away and came back, this state was recreated with its default value, losing the previously selected tab.

## Solution Implemented

Implemented URL search parameter persistence to maintain the selected tab across navigation:

### Changes Made

**File**: `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`

1. **Added `useSearchParams` hook**:

   ```tsx
   import { useNavigate, useSearchParams } from "react-router-dom";

   const [searchParams, setSearchParams] = useSearchParams();
   ```

2. **Created tab initialization function**:

   ```tsx
   const getInitialTab = (): "Active" | "Completed" | "Draft" => {
     const tab = searchParams.get("tab");
     if (tab === "Completed" || tab === "Draft") return tab;
     return "Active";
   };
   ```

3. **Updated state initialization**:

   ```tsx
   const [teamFilterWithDraft, setTeamFilterWithDraft] = useState<
     "Active" | "Completed" | "Draft"
   >(getInitialTab);
   ```

4. **Created tab change handler**:

   ```tsx
   const handleTabChange = (newTab: "Active" | "Completed" | "Draft") => {
     setTeamFilterWithDraft(newTab);
     setSearchParams({ tab: newTab });
   };
   ```

5. **Updated all tab button onClick handlers**:

   ```tsx
   // Before
   onClick={() => setTeamFilterWithDraft("Active")}

   // After
   onClick={() => handleTabChange("Active")}
   ```

## How It Works

1. **Initial Load**: When the component mounts, it reads the `?tab=` query parameter from the URL and initializes the tab state accordingly
2. **Tab Selection**: When users click on a tab (Active/Completed/Draft), the handler:
   - Updates the local state
   - Updates the URL with the selected tab (e.g., `/team-appraisal?tab=Completed`)
3. **Navigation Back**: When users return to the Team Appraisal page:
   - The URL still contains the `?tab=` parameter
   - The component reads this parameter and restores the previously selected tab
   - Users see the same tab they were on before navigating away

## Benefits

✅ **Improved UX**: Users stay on the same tab when navigating back  
✅ **Shareable URLs**: Users can bookmark or share specific tab views  
✅ **Browser History**: Back/forward navigation maintains tab state  
✅ **Minimal Changes**: Solution uses existing React Router features  
✅ **No Breaking Changes**: Default behavior (Active tab) is preserved when no parameter exists

## Example URLs

- Active tab (default): `/team-appraisal` or `/team-appraisal?tab=Active`
- Completed tab: `/team-appraisal?tab=Completed`
- Draft tab: `/team-appraisal?tab=Draft`

## Testing Recommendations

1. Navigate to Team Appraisal page
2. Switch to "Completed" tab
3. Click on an appraisal to view/evaluate it
4. Navigate back using browser back button or clicking "Home" then "Team Appraisal"
5. Verify that the "Completed" tab is still selected
6. Repeat for "Draft" and "Active" tabs

## Related Files

- `frontend/src/pages/team-appraisal/TeamAppraisal.tsx` - Main implementation

---

**Status**: ✅ Complete  
**Date**: January 2025
