# Self Assessment Goal Card Redesign

## Overview

Restructured the goal card header into a clean three-line layout with better organization and improved visual hierarchy.

## Changes Made

### 1. **Three-Line Layout**

#### **Line 1: Goal Number + Status**

- Left: "Goal 1" (removed "of X" text)
- Right: Complete/Pending badge + Chevron icon
- Changed icon from Target → Flag (better visual)

#### **Line 2: Title + Category + Weightage**

- Left: Goal title (truncated if long) + Category badge
- Right: Rating badge (if rated) + Weightage badge with icon

#### **Line 3: Description (Scrollable)**

- Full-width description text
- Max height of 3 lines (max-h-12)
- Scrollable with custom styled scrollbar
- Only shows if description exists

### 2. **Icon Changes**

- **Goal Icon**: Changed from `Target` → `Flag` (more appropriate)
- **Weightage Badge**: Added `TrendingUp` icon
- **Rating Badge**: Added `Star` icon

### 3. **Visual Improvements**

- **Smaller goal icon**: Reduced from `h-5 w-5` to `h-4 w-4`
- **Better spacing**: Organized with proper gap between elements
- **Truncation**: Title truncates with ellipsis if too long
- **Custom Scrollbar**: Subtle, themed scrollbar for descriptions
  - Thin width (6px)
  - Primary color themed
  - Hover effect
  - Firefox compatible

### 4. **Removed Duplicate Content**

- Removed description, weightage, and category from expanded section
- These details now only appear in the collapsed header
- Expanded section now only contains rating slider and comment textarea

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 🚩 Goal 1                               [✓ Complete] [▼]    │
├─────────────────────────────────────────────────────────────┤
│ Goal Title [Category]         [⭐ 4/5] [📈 25%]             │
├─────────────────────────────────────────────────────────────┤
│ Description text that might be long and will scroll if...   │
│ it exceeds the max height of three lines                    │ ↕
└─────────────────────────────────────────────────────────────┘
```

## Technical Details

### New Imports

```tsx
import {
  Flag, // New - for goal icon
  TrendingUp, // New - for weightage badge
  Star, // New - for rating badge
  // ... other icons
} from "lucide-react";
```

### Custom Scrollbar CSS

Added to `frontend/src/index.css`:

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--primary) / 0.4);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.6);
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--primary) / 0.4) hsl(var(--muted) / 0.3);
}
```

## Benefits

1. **Cleaner Header**: All key info visible at a glance
2. **Better Organization**: Logical grouping of related information
3. **Space Efficiency**: More compact yet readable
4. **Improved Scanning**: Users can quickly scan all goals
5. **Scrollable Descriptions**: Long descriptions don't break layout
6. **Better Icons**: More meaningful icons (Flag > Target for goals)
7. **No Redundancy**: Information appears once (in header)

## Before vs After

### Before

- Goal number showed "Goal 1 of 5" (verbose)
- Target icon (less intuitive)
- Status badge inline with number
- Title separate from category/weightage
- Description hidden until expanded
- Duplicate info in expanded section

### After

- Goal number shows "Goal 1" (concise)
- Flag icon (more intuitive)
- Status badge aligned right
- Title, category, weightage on same line
- Description visible (scrollable) in header
- No duplicate info

## Files Modified

1. `frontend/src/pages/self-assessment/SelfAssessment.tsx`

   - Restructured goal card header (3 lines)
   - Changed icons (Flag, TrendingUp, Star)
   - Removed duplicate content from expanded section

2. `frontend/src/index.css`
   - Added `.custom-scrollbar` styles

## Testing Checklist

- [ ] Verify goal number shows correctly (e.g., "Goal 1", "Goal 2")
- [ ] Verify Complete/Pending badges work correctly
- [ ] Verify chevron toggles properly
- [ ] Verify title truncates with long text
- [ ] Verify category badge shows when present
- [ ] Verify rating badge shows when rated
- [ ] Verify weightage badge shows correctly
- [ ] Verify description scrolls when long (3+ lines)
- [ ] Verify custom scrollbar appears and works
- [ ] Verify layout responsive on mobile
- [ ] Verify expanded section only shows rating/comment
