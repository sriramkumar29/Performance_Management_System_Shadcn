# Overall Assessment - Collapsible Card with Selection Button

**Date**: October 10, 2025  
**Component**: `frontend/src/components/AppraisalWorkflow.tsx`

## Overview

Made the **Overall Assessment** card collapsible and added a selection button in the navigation bar (similar to goal selection squares) for quick access in Reviewer Evaluation mode.

## Features Added

### 1. Overall Assessment Selection Button

Added a new button in the goal selection area that:

- **Location**: Appears after all goal selection squares, only in `reviewer-evaluation` mode
- **Icon**: UserCheck icon (white on colored background)
- **Color States**:
  - 🟢 **Green** (`bg-green-500`): Both rating and comment are complete
  - 🟠 **Orange** (`bg-orange-500`): Card is currently open/expanded
  - 🟣 **Purple** (`bg-purple-500`): Default state (not complete, not open)
- **Interaction**:
  - Click to toggle the overall assessment card open/closed
  - When opened, automatically scrolls to the card for better visibility
  - Shows ring border when active (similar to goal squares)
- **Hover Effect**: Scales up on hover for better interactivity

### 2. Collapsible Overall Assessment Card

Converted the overall assessment card to a collapsible component:

#### Card Header (Clickable Trigger)

- **Click anywhere** on the header to expand/collapse
- **Icons**:
  - ChevronDown when collapsed
  - ChevronUp when expanded
- **Completion Badge**: Shows "✓ Complete" badge when both rating and comment are filled
- **Hover Effect**: Subtle background change on hover
- **Layout**: UserCheck icon + "Overall Assessment" title + completion badge + chevron icon

#### Card Content (Collapsible)

Two sections remain the same when expanded:

1. **Appraiser Overall Assessment** (read-only)
   - Rating slider and badge
   - Comments textarea
2. **Your Reviewer Assessment** (editable)
   - Interactive rating slider
   - Large comments textarea
   - Character counter

### 3. State Management

Added new state for collapse control:

```typescript
const [openOverallAssessment, setOpenOverallAssessment] = useState(false);
```

### 4. Smooth Scrolling

When clicking the selection button to open the card:

```typescript
setTimeout(() => {
  const overallElement = document.getElementById("overall-assessment-card");
  if (overallElement) {
    overallElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}, 100);
```

## Visual Design

### Navigation Bar

```
[Goal 1] [Goal 2] [Goal 3] [Goal 4] [👤 Overall]  |  3 of 4 Goals
   ▪️       ▪️       ▪️       ▪️        🟣
```

**Color Legend**:

- ⚪ Gray: Not started
- 🟡 Yellow: First goal indicator
- 🟠 Orange: In progress / Currently open
- 🟢 Green: Complete
- 🟣 Purple: Overall assessment (default)

### Overall Assessment Card States

**Collapsed**:

```
┌──────────────────────────────────────────────┐
│ 👤 Overall Assessment    [✓ Complete]    ▼   │
└──────────────────────────────────────────────┘
```

**Expanded**:

```
┌──────────────────────────────────────────────┐
│ 👤 Overall Assessment    [✓ Complete]    ▲   │
├──────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐   │
│ │ 👤 Appraiser Overall Assessment        │   │
│ │ (Read-only content)                    │   │
│ └────────────────────────────────────────┘   │
│                                                │
│ ┌────────────────────────────────────────┐   │
│ │ ✓ Your Reviewer Assessment             │   │
│ │ (Editable - Highlighted)               │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## User Experience Flow

1. **Initial State**: Overall assessment card is collapsed by default
2. **Quick Access**: Reviewer clicks purple button in navigation bar
3. **Auto-Open & Scroll**: Card expands and page scrolls to bring it into view
4. **Fill Assessment**: Reviewer provides rating and comments
5. **Visual Feedback**: Button turns green when complete
6. **Collapse**: Click header or button again to collapse card

## Benefits

✅ **Better Navigation**: Quick access button allows jumping directly to overall assessment  
✅ **Space Efficient**: Card starts collapsed, reducing scroll length  
✅ **Visual Clarity**: Color-coded button shows completion status at a glance  
✅ **Consistent UX**: Matches goal selection pattern users are already familiar with  
✅ **Smooth Experience**: Auto-scroll ensures card is always visible when opened  
✅ **Status Awareness**: Completion badge in header shows progress without expanding

## Technical Implementation

### Components Used

- `Collapsible`: Wrapper for collapsible behavior
- `CollapsibleTrigger`: Makes the entire CardHeader clickable
- `CollapsibleContent`: Contains the expandable content
- `Card`, `CardHeader`, `CardContent`: Structure
- `Badge`: Shows completion status
- `ChevronUp`, `ChevronDown`: Expand/collapse indicators
- `UserCheck`: Icon for overall assessment

### Props & State

- `openOverallAssessment`: Boolean state controlling collapse
- `setOpenOverallAssessment`: State setter
- `reviewerOverall`: Contains rating and comment values for validation
- `mode`: Must be "reviewer-evaluation" for button/card to show
- `appraisal`: Contains appraiser's overall data

### Validation

Button color changes to green when:

```typescript
reviewerOverall.rating && reviewerOverall.comment.trim();
```

## Testing Checklist

- [ ] Overall assessment button appears in reviewer evaluation mode
- [ ] Button is purple by default (not complete)
- [ ] Clicking button opens/closes the overall assessment card
- [ ] Card auto-scrolls into view when opened via button
- [ ] Card header is clickable to expand/collapse
- [ ] Chevron icon changes direction based on state
- [ ] Button turns green when both rating and comment are complete
- [ ] Button turns orange when card is open
- [ ] Completion badge appears in header when complete
- [ ] Hover effects work on button and header
- [ ] Button has ring border when card is open
- [ ] All existing functionality still works

## Files Modified

- `frontend/src/components/AppraisalWorkflow.tsx`
  - Added `openOverallAssessment` state
  - Added overall assessment selection button in navigation
  - Converted overall assessment card to Collapsible
  - Added smooth scroll behavior
  - Added completion status indicators

## Status

✅ **Complete** - Overall Assessment is now collapsible with quick-access selection button
