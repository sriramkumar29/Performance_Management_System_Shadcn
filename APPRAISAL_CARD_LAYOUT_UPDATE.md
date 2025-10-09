# Appraisal Card Layout Update - Shared Component

## Overview

Created a reusable `AppraisalCard` component with improved horizontal layout for personnel display. The component is now shared between My Appraisal and Team Appraisal pages, ensuring consistency and easier maintenance.

## Changes Made

### New Shared Component

**File**: `frontend/src/components/AppraisalCard.tsx`

A fully reusable card component that displays appraisal information with:

- Horizontal layout for personnel with avatars
- Appraisal details and status
- Progress indicator
- Support for custom action buttons

### Layout Restructure

#### Line 1: Personnel Information with Avatars (Horizontal Alignment)

Displays all three roles in a horizontal layout with color-coded avatars:

- **Appraisee**: Blue avatar with UserCircle icon
- **Appraiser**: Primary color avatar with User icon
- **Reviewer**: Purple avatar with UserCheck icon

Each person shows:

- Avatar with icon
- Role label (small, muted text)
- Person's name (medium, bold text)

Format: `[Avatar] Appraisee [Name] | [Avatar] Appraiser [Name] | [Avatar] Reviewer [Name]`

#### Line 2: Appraisal Details

- **Appraisal Type**: The type of performance review (bold)
- **Appraisal Period**: Full date range (Start Date - End Date)
- **Days Remaining Badge**:
  - Shows "X days remaining" if before due date
  - Shows "Overdue" in destructive variant if past due date
  - Automatically calculates from current date
- **Range Badge**: Shows the appraisal type range (if applicable)

### Technical Implementation

#### New Component

```typescript
AppraisalCard({
  appraisal,
  empNameById,
  typeNameById,
  rangeNameById,
  formatDate,
  displayStatus,
  getStatusProgress,
  borderLeftColor,
  actionButtons, // React.ReactNode - custom buttons per page
});
```

#### Files Modified

1. `frontend/src/components/AppraisalCard.tsx` - **NEW** shared component
2. `frontend/src/pages/my-appraisal/MyAppraisal.tsx` - Uses AppraisalCard
3. `frontend/src/pages/team-appraisal/TeamAppraisal.tsx` - Uses AppraisalCard

#### Key Features

- **Reusable Component**: Single source of truth for appraisal cards
- **Horizontal Layout**: All personnel displayed side-by-side with avatars
- **Color-Coded Avatars**: Each role has distinct visual identity
  - Appraisee: Blue background (`bg-blue-50`, `text-blue-600`)
  - Appraiser: Primary background (`bg-primary/10`, `text-primary`)
  - Reviewer: Purple background (`bg-purple-100`, `text-purple-700`)
- **Days Calculation**: Uses `Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))`
- **Badge Variants**:
  - `destructive` for overdue appraisals (red)
  - `secondary` for active appraisals with days remaining
  - `outline` with custom styling for range badges
- **Flexible Actions**: Each page can pass custom action buttons
- **Responsive Design**: Flex layout with gap spacing and wrapping for mobile
- **Progress Indicator**: Visual stepper showing appraisal status

#### Code Cleanup

- Removed duplicated card rendering code (200+ lines in each file)
- Removed unused imports:
  - `Card`, `CardContent` from both page files
  - `Calendar`, `User`, `UserCheck`, `Clock`, `Avatar`, `AvatarFallback`
- Consolidated logic into single component
- Fixed type compatibility issues (`appraisal_type_range_id` can be null)

### Page-Specific Implementation

#### MyAppraisal.tsx

Action buttons include:

- "Acknowledge" button (for Submitted status)
- Dynamic action buttons based on role (via AppraisalActionButtons)

Border colors:

- Complete: Green (#10b981)
- Submitted: Amber (#f59e0b)
- Other: Blue (#3b82f6)

#### TeamAppraisal.tsx

Action buttons include:

- "Edit" button (for Draft status)
- "Evaluate" button (for Appraiser Evaluation)
- "Review" button (for Reviewer Evaluation)
- "View" button (for Complete status)

Border colors:

- Complete: Green (#10b981)
- Draft: Orange (#f97316)
- Other: Blue (#3b82f6)

### Visual Improvements

1. **Clearer Role Identification**: Avatars with icons immediately show who's involved
2. **Better Visual Hierarchy**: Labels above names create structured layout
3. **Consistent Spacing**: 6-unit gap between personnel for breathing room
4. **Color Coding**: Each role has distinct color for quick recognition
5. **More Information Visible**: All personnel shown upfront without expanding
6. **Urgency Awareness**: Days remaining badge draws attention to deadlines
7. **Complete Timeline**: Full period range shows entire appraisal timeframe
8. **Consistency**: Exact same layout across both pages

### Maintenance Benefits

1. **Single Source of Truth**: One component to update for both pages
2. **Type Safety**: Proper TypeScript interfaces prevent bugs
3. **DRY Principle**: Eliminated 200+ lines of duplicated code
4. **Easier Testing**: Can test card component in isolation
5. **Future Changes**: Update once, applies everywhere

## Testing Recommendations

- ✅ Verify correct name display for all three roles with avatars
- ✅ Test avatar color coding (blue, primary, purple)
- ✅ Test horizontal alignment of personnel section
- ✅ Test overdue date badge display
- ✅ Test days remaining calculation accuracy
- ✅ Verify responsive layout on mobile devices
- ✅ Check badge color variants (destructive vs secondary)
- ✅ Test with different appraisal types and ranges
- ✅ Verify custom action buttons work correctly on both pages
- ✅ Test border colors for different statuses
- ✅ Ensure progress indicator displays correctly
