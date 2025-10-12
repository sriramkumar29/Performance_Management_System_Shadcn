# Design System Implementation

## Overview

This document outlines the comprehensive design system implemented across the Performance Management System, specifically in My Appraisal, Team Appraisal, AppraisalCard, and Manage Goal Templates pages.

## Table of Contents

1. [Layout & Structure Patterns](#layout--structure-patterns)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Patterns](#component-patterns)
5. [Interactive Elements](#interactive-elements)
6. [Responsive Design](#responsive-design)

---

## Layout & Structure Patterns

### Page Container

```tsx
<div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-fade-in">
  <div className="mx-auto max-w-7xl space-y-6">{/* Content */}</div>
</div>
```

**Purpose**: Provides consistent spacing, animation, and maximum width across all pages.

### Header Card Pattern

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect">
  <CardHeader className="pb-4">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Title Section */}
      <div className="flex items-center gap-3">
        <Button variant="outline" /* Back button */>
          <ArrowLeft />
          <span className="hidden sm:inline sm:ml-2">Back</span>
        </Button>
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Page Title
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Subtitle or description
          </p>
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-3">{/* Primary actions */}</div>
    </div>
  </CardHeader>
</Card>
```

**Key Features**:

- Gradient text headers for visual hierarchy
- Glass-effect with shadow-soft for depth
- Responsive flex layout (column → row)
- Back button integration
- Action buttons on the right

### Search & Filter Card Pattern

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-5 sm:p-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold text-foreground">
          Search [Entity]
        </span>
      </div>
      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
        {count} item(s)
      </Badge>
    </div>
    {/* Search inputs and filters */}
  </CardContent>
</Card>
```

**Purpose**: Standardized search/filter interface with count badge.

### Filter Buttons with Counts

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <Button
    variant={activeFilter === "All" ? "default" : "outline"}
    onClick={() => setFilter("All")}
  >
    All
    <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-700">
      {allCount}
    </Badge>
  </Button>
  <Button variant={activeFilter === "Active" ? "default" : "outline"}>
    Active
    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
      {activeCount}
    </Badge>
  </Button>
  {/* Additional filter buttons */}
</div>
```

---

## Color System

### Avatar Color Scheme

Consistent color coding for different entity types:

| Entity/Type     | Background      | Icon Color         | Usage                        |
| --------------- | --------------- | ------------------ | ---------------------------- |
| **Appraisee**   | `bg-blue-50`    | `text-blue-600`    | Employee receiving appraisal |
| **Appraiser**   | `bg-primary/10` | `text-primary`     | Manager evaluating           |
| **Reviewer**    | `bg-purple-100` | `text-purple-700`  | Senior reviewer              |
| **Type**        | `bg-emerald-50` | `text-emerald-600` | Appraisal/Goal type          |
| **Period/Date** | `bg-amber-50`   | `text-amber-600`   | Time-related info            |
| **Status/Due**  | `bg-rose-50`    | `text-rose-600`    | Status/deadline              |
| **Importance**  | `bg-rose-50`    | `text-rose-600`    | Priority level               |
| **Performance** | `bg-indigo-50`  | `text-indigo-600`  | Metrics/factors              |
| **Weightage**   | `bg-purple-50`  | `text-purple-600`  | Weight percentage            |
| **Category**    | `bg-amber-50`   | `text-amber-600`   | Categories/tags              |

### Badge Color System

#### Filter Status Badges

```tsx
// All
className = "bg-slate-100 text-slate-700 border-0 font-semibold";

// Active
className = "bg-blue-100 text-blue-700 border-0 font-semibold";

// Completed
className = "bg-green-100 text-green-700 border-0 font-semibold";

// Draft
className = "bg-amber-100 text-amber-700 border-0 font-semibold";

// Overdue
className = "bg-red-100 text-red-700 border-0 font-semibold";
```

#### Due Status Badges

```tsx
// Completed
variant = "default";
className =
  "px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700";

// Overdue
variant = "destructive";
className = "px-3 py-1 rounded-full text-sm font-semibold";

// Active (days remaining)
badgeContent = (
  <>
    <span className="text-primary font-bold text-base">{daysRemaining}</span>{" "}
    <span>day{plural} remaining</span>
  </>
);
```

### Border Colors

```tsx
// Left border accent (varies by status/type)
className="border-l-4"
style={{ borderLeftColor: /* dynamic color */ }}

// Examples:
borderLeftColor: "#3b82f6" // Blue for active
borderLeftColor: "#10b981" // Green for completed
borderLeftColor: "#f59e0b" // Amber for draft
borderLeftColor: "#ef4444" // Red for overdue
```

---

## Typography

### Hierarchy

```tsx
// Page Title (H1)
className =
  "text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent";

// Card Title (H2)
className = "text-xl font-semibold text-foreground";

// Card Title Alternative (H3)
className = "text-lg font-semibold text-foreground";

// Section Label
className = "text-sm text-primary font-medium";

// Value/Content
className = "text-base font-semibold text-foreground";

// Description/Body
className = "text-base text-muted-foreground leading-relaxed";

// Small Text
className = "text-sm text-muted-foreground";

// Extra Small
className = "text-xs text-muted-foreground";
```

### Text Utilities

```tsx
// Truncate long text
className = "truncate";

// Limit to 2 lines
className = "line-clamp-2";

// Gradient text
className =
  "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent";
```

---

## Component Patterns

### Avatar with Icon Pattern

```tsx
<div className="flex items-center gap-2 flex-1 min-w-[150px]">
  <Avatar className="h-8 w-8 bg-blue-50">
    <AvatarFallback className="bg-blue-50 text-blue-600">
      <UserCircle className="h-4 w-4" />
    </AvatarFallback>
  </Avatar>
  <div>
    <p className="text-sm text-primary font-medium">Label</p>
    <p className="text-base font-semibold text-foreground">Value</p>
  </div>
</div>
```

**Sizes**:

- Small: `h-8 w-8` avatar, `h-4 w-4` icon
- Medium: `h-10 w-10` avatar, `h-5 w-5` icon
- Large: `h-12 w-12` avatar, `h-6 w-6` icon

### Status Progress Steps

```tsx
<div className="space-y-3">
  <div className="flex items-center gap-2 mb-2">
    <TrendingUp className="h-4 w-4" />
    <span className="text-sm font-medium">Status</span>
  </div>
  <div className="relative">
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => {
        const isCompleted = currentProgress > step.progress;
        const isCurrent = currentStatus === step.status;

        const circleClass = isCompleted
          ? "bg-primary text-primary-foreground"
          : isCurrent
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
          : "bg-muted text-muted-foreground border-2 border-muted-foreground/20";

        return (
          <div
            key={idx}
            className="flex flex-col items-center relative z-10 flex-1"
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${circleClass}`}
            >
              {isCompleted ? <CheckCircle /> : <span>{idx + 1}</span>}
            </div>
            <span className="text-[9px] sm:text-[11px] mt-1.5 text-center">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
    {/* Connecting line */}
    <div className="absolute top-4 left-0 right-0 h-[2px] bg-muted">
      <div
        className="h-full bg-primary transition-all duration-500"
        style={{ width: `${currentProgress}%` }}
      />
    </div>
  </div>
</div>
```

### Card with Absolute Action Buttons

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect relative">
  <CardContent className="p-5 sm:p-6">
    {/* Content */}

    {/* Action buttons - positioned absolutely */}
    <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex gap-2">
      <Button variant="outline" size="sm">
        <Edit className="h-4 w-4" />
        <span className="hidden sm:inline sm:ml-2">Edit</span>
      </Button>
      <Button variant="destructive" size="sm">
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline sm:ml-2">Delete</span>
      </Button>
    </div>
  </CardContent>
</Card>
```

**Purpose**: Keeps action buttons from affecting content layout while maintaining accessibility.

### Loading Skeleton Pattern

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-5 sm:p-6">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-5 w-1/3 rounded" />
        <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-5 w-16 rounded-full" />
      </div>
      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-4 w-full rounded" />
      <div className="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-4 w-5/6 rounded" />
    </div>
  </CardContent>
</Card>
```

---

## Interactive Elements

### Hover Effects

```tsx
// Card hover
className = "hover-lift shadow-soft hover:shadow-md transition-all";

// Button hover (via BUTTON_STYLES)
className = "hover:bg-primary/90 transition-colors";

// Badge hover (for interactive badges)
className = "hover:scale-105 transition-transform";
```

### Focus States

```tsx
// Input focus
className = "focus:ring-2 focus:ring-primary/20 border-border/50";

// Button focus
className = "focus:outline-none focus:ring-2 focus:ring-primary/30";
```

### Disabled States

```tsx
// Disabled button
disabled = { isLoading };
className = "disabled:opacity-50 disabled:cursor-not-allowed";
```

### Transitions

```tsx
// Standard transition
className = "transition-all duration-200";

// Shadow transition
className = "transition-shadow";

// Color transition
className = "transition-colors";

// Transform transition
className = "transition-transform";

// Progress bar
className = "transition-all duration-500";
```

---

## Responsive Design

### Breakpoint Strategy

```tsx
// Mobile-first approach
className = "flex flex-col sm:flex-row"; // Stack → Row
className = "w-full md:w-1/2 lg:w-1/3"; // Full → Half → Third
className = "text-base sm:text-lg"; // Smaller → Larger
className = "p-4 md:p-6 lg:p-8"; // Padding scales
```

### Button Text Visibility

```tsx
<Button>
  <Icon className="h-4 w-4" />
  <span className="hidden sm:inline sm:ml-2">Button Text</span>
</Button>
```

**Pattern**: On mobile, show only icon. On small screens and up, show icon + text.

### Grid/Flex Wrapping

```tsx
// Wrapping flex items
className = "flex items-center gap-4 flex-wrap";

// Responsive min-width to prevent squishing
className = "flex-1 min-w-0"; // Allow shrinking
className = "flex-1 min-w-[150px]"; // Minimum before wrap
```

### Spacing Scales

```tsx
// Container padding
mobile:  p-4
tablet:  md:p-6
desktop: lg:p-8

// Card padding
mobile:  p-5
tablet:  sm:p-6

// Gap spacing
mobile:  gap-2 or gap-3
tablet:  sm:gap-4
desktop: lg:gap-6
```

---

## CSS Custom Classes

### Utility Classes

```css
/* Animation */
.animate-fade-in {
  /* Fade in animation */
}
.animate-slide-up {
  /* Slide up animation */
}
.animate-shimmer {
  /* Skeleton shimmer */
}

/* Effects */
.glass-effect {
  /* Glassmorphism backdrop blur */
}
.shadow-soft {
  /* Subtle shadow */
}
.hover-lift {
  /* Lift on hover */
}

/* Scrollbar */
.custom-scrollbar {
  /* Styled scrollbar */
}
```

---

## Implementation Example: Manage Templates Page

### Before

- Traditional list layout with buttons inline
- Inconsistent spacing and typography
- No avatar icons or visual hierarchy
- Simple card design without glass effect

### After

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect transition-all border-l-4 border-l-blue-500 relative">
  <CardContent className="p-5 sm:p-6">
    {/* Line 1: Title with avatar */}
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Avatar className="h-10 w-10 bg-blue-50">
        <AvatarFallback className="bg-blue-50 text-blue-600">
          <FileText className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary font-medium mb-1">Template Title</p>
        <h3 className="text-xl font-semibold text-foreground truncate">
          {template.title}
        </h3>
      </div>
    </div>

    {/* Line 2: Description with avatar */}
    {/* Line 3: Categories with avatar */}
    {/* Line 4: Importance & Performance Factor with avatars */}

    {/* Absolute positioned action buttons */}
    <div className="absolute top-5 right-5 flex gap-2">
      {/* Edit & Delete buttons */}
    </div>
  </CardContent>
</Card>
```

**Improvements**:
✅ Avatar icons for visual recognition
✅ Consistent color coding
✅ Glass-effect cards with hover-lift
✅ Absolute positioned action buttons
✅ Gradient header text
✅ Proper spacing and typography hierarchy
✅ Border-left accent color
✅ Responsive flex layouts

---

## Best Practices

### 1. **Consistency**

- Use the same avatar color scheme across all pages
- Apply consistent spacing (gap-2, gap-3, gap-4)
- Follow typography hierarchy

### 2. **Accessibility**

- Always include aria-labels for icon-only buttons
- Provide title attributes for hover tooltips
- Use semantic HTML (h1, h2, h3, etc.)
- Ensure color contrast meets WCAG standards

### 3. **Performance**

- Use memo/useMemo for expensive computations
- Lazy load images and heavy components
- Minimize re-renders with proper dependencies

### 4. **Responsive**

- Test on mobile, tablet, and desktop
- Hide text labels on mobile when space is tight
- Use flex-wrap for button groups
- Set min-width to prevent content squishing

### 5. **Visual Hierarchy**

- Use gradient text for main headers
- Scale font sizes appropriately
- Apply proper spacing between sections
- Use color to indicate importance/status

---

## Future Enhancements

### Potential Additions

1. **Dark Mode Support**: Add dark variants for all color schemes
2. **Animation Library**: Expand custom animations (fade-in, slide, etc.)
3. **Icon System**: Create consistent icon sizing and color utilities
4. **Micro-interactions**: Add subtle animations on user actions
5. **Loading States**: Standardize skeleton loaders across all pages

### Maintenance

- Document new patterns as they emerge
- Update this guide when design system evolves
- Review and refactor old pages to match new patterns
- Conduct periodic design audits for consistency

---

## Conclusion

This design system provides:

- **Visual Consistency**: Same patterns across all pages
- **Scalability**: Easy to extend to new pages
- **Maintainability**: Clear patterns and reusable components
- **Accessibility**: Proper semantic markup and ARIA labels
- **Responsiveness**: Mobile-first approach with proper breakpoints

All new pages should follow these patterns to maintain design consistency throughout the application.
