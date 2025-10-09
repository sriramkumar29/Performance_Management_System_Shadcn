# Square Stepper Navigation Design

## Overview

Transformed the hybrid progress bar into a stepper-style navigation with squares and connecting lines, similar to traditional multi-step form progress indicators.

## Key Changes

### ✅ Square Button Design

Replaced the continuous progress bar segments with discrete square buttons:

- **Square Shape**: 48x48px (w-12 h-12) square buttons
- **Border Style**: 2px border instead of filled background
- **Spacing**: 8px gap between elements (gap-2)
- **Connecting Lines**: Horizontal lines between squares

## Visual Design

### Stepper Layout

```
┌──────────────────────────────────────────────────┐
│  ┌─┐───┌─┐───┌─┐───┌─┐───┌─┐                   │
│  │✓│━━━│✓│━━━│2│   │3│   │4│                   │
│  └─┘───└─┘───└─┘───└─┘───└─┘                   │
│   1     2     3     4     5                      │
└──────────────────────────────────────────────────┘
  Blue   Blue  Active  Pending  Pending
  (Done) (Done) (Current)
```

### Complete Layout

```
╔════════════════════════════════════════════════╗
║ FIXED HEADER (No Shadow)                      ║
║ ← Back | Self Assessment                      ║
║ Dates | Status | 3 of 5 Goals (60%)           ║
║                                                ║
║ ┌─┐──┌─┐──┌─┐──┌─┐──┌─┐  ← Square Stepper    ║
║ │✓│──│✓│──│2│  │3│  │4│     with Lines       ║
║ └─┘  └─┘  └─┘  └─┘  └─┘                       ║
╠════════════════════════════════════════════════╣
║ ↓ SCROLLABLE CONTENT (Only this scrolls) ↓   ║
║                                                ║
║ Goal Cards Here...                             ║
║                                                ║
║ ↑ SCROLLABLE CONTENT ↑                        ║
╠════════════════════════════════════════════════╣
║ FIXED FOOTER (No Shadow)                      ║
║ [Save & Close]              [Submit] ✓        ║
╚════════════════════════════════════════════════╝
```

## Design Details

### Square Button States

#### 1. Completed Goal

- **Background**: `bg-primary` (blue fill)
- **Border**: `border-primary` (blue border, 2px)
- **Icon**: White checkmark (CheckCircle2)
- **Text**: None (replaced by checkmark)

#### 2. Active/Current Goal

- **Background**: `bg-primary` (blue fill)
- **Border**: `border-primary` (blue border, 2px)
- **Icon**: None
- **Text**: Goal number in white

#### 3. Pending/Incomplete Goal

- **Background**: `bg-background` (white/transparent)
- **Border**: `border-muted-foreground/30` (light gray, 2px)
- **Icon**: None
- **Text**: Goal number in muted gray

### Connecting Lines

#### Completed Section

- **Color**: `bg-primary` (blue)
- **Height**: 2px (h-0.5)
- **Position**: Between completed goals

#### Pending Section

- **Color**: `bg-muted-foreground/30` (light gray)
- **Height**: 2px (h-0.5)
- **Position**: Between pending goals

### Hover Effects

- **Scale**: 1.0 → 1.1 (10% larger on hover)
- **Duration**: 200ms smooth transition
- **Cursor**: Pointer (clickable indicator)
- **Tooltip**: Shows goal title above square

## Component Structure

```tsx
<div className="mt-4 flex items-center gap-2">
  {goals.map((ag, index) => (
    <div key={goalId} className="flex items-center gap-2 group">
      {/* Square Button */}
      <button className="w-12 h-12 border-2">
        {isComplete ? <CheckCircle2 /> : <span>{index + 1}</span>}
        <div className="tooltip">Goal {index + 1}</div>
      </button>

      {/* Connecting Line */}
      {index < total - 1 && <div className="h-0.5 flex-1" />}
    </div>
  ))}
</div>
```

## Comparison with Previous Design

### Previous (Hybrid Progress Bar)

```
┌──────────────────────────────────────────────┐
│ [1✓ │ 2✓ │  3  │  4  │  5 ] ← Continuous    │
└──────────────────────────────────────────────┘
- Continuous bar with equal segments
- Filled backgrounds show progress
- Modern, sleek appearance
```

### Current (Square Stepper)

```
┌──────────────────────────────────────────────┐
│ ┌─┐──┌─┐──┌─┐──┌─┐──┌─┐  ← Discrete steps  │
│ │✓│──│✓│──│2│  │3│  │4│     with lines     │
│ └─┘  └─┘  └─┘  └─┘  └─┘                     │
└──────────────────────────────────────────────┘
- Discrete square buttons
- Border-based design
- Classic stepper pattern
- More traditional appearance
```

## Advantages of Square Stepper

### 1. Familiar Pattern

- **Recognition**: Users instantly recognize multi-step form pattern
- **Industry Standard**: Commonly used in checkout flows, wizards
- **Clear Progression**: Discrete steps are visually distinct

### 2. Better Clickability

- **Larger Hit Areas**: 48x48px squares vs narrow segments
- **Touch-Friendly**: Adequate size for finger taps
- **Clear Boundaries**: Distinct buttons instead of continuous bar

### 3. Visual Clarity

- **Distinct Steps**: Each goal is clearly separated
- **Progress Flow**: Lines show the connection between steps
- **Status Icons**: Checkmarks clearly indicate completion

### 4. Flexible Spacing

- **Responsive**: Can wrap on small screens if needed
- **Dynamic Lines**: Lines stretch to fill available space
- **Scalable**: Works with any number of goals

## Technical Implementation

### Key Styles

```tsx
// Container
<div className="flex items-center gap-2">

// Square Button
<button className="w-12 h-12 border-2 bg-primary border-primary">

// Connecting Line
<div className="h-0.5 flex-1 bg-primary" />

// Hover Effect
hover:scale-110 transition-all duration-200
```

### Conditional Styling

```tsx
{
  isComplete
    ? "bg-primary border-primary" // Blue filled
    : isOpen
    ? "bg-primary border-primary" // Blue filled (active)
    : "bg-background border-muted-foreground/30"; // Empty with gray border
}
```

### Line Color Logic

```tsx
{
  isComplete
    ? "bg-primary" // Blue line after completed
    : "bg-muted-foreground/30"; // Gray line before pending
}
```

## Responsive Behavior

### Desktop (>1024px)

- Full horizontal layout
- All squares visible in single row
- Lines stretch to fill gaps
- Clear visual progression

### Tablet (768px - 1024px)

- Horizontal layout maintained
- Squares may be slightly closer
- Lines adjust proportionally

### Mobile (<768px)

- **Option 1**: Horizontal scroll if needed
- **Option 2**: Wrap to multiple rows
- **Option 3**: Smaller squares with shorter lines
- Touch-optimized 48x48px hit areas maintained

## Accessibility

### Keyboard Navigation

- Tab through squares sequentially
- Enter/Space to activate
- Clear focus indicators

### Screen Readers

- Proper ARIA labels
- Status announcements
- Progress information

### Visual Indicators

- Not relying on color alone
- Icons for completion (checkmark)
- Numbers for pending steps
- Border provides structure

## Color Scheme

### Primary (Blue) - Completed/Active

- **Background**: Primary brand color
- **Border**: Same as background
- **Text/Icon**: White (high contrast)

### Muted Gray - Pending

- **Background**: Transparent/white
- **Border**: Light gray (30% opacity)
- **Text**: Muted gray text color

### Connecting Lines

- **Active**: Primary blue (matches completed)
- **Inactive**: Light gray (matches pending borders)

## Animation Details

### Hover Effect

- **Transform**: scale(1.1) - 10% larger
- **Duration**: 200ms
- **Easing**: ease-in-out
- **Tooltip**: Fade in smoothly

### Click/Active State

- **Instant**: No animation needed
- **Visual Feedback**: Border color change
- **Focus Ring**: Browser default or custom

### Progress Update

- **Color Transition**: 300ms smooth fade
- **Border Change**: Blue outline appears
- **Icon Fade**: Checkmark fades in

## Edge Cases Handled

1. **Many Goals (>10)**: Horizontal scroll or wrap
2. **Few Goals (2-3)**: Lines stretch elegantly
3. **Single Goal**: Square without lines
4. **Long Titles**: Truncated in tooltip
5. **Touch Devices**: 48px minimum size maintained

## Files Modified

1. `frontend/src/pages/self-assessment/SelfAssessment.tsx`
   - Replaced continuous bar with discrete squares
   - Changed from single-width segments to fixed 48x48px squares
   - Added connecting lines between squares
   - Updated styling from filled bars to bordered squares
   - Changed completion indicator from filled color to checkmark
   - Adjusted spacing from gap-1 to gap-2
   - Updated hover scale from 1.05 to 1.1

## Usage Guidelines

### When to Use Squares

- ✅ Multi-step processes (3-7 steps ideal)
- ✅ Linear progression workflows
- ✅ Form wizards and checkouts
- ✅ Goal completion tracking
- ✅ When users need clear step boundaries

### When to Use Progress Bar

- ❌ Continuous progress (uploading, downloading)
- ❌ Single metric tracking
- ❌ Percentage-based completion
- ❌ Very short processes (1-2 steps)
- ❌ Non-interactive indicators

## Testing Checklist

- [ ] Verify squares are 48x48px
- [ ] Test clicking each square
- [ ] Verify blue color for completed goals
- [ ] Verify checkmark appears on completed
- [ ] Test current/active goal shows number in blue
- [ ] Verify pending goals have gray border
- [ ] Test connecting lines show correct colors
- [ ] Verify hover scale effect (10% larger)
- [ ] Test tooltips on hover
- [ ] Verify lines stretch to fill space
- [ ] Test with 2, 5, 10 goals
- [ ] Verify responsive behavior
- [ ] Test keyboard navigation
- [ ] Verify no page scroll (only content scroll)
- [ ] Test on mobile, tablet, desktop

## Summary

The square stepper design provides:

- ✅ **Familiar UX pattern** (like checkout/wizard flows)
- ✅ **Better clickability** (larger 48px touch targets)
- ✅ **Clear progression** (discrete steps with connecting lines)
- ✅ **Visual status** (checkmarks for done, numbers for pending)
- ✅ **Clean aesthetic** (bordered squares, no shadows)
- ✅ **Professional appearance** (industry-standard design)
- ✅ **Touch-friendly** (adequate size for fingers)

This design matches the style shown in the reference image with squares and lines, providing a more traditional stepper experience while maintaining the interactive navigation benefits.
