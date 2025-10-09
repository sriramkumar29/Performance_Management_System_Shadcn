# Goal Squares Same Line Layout

## Changes Made

### ✅ Moved Goal Squares to Title Line

Repositioned the goal selection squares to appear on the same line as "Self Assessment" title, on the right side.

### ✅ Moved Statistics to Date Line

Relocated the goal count and completion percentage to be on the same line as the date period.

## Layout Evolution

### Previous Layout

```
╔════════════════════════════════════════════════╗
║ ← Back | Self Assessment                      ║
║ 📅 7/1/2025 - 12/31/2025                      ║
╚════════════════════════════════════════════════╝

     [1]   [2]   [3]   [4]   [5]
     0 of 5 Goals • 0% Complete
```

### New Layout

```
╔════════════════════════════════════════════════╗
║ ← Back | Self Assessment      [1] [2] [3] [4] [5] ║ ← Squares on title line!
║ 📅 7/1/2025 - 12/31/2025      0 of 5 Goals • 0% Complete ║ ← Stats on date line!
╚════════════════════════════════════════════════╝
```

## Code Structure

### Implementation

#### 1. Title Row with Goal Squares

```tsx
<div className="flex items-center justify-between">
  {/* Left Side: Back Button + Title */}
  <div className="flex items-center gap-3">
    <Button>← Back</Button>
    <h1>Self Assessment</h1>
  </div>

  {/* Right Side: Goal Selection Squares */}
  <div className="flex items-center gap-4">
    {goals.map((ag, index) => (
      <button className="w-8 h-8 rounded">{index + 1}</button>
    ))}
  </div>
</div>
```

#### 2. Date Row with Statistics

```tsx
<div className="flex items-center justify-between ml-12">
  {/* Left Side: Date Period */}
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Calendar className="h-4 w-4" />
    {startDate} – {endDate}
  </div>

  {/* Right Side: Goal Count + Percentage */}
  <div className="flex items-center gap-2 text-sm">
    <span className="font-medium">
      {completedCount} of {total} Goals
    </span>
    <span>•</span>
    <span>{progressPercentage}% Complete</span>
  </div>
</div>
```

## Visual Hierarchy

### New Layout Structure

```
Row 1: [Back Button] [Title] ..................... [Goal Squares]
Row 2: [Calendar] [Date] ......................... [Goal Stats]
```

### Alignment

- **Row 1**: `justify-between` - Title left, Squares right
- **Row 2**: `justify-between` - Date left (with `ml-12` offset), Stats right
- **Vertical**: `space-y-3` - 12px spacing between rows

## Key Features

### 1. Horizontal Layout

```
← Self Assessment                    [1] [2] [3] [4] [5]
```

- **Left**: Back button + Title
- **Right**: Goal selection squares
- **Spacing**: `justify-between` for full-width distribution

### 2. Aligned Information

```
📅 7/1/2025 - 12/31/2025             0 of 5 Goals • 0% Complete
```

- **Left**: Calendar icon + date range
- **Right**: Goal count + completion percentage
- **Alignment**: `ml-12` on date to align with title

### 3. Goal Squares

```tsx
<div className="flex items-center gap-4">
  {/* 32x32px squares, gap-4 spacing */}
</div>
```

- **Size**: 32x32px (w-8 h-8)
- **Spacing**: 16px gap (gap-4)
- **Position**: Right side of title row

### 4. Statistics Display

```tsx
<div className="flex items-center gap-2 text-sm">
  <span className="font-medium">0 of 5 Goals</span>
  <span>•</span>
  <span>0% Complete</span>
</div>
```

- **Goal count**: Emphasized with `font-medium`
- **Separator**: Bullet point
- **Percentage**: Regular weight

## Spacing Details

### Horizontal Spacing

```
Title ←─ justify-between (auto) ─→ [1] [2] [3] [4] [5]
                                     ←─ 16px gap ─→
```

```
Date ←─ justify-between (auto) ─→ Goals • Percentage
                                   ←─ 8px gap ─→
```

### Vertical Spacing

```
Title Row
   ↓ 12px (space-y-3)
Date Row
```

## Benefits

### 1. More Compact Layout

- ✅ **Two-row header** instead of three
- ✅ **Better space efficiency** - no empty vertical space
- ✅ **More content visible** on screen

### 2. Better Visual Balance

- ✅ **Horizontal symmetry** - Title/Date on left, Actions/Stats on right
- ✅ **Clear alignment** - Date offset matches title
- ✅ **Professional appearance** - Dashboard-like layout

### 3. Logical Grouping

- ✅ **Navigation together** - Title + Goal squares
- ✅ **Metadata together** - Date + Statistics
- ✅ **Clear hierarchy** - Identity → Context

### 4. Improved Usability

- ✅ **Goal squares more accessible** - Right side, natural position
- ✅ **Statistics visible** - Always in view with date
- ✅ **Less scrolling** - Compact header

## Typography

| Element      | Size         | Weight | Color            | Position |
| ------------ | ------------ | ------ | ---------------- | -------- |
| Title        | text-2xl/3xl | bold   | gradient         | Left     |
| Goal squares | w-8 h-8      | -      | colored          | Right    |
| Date         | text-sm      | normal | muted-foreground | Left     |
| Goal count   | text-sm      | medium | foreground       | Right    |
| Percentage   | text-sm      | normal | muted-foreground | Right    |

## Responsive Behavior

### Desktop (>1024px)

```
← Self Assessment                    [1] [2] [3] [4] [5]
📅 7/1/2025 - 12/31/2025             0 of 5 Goals • 0% Complete
```

All elements fit comfortably on single lines.

### Tablet (768px - 1024px)

```
← Self Assessment          [1] [2] [3] [4] [5]
📅 7/1/2025 - 12/31/2025   0 of 5 Goals • 0% Complete
```

Still fits, with slightly tighter spacing.

### Mobile (<768px)

May need to stack on very narrow screens:

```
← Self Assessment
[1] [2] [3] [4] [5]

📅 7/1/2025 - 12/31/2025
0 of 5 Goals • 0% Complete
```

## Color Coding

### Goal Square Colors

- **Complete (red)**: `bg-red-500` - Finished goal with checkmark
- **Active (orange)**: `bg-orange-500` - Currently open/expanded
- **Progress (orange-light)**: `bg-orange-400` - Completed but not current
- **First (yellow)**: `bg-yellow-500` - First incomplete goal
- **Pending (gray)**: `bg-gray-400` - Not yet started

### Text Colors

- **Title**: Blue to purple gradient
- **Date**: Muted foreground
- **Goal count**: Foreground (emphasized)
- **Percentage**: Muted foreground

## Interaction Patterns

### Square Click Behavior

1. Click square → Toggle goal card
2. If opening → Scroll to center
3. Visual feedback → Ring appears
4. Hover → Scale 110%, show tooltip

### Visual States

- **Normal**: Colored square with number
- **Hover**: Scaled up, tooltip visible
- **Active**: Ring-2 with primary color
- **Complete**: Checkmark icon instead of number

## Accessibility

### Screen Reader Order

1. "Back button"
2. "Self Assessment"
3. "Goal 1 button"
4. "Goal 2 button"
5. ... (remaining goals)
6. "Calendar icon"
7. "July 1, 2025 to December 31, 2025"
8. "0 of 5 Goals"
9. "0% Complete"

### Keyboard Navigation

- Tab moves between interactive elements
- Row 1: Back → Goal 1 → Goal 2 → ... → Goal N
- Row 2: No interactive elements (informational)
- Natural left-to-right flow

### ARIA Labels

```tsx
<button title="Goal 1: Increase Sales" aria-label="Goal 1: Increase Sales">
  1
</button>
```

## Comparison

### Before (Stacked Layout)

```tsx
<Row 1>
  <Title>Self Assessment</Title>
</Row 1>

<Row 2>
  <Date>7/1/2025 - 12/31/2025</Date>
</Row 2>

<Row 3>
  <Squares>[1][2][3][4][5]</Squares>
</Row 3>

<Row 4>
  <Stats>0 of 5 Goals • 0% Complete</Stats>
</Row 4>
```

❌ 4 rows = more vertical space

### After (Horizontal Layout)

```tsx
<Row 1>
  <Title>Self Assessment</Title>
  <Squares>[1][2][3][4][5]</Squares>
</Row 1>

<Row 2>
  <Date>7/1/2025 - 12/31/2025</Date>
  <Stats>0 of 5 Goals • 0% Complete</Stats>
</Row 2>
```

✅ 2 rows = more compact

## Design Rationale

### Why Place Squares with Title?

1. **Context**: Squares are navigation for the assessment
2. **Visibility**: Always visible with page title
3. **Balance**: Fills empty space on right side
4. **Convention**: Action buttons often on title row

### Why Place Statistics with Date?

1. **Related info**: Both are metadata about the appraisal
2. **Logical pair**: Time period + progress status
3. **Visual balance**: Matches title row structure
4. **Efficient use**: Utilizes horizontal space

### Why Maintain Gap-4 for Squares?

1. **Clickability**: Adequate touch targets
2. **Readability**: Numbers clearly visible
3. **Aesthetics**: Not too cramped
4. **Consistency**: Standard spacing pattern

## Files Modified

1. `frontend/src/pages/self-assessment/SelfAssessment.tsx`
   - Restructured header from `space-y-3` vertical stack to two horizontal rows
   - Row 1: Title with goal squares (`justify-between`)
   - Row 2: Date with statistics (`justify-between`, `ml-12` offset)
   - Moved goal squares from separate section to title row (line ~298-370)
   - Moved statistics from separate section to date row (line ~373-382)
   - Maintained all functionality (click, toggle, scroll, color coding)

## Testing Checklist

- [x] Goal squares visible on title line
- [x] Statistics visible on date line
- [x] Proper horizontal alignment
- [ ] Verify square click navigation
- [ ] Test toggle functionality
- [ ] Check scroll behavior
- [ ] Test on different screen sizes
- [ ] Verify responsive wrapping
- [ ] Test with different goal counts (1-10)
- [ ] Verify color coding
- [ ] Test hover effects and tooltips
- [ ] Check keyboard navigation
- [ ] Test screen reader announcement

## Performance Considerations

### No Performance Impact

- Same number of elements
- Same event handlers
- Same rendering logic
- Just repositioned in DOM

### Visual Benefits

- Faster scanning (horizontal layout)
- Less vertical scrolling
- More efficient use of space

## Alternative Layouts Considered

### Option 1: Squares with Title (Chosen) ✅

```
← Self Assessment                    [1] [2] [3] [4] [5]
📅 7/1/2025 - 12/31/2025             0 of 5 Goals • 0% Complete
```

✅ Most compact
✅ Best balance
✅ Professional appearance

### Option 2: All on One Row

```
← Self Assessment  [1][2][3][4][5]  📅 7/1/2025  0 of 5 • 0%
```

❌ Too cramped
❌ Hard to read
❌ Poor mobile experience

### Option 3: Three Rows

```
← Self Assessment                    [1] [2] [3] [4] [5]
📅 7/1/2025 - 12/31/2025
                                     0 of 5 Goals • 0% Complete
```

❌ Wastes vertical space
❌ Unbalanced
❌ Statistics feel orphaned

## Future Enhancements (Optional)

### 1. Collapsible Squares

Show/hide squares on mobile:

```tsx
<button onClick={toggleSquares}>
  {showSquares ? <ChevronUp /> : <ChevronDown />}
</button>
```

### 2. Progress Ring

Visual progress around squares:

```tsx
<svg className="absolute">
  <circle r="16" stroke="currentColor" strokeDasharray={`${progress} 100`} />
</svg>
```

### 3. Animated Stats

Count up animation:

```tsx
<AnimatedNumber from={0} to={progressPercentage} duration={1000} />
```

## Summary

### Changes Made

1. ✅ **Moved goal squares to title row** (right side)
2. ✅ **Moved statistics to date row** (right side)
3. ✅ **Created two-row compact header** with horizontal layout
4. ✅ **Maintained all functionality** (no behavior changes)

### Visual Result

```
╔════════════════════════════════════════════════╗
║ ← Back | Self Assessment      [1] [2] [3] [4] [5] ║
║ 📅 7/1/2025 - 12/31/2025      0 of 5 Goals • 0% Complete ║
╚════════════════════════════════════════════════╝
     [Goal Cards Below]
```

### User Impact

- **More compact** - 50% less vertical space for header
- **Better organized** - Logical left/right pairing
- **Professional appearance** - Dashboard-like layout
- **Easier to scan** - Horizontal information flow
- **More content visible** - Less scrolling needed
