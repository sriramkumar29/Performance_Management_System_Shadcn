# Appraisal Card - Added Headings and Proper Alignment

## Overview

Added clear headings for Appraisal Type, Appraisal Period, and Status sections to match the personnel headings layout, creating a consistent and professional card design.

## Layout Structure

### Complete Card Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  Line 1: Personnel Information                                               │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ Appraisee       │   │ Appraiser       │   │ Reviewer        │           │
│  │ [👤] Dev 1      │   │ [👤] Lisa Mgr   │   │ [👤] John CEO   │           │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘           │
│                                                                               │
│  Line 2: Appraisal Details                                                   │
│  ┌─────────────────┐   ┌───────────────────┐   ┌─────────────────┐         │
│  │ Appraisal Type  │   │ Appraisal Period  │   │ Status          │         │
│  │ Quarterly       │   │ 4/1 - 6/30/2025   │   │ [Overdue]       │         │
│  └─────────────────┘   └───────────────────┘   └─────────────────┘         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Line 1: Personnel (Unchanged)

Each section has:

- **Label**: "Appraisee", "Appraiser", "Reviewer" (`text-xs text-muted-foreground`)
- **Avatar**: Color-coded icon
- **Name**: Person's name (`text-sm font-medium`)

### Line 2: Details (Updated with Headings)

#### Section 1: Appraisal Type

```tsx
<div className="flex-1 min-w-[150px]">
  <p className="text-xs text-muted-foreground mb-1">Appraisal Type</p>
  <span className="text-sm font-medium text-foreground">
    {typeNameById(a.appraisal_type_id, a)}
  </span>
</div>
```

- **Heading**: "Appraisal Type" (small, muted)
- **Value**: Type name (medium, bold, foreground color)
- **Spacing**: 1 unit margin between heading and value

#### Section 2: Appraisal Period

```tsx
<div className="flex-1 min-w-[200px]">
  <p className="text-xs text-muted-foreground mb-1">Appraisal Period</p>
  <span className="text-sm text-muted-foreground">
    {formatDate(a.start_date)} - {formatDate(a.end_date)}
  </span>
</div>
```

- **Heading**: "Appraisal Period" (small, muted)
- **Value**: Date range (medium, muted)
- **Min Width**: 200px (wider for date range)

#### Section 3: Status (with Badges)

```tsx
<div className="flex-1 min-w-[150px]">
  <p className="text-xs text-muted-foreground mb-1">Status</p>
  <div className="flex items-center gap-2 flex-wrap">
    <Badge variant={isOverdue ? "destructive" : "secondary"}>{badgeText}</Badge>
    {rangeNameById && <Badge>...</Badge>}
  </div>
</div>
```

- **Heading**: "Status" (small, muted)
- **Values**: Badges showing days remaining and range
- **Alignment**: Left-aligned within section

## CSS Classes Breakdown

### Container (Line 2)

```css
flex items-start justify-between gap-3 flex-wrap
```

- `items-start`: Aligns items at the top (important for multi-line content)
- `justify-between`: Spreads sections evenly
- `gap-3`: 0.75rem spacing between sections
- `flex-wrap`: Wraps on smaller screens

### Each Section

```css
flex-1 min-w-[XXXpx]
```

- `flex-1`: Equal width distribution
- `min-w-[150px]` or `min-w-[200px]`: Prevents too narrow sections

### Headings

```css
text-xs text-muted-foreground mb-1
```

- `text-xs`: Extra small text (0.75rem)
- `text-muted-foreground`: Subtle gray color
- `mb-1`: 0.25rem bottom margin

### Values

```css
text-sm font-medium text-foreground
```

- `text-sm`: Small text (0.875rem)
- `font-medium`: Medium weight (500)
- `text-foreground`: Primary text color

## Visual Consistency

### Matching Typography

- **All Headings**: `text-xs text-muted-foreground`
  - Line 1: "Appraisee", "Appraiser", "Reviewer"
  - Line 2: "Appraisal Type", "Appraisal Period", "Status"
- **All Values**: `text-sm` with appropriate weight/color
  - Names: `font-medium` (bold)
  - Type: `font-medium text-foreground` (bold, dark)
  - Period: `text-muted-foreground` (regular, gray)
  - Badges: Default badge styling

### Spacing Consistency

- **Heading-to-Value**: `mb-1` (0.25rem) on all headings
- **Section Gap**: `gap-3` (0.75rem) between sections
- **Between Lines**: `mb-3` (0.75rem) between Line 1 and Line 2

## Alignment Benefits

✅ **Vertical Alignment**: Headings stack perfectly with personnel labels above
✅ **Horizontal Alignment**: Three columns align with three personnel sections
✅ **Visual Hierarchy**: Clear heading → value relationship
✅ **Scanability**: Easy to find specific information
✅ **Professional Look**: Consistent, structured layout
✅ **Accessibility**: Clear labels for screen readers

## Responsive Behavior

### Desktop (≥640px)

```
[Appraisee]          [Appraiser]          [Reviewer]
[Type]               [Period]             [Status]
```

All sections in one row, evenly spaced

### Mobile (<640px)

```
[Appraisee]
[Appraiser]
[Reviewer]

[Type]
[Period]
[Status]
```

Sections stack vertically, maintaining minimum widths

## Files Modified

- ✅ `frontend/src/components/AppraisalCard.tsx`

## Key Changes

1. Added "Appraisal Type" heading above type value
2. Added "Appraisal Period" heading above date range
3. Added "Status" heading above badges
4. Changed container from `items-center` to `items-start` for proper multi-line alignment
5. Removed `justify-end` from Status section for left alignment
6. Wrapped values in proper containers with headings

## Testing Checklist

- ✅ All headings display with correct styling
- ✅ Values align properly under headings
- ✅ Vertical alignment matches personnel section above
- ✅ Horizontal spacing is even across card
- ✅ Responsive wrapping works on mobile
- ✅ Text sizes are consistent and readable

## Result

The appraisal cards now have clear, professional headings that match the layout style of the personnel section, creating a cohesive and easy-to-scan interface.
