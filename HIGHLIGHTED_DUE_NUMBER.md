# Highlighted Number in Due Badge

## Summary

Enhanced the "Due" badge in `AppraisalCard` to highlight the number of days remaining with a different color and larger font size for better visibility and quick scanning.

## Changes Made

### File Modified

`frontend/src/components/AppraisalCard.tsx`

### Visual Enhancement

#### Before

```
[82 days remaining]  ← All text same color and size
```

#### After

```
[**82** days remaining]  ← Number highlighted in primary color, larger and bold
```

### Implementation

```typescript
// For active appraisals (not completed or overdue)
badgeContent = (
  <>
    <span className="text-primary font-bold text-base">{daysRemaining}</span>{" "}
    <span>day{plural} remaining</span>
  </>
);
```

### Styling Details

| Element    | Style                              | Purpose                                    |
| ---------- | ---------------------------------- | ------------------------------------------ |
| **Number** | `text-primary font-bold text-base` | Makes the day count stand out prominently  |
| **Text**   | Default badge text styling         | Maintains readability for "days remaining" |

### Color & Size Breakdown

- **Number (daysRemaining)**:
  - `text-primary` - Uses the theme's primary color (typically blue/brand color)
  - `font-bold` - Makes the number stand out with heavier weight
  - `text-base` - Slightly larger font size than the default badge text
- **"day(s) remaining" text**:
  - Inherits badge default styling
  - `text-sm font-semibold` from badge className

### Three Badge States

1. **Completed** (Green)

   - Content: `"Completed"`
   - No number highlight needed (simple text)

2. **Overdue** (Red)

   - Content: `"Overdue"`
   - No number highlight needed (alert state)

3. **Active/Remaining** (Grey)
   - Content: `<number in primary color> day(s) remaining`
   - **Number is highlighted with primary theme color**

## Benefits

### 1. Improved Scanability

✅ Users can quickly spot the exact number of days at a glance
✅ Primary color draws attention to the most critical information
✅ Larger font size makes the number easier to read

### 2. Visual Hierarchy

- Most important info (number) is most prominent
- Supporting text ("days remaining") provides context without competing
- Creates natural reading flow: number → context

### 3. Consistency with Design System

- Uses theme primary color (maintains brand consistency)
- Font sizing follows established hierarchy
- Works with light/dark mode (uses CSS variable)

### 4. Accessibility

- Bold font weight improves readability
- Color contrast maintained (primary color on light background)
- Text remains readable even if color is not visible

## Use Case Example

### Manager Dashboard View

```
Appraisal 1: Due → [**82** days remaining]  ← Easy to see it's 82 days
Appraisal 2: Due → [**3** days remaining]   ← Quick recognition of urgency
Appraisal 3: Due → [Overdue]                ← Red alert
Appraisal 4: Due → [Completed]              ← Green success
```

## Technical Details

### React Node Structure

The badge content is now a `React.ReactNode` that can contain:

- Simple string (for "Completed" and "Overdue")
- JSX fragment with styled spans (for days remaining)

```typescript
let badgeContent: React.ReactNode;

// ... conditional logic ...

badgeContent = (
  <>
    <span className="text-primary font-bold text-base">{daysRemaining}</span>{" "}
    <span>day{plural} remaining</span>
  </>
);
```

### Why This Approach?

1. **Flexible Content**: Allows different content types without complex string manipulation
2. **Maintainable**: Each state has clear, separate rendering logic
3. **Performant**: No runtime string parsing or manipulation needed
4. **Accessible**: Screen readers will announce the full text naturally

## Testing Checklist

- [ ] Verify number displays in primary color for active appraisals
- [ ] Verify number is bold and larger than surrounding text
- [ ] Check "days" vs "day" plural logic works correctly
- [ ] Test with various day counts (1 day, 2 days, 82 days, 100+ days)
- [ ] Verify "Completed" badge still shows as green with plain text
- [ ] Verify "Overdue" badge still shows as red with plain text
- [ ] Test dark mode compatibility (if applicable)
- [ ] Verify responsive behavior on mobile screens
- [ ] Check contrast ratio of primary color on badge background

## Browser Compatibility

Standard React and Tailwind classes ensure compatibility with:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Future Enhancements

1. **Color Intensity**: Use different shades of primary color based on urgency
   - 30+ days: lighter blue
   - 7-29 days: medium blue
   - 1-6 days: darker blue/amber
2. **Icons**: Add clock icon next to the number

3. **Animation**: Subtle pulse effect when days remaining < 7

4. **Threshold Alerts**: Change number color to amber/orange when < 7 days

5. **Formatting**: Add comma separator for large numbers (e.g., 1,000 days)

## Related Enhancements

This change complements other recent improvements:

- ✅ Color-coded filter button badges (All/Active/Completed/Draft/Overdue)
- ✅ Green "Completed" badge for finished appraisals
- ✅ Red "Overdue" badge for past-due items

Together, these create a cohesive visual language for status and timeline information.

## Date

October 2025
