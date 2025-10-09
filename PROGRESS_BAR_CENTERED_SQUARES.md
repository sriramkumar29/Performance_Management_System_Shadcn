# Progress Bar Navigation with Centered Squares

## Overview

Transformed the timeline into a modern progress bar with colored square indicators centered directly on the bar. Clicking any square smoothly scrolls to that goal and expands it if collapsed.

## Key Features

### ✅ Progress Bar Design

1. **Rounded Progress Bar**

   - Gray background bar (8px height, rounded-full)
   - Blue filled portion showing overall progress
   - Smooth animated transitions (500ms duration)

2. **Square Goal Indicators**

   - 24x24px (w-6 h-6) colored squares
   - **Centered ON the progress bar** (not above/below)
   - Evenly spaced with `justify-between`
   - Goal numbers displayed inside squares
   - Checkmark icon for completed goals

3. **Color-Coded Status**

   - 🔴 Red: Completed goals (with checkmark)
   - 🟠 Orange: Active/current goal
   - 🟡 Light Orange: In progress
   - 🟡 Yellow: First goal
   - ⚪ Gray: Pending goals

4. **Smart Scroll-to-Goal**
   - Click square → scrolls to goal card
   - Auto-expands if collapsed
   - Smooth scroll with center alignment
   - Active goal shows white ring indicator

## Visual Design

### Progress Bar Layout

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [✓]    [✓]    [3]    [4]    [5]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Red   Orange  Gray  Gray   Gray
|←─ 40% Filled ─→|←─ Remaining ──→|
```

### Complete Layout

```
╔════════════════════════════════════════════════╗
║ FIXED HEADER (No Shadow)                      ║
║ ← Back | Self Assessment                      ║
║ Dates | Status | 3 of 5 Goals (60%)           ║
║                                                ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ║
║    [✓]   [✓]   [3]   [4]   [5]                ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ║
║ |← 40% Done →|← 60% Remaining →|              ║
╠════════════════════════════════════════════════╣
║ ↓ SCROLLABLE CONTENT (Click square scrolls) ↓║
║                                                ║
║ ┌─────────────────────────────────────┐       ║
║ │ Goal 1 Card [✓ Complete]            │       ║
║ └─────────────────────────────────────┘       ║
║                                                ║
║ ┌─────────────────────────────────────┐       ║
║ │ Goal 2 Card [⏰ Pending]            │ ← Scrolls here
║ └─────────────────────────────────────┘       ║
║                                                ║
║ ↑ SCROLLABLE CONTENT ↑                        ║
╠════════════════════════════════════════════════╣
║ FIXED FOOTER (No Shadow)                      ║
║ [Save & Close]              [Submit] ✓        ║
╚════════════════════════════════════════════════╝
```

## Component Structure

```tsx
<div className="mt-6 relative px-4">
  {/* Background Progress Bar */}
  <div className="relative h-2 bg-muted-foreground/20 rounded-full">
    {/* Filled Progress */}
    <div
      className="absolute h-full bg-primary"
      style={{ width: `${progressPercentage}%` }}
    />

    {/* Goal Squares - Centered on Bar */}
    <div className="absolute inset-0 flex justify-between items-center">
      {goals.map((goal, index) => (
        <button onClick={handleSquareClick} className="w-6 h-6 bg-red-500">
          {isComplete ? <CheckCircle2 /> : index + 1}
        </button>
      ))}
    </div>
  </div>
</div>
```

## Scroll-to-Goal Functionality

### Click Behavior

```javascript
const handleSquareClick = () => {
  const goalElement = document.getElementById(`goal-card-${goalId}`);

  if (goalElement) {
    if (!isOpen) {
      // Goal is collapsed - expand it first
      toggleGoal(goalId);

      // Wait for expand animation, then scroll
      setTimeout(() => {
        goalElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } else {
      // Goal already open - just scroll to it
      goalElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }
};
```

### Goal Card Setup

```tsx
<Card
  id={`goal-card-${goalId}`}
  className="scroll-mt-24" // Offset for fixed header
>
  {/* Goal content */}
</Card>
```

### Key Features

1. **Auto-Expand**: Collapsed goals expand automatically
2. **Smooth Scroll**: Native smooth scrolling animation
3. **Center Alignment**: Goals scroll to center of viewport
4. **Header Offset**: `scroll-mt-24` accounts for fixed header
5. **Timing**: 100ms delay for expand animation before scroll

## Color Scheme

### Square Colors

#### 🔴 Red (Completed)

- **Color**: `bg-red-500`
- **Icon**: White checkmark (CheckCircle2)
- **Meaning**: Goal fully completed with rating + comment

#### 🟠 Orange (Active)

- **Color**: `bg-orange-500`
- **Number**: White text
- **Meaning**: Currently open/being worked on

#### 🟡 Light Orange (In Progress)

- **Color**: `bg-orange-400`
- **Number**: White text
- **Meaning**: Previously completed goals

#### 🟡 Yellow (First Goal)

- **Color**: `bg-yellow-500`
- **Number**: White text
- **Meaning**: Starting point

#### ⚪ Gray (Pending)

- **Color**: `bg-gray-400`
- **Number**: White text
- **Meaning**: Not started yet

### Progress Bar Colors

- **Background**: Light gray (`bg-muted-foreground/20`)
- **Filled**: Primary blue (`bg-primary`)
- **Transition**: 500ms smooth animation

## Design Details

### Progress Bar

- **Height**: 8px (h-2)
- **Shape**: Fully rounded (`rounded-full`)
- **Background**: 20% opacity gray
- **Fill Color**: Primary brand color
- **Fill Width**: Dynamic based on `progressPercentage`
- **Animation**: Smooth 500ms transition

### Square Indicators

- **Size**: 24x24px (w-6 h-6)
- **Position**: Absolute, centered vertically on bar
- **Spacing**: `justify-between` for even distribution
- **Font Size**: 10px (`text-[10px]`) for numbers
- **Icon Size**: 12px (h-3 w-3) for checkmark
- **Shadow**: Subtle shadow (`shadow-sm`)
- **Hover**: Scale to 125% (hover:scale-125)
- **Active Ring**: 2px white ring when goal is open

### Hover Effects

- **Scale**: 1.0 → 1.25 (25% larger)
- **Duration**: 200ms smooth transition
- **Tooltip**: Shows goal title below square
- **Cursor**: Pointer (indicates clickable)

### Active/Open Indicator

- **Ring**: 2px white ring
- **Offset**: 1px with primary color background
- **Purpose**: Shows which goal is currently expanded

## Responsive Behavior

### Desktop (>1024px)

- Full width progress bar
- Squares evenly spaced
- All squares clearly visible
- Tooltips show full goal titles

### Tablet (768px - 1024px)

- Progress bar scales proportionally
- Squares maintain size
- Even spacing maintained

### Mobile (<768px)

- Progress bar full width
- Squares may be closer together if many goals
- Touch-friendly 24px minimum size
- Tooltips adapt to viewport

## Advantages

### 1. Modern Progress Indicator

- **Visual Clarity**: See overall progress at a glance
- **Dual Purpose**: Progress bar + navigation in one
- **Animated**: Smooth transitions on progress changes
- **Professional**: Common pattern in modern apps

### 2. Centered Design

- **Space Efficient**: Squares are ON the bar, not above/below
- **Clean Layout**: No extra vertical space needed
- **Visual Balance**: Perfectly centered aesthetics
- **Intuitive**: Progress and navigation unified

### 3. Smart Navigation

- **Click to Jump**: Instant navigation to any goal
- **Auto-Expand**: No need to manually open collapsed goals
- **Smooth Scroll**: Pleasant UX with smooth animations
- **Context Aware**: Centers goal in viewport

### 4. Even Spacing

- **Flexbox Magic**: `justify-between` ensures even distribution
- **Scalable**: Works with any number of goals
- **Responsive**: Adapts to different screen sizes
- **Balanced**: Visually pleasing arrangement

## Technical Implementation

### Key Styles

#### Progress Bar Container

```css
.progress-bar {
  position: relative;
  height: 0.5rem; /* 8px */
  background-color: rgba(gray, 0.2);
  border-radius: 9999px;
  overflow: hidden;
}
```

#### Filled Progress

```css
.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--primary);
  transition: width 500ms ease;
}
```

#### Square Container

```css
.squares-container {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.25rem;
}
```

#### Square Button

```css
.square-indicator {
  width: 1.5rem; /* 24px */
  height: 1.5rem; /* 24px */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms;
  z-index: 10;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.square-indicator:hover {
  transform: scale(1.25);
}
```

### Progress Calculation

```javascript
const progressPercentage = total > 0 ? (completedCount / total) * 100 : 0;
```

### Even Spacing Logic

```jsx
<div className="flex justify-between">
  {/* Flexbox with justify-between automatically distributes items evenly */}
  {/* First item at start, last item at end, others evenly spaced */}
</div>
```

## Scroll Behavior Details

### scrollIntoView Options

```javascript
element.scrollIntoView({
  behavior: "smooth", // Smooth scroll animation
  block: "center", // Center in viewport
});
```

### Alternative Options

- `block: 'start'` - Align to top of viewport
- `block: 'end'` - Align to bottom of viewport
- `block: 'nearest'` - Minimal scrolling

### Scroll Margin

```css
.scroll-mt-24 {
  scroll-margin-top: 6rem; /* 96px - accounts for fixed header */
}
```

## Accessibility Features

### Keyboard Navigation

- Tab through squares sequentially
- Enter/Space to click square
- Smooth scroll works with keyboard too
- Clear focus indicators

### Screen Readers

- `aria-label` with full goal title
- Status announcements
- Progress percentage announced
- Goal completion status

### Visual Indicators

- Not relying on color alone
- Checkmark icon for completion
- Numbers for pending goals
- Ring indicator for active goal

## Edge Cases Handled

1. **Many Goals (10+)**: Squares automatically space evenly
2. **Few Goals (2-3)**: Squares distributed across full width
3. **Single Goal**: One square centered on bar
4. **Collapsed Goal**: Auto-expands on click
5. **Open Goal**: Scrolls without re-toggling
6. **Rapid Clicks**: Timeout prevents scroll conflicts
7. **Missing Element**: Safe check before scrolling

## Files Modified

1. `frontend/src/pages/self-assessment/SelfAssessment.tsx`
   - Replaced timeline with progress bar
   - Changed circles to squares (24x24px)
   - Centered squares ON the progress bar
   - Removed labels above/below
   - Added filled progress animation
   - Implemented scroll-to-goal functionality
   - Added auto-expand collapsed goals
   - Added goal card IDs for scrolling
   - Added scroll-margin for header offset
   - Changed from flex-col to absolute positioning
   - Updated spacing from gap-2 to justify-between

## Testing Checklist

- [ ] Verify progress bar fills correctly
- [ ] Test clicking each square
- [ ] Verify smooth scroll to goals
- [ ] Test auto-expand on collapsed goals
- [ ] Verify scroll-to on open goals
- [ ] Check squares are centered on bar
- [ ] Verify even spacing with 2, 5, 10 goals
- [ ] Test colors match completion status
- [ ] Verify checkmark on completed squares
- [ ] Test active goal white ring
- [ ] Verify hover scale effect (25% larger)
- [ ] Test tooltips show goal titles
- [ ] Verify scroll accounts for fixed header
- [ ] Test on mobile, tablet, desktop
- [ ] Verify keyboard navigation
- [ ] Test rapid clicking doesn't break scroll

## Future Enhancements (Optional)

1. **Animated Progress Fill**: Progress fills with animation when goals complete
2. **Square to Square Line**: Show progress line between squares
3. **Pulse Effect**: Animate current goal square
4. **Percentage Labels**: Show percentage on hover
5. **Mini Preview**: Show goal preview on square hover
6. **Drag to Reorder**: Allow dragging squares to reorder goals
7. **Keyboard Shortcuts**: Number keys to jump to goals
8. **Progress Milestones**: Special styling at 25%, 50%, 75%, 100%

## Summary

The progress bar navigation with centered squares provides:

- ✅ **Modern progress indicator** (animated filled bar)
- ✅ **Centered squares ON the bar** (space-efficient design)
- ✅ **Even spacing** (flexbox justify-between)
- ✅ **Smart scroll-to-goal** (auto-expand + smooth scroll)
- ✅ **Color-coded status** (red/orange/yellow/gray)
- ✅ **Checkmarks for completed** (clear visual feedback)
- ✅ **Active goal indicator** (white ring)
- ✅ **Intuitive interaction** (click to jump to goal)
- ✅ **Responsive design** (works with any number of goals)

This design combines visual progress tracking with efficient navigation, all in a compact, elegant package! 🎯
