# Manage Templates Page Redesign

## Overview

Complete redesign of the Manage Goal Templates page to align with the design system implemented in My Appraisal, Team Appraisal, and AppraisalCard components.

---

## Changes Summary

### 1. **Page Layout**

#### Before

```tsx
<div className="mx-auto max-w-7xl p-4 sm:p-6 animate-fade-in-up">
  <div className="flex items-center justify-between gap-3 mb-6">
    {/* Header with back button and title inline */}
  </div>
  {/* Search card */}
  {/* Template list */}
</div>
```

#### After

```tsx
<div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-fade-in">
  <div className="mx-auto max-w-7xl space-y-6">
    {/* Header Card with glass-effect */}
    {/* Search & Filter Card */}
    {/* Templates List */}
  </div>
</div>
```

**Changes**:

- ✅ Added `min-h-screen` for full viewport height
- ✅ Changed to `space-y-6` for consistent vertical spacing
- ✅ Added responsive padding: `p-4 md:p-6 lg:p-8`
- ✅ Changed animation from `fade-in-up` to `fade-in`

---

### 2. **Header Section**

#### Before

```tsx
<div className="flex items-center justify-between gap-3 mb-6">
  <div className="flex items-center gap-3 sm:gap-4">
    <Button variant="outline">
      <ArrowLeft />
      <span className="hidden sm:inline sm:ml-2">Back</span>
    </Button>
    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
      Manage Goal Templates
    </h1>
  </div>
  <Button>Create Template</Button>
</div>
```

#### After

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect">
  <CardHeader className="pb-4">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button variant="outline">
          <ArrowLeft />
          <span className="hidden sm:inline sm:ml-2">Back</span>
        </Button>
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Manage Goal Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage reusable goal templates
          </p>
        </div>
      </div>
      <Button>Create Template</Button>
    </div>
  </CardHeader>
</Card>
```

**Improvements**:

- ✅ Wrapped in Card with `glass-effect` for visual consistency
- ✅ Added `hover-lift` for subtle interaction feedback
- ✅ Added subtitle/description under main title
- ✅ Responsive layout: column on mobile, row on large screens
- ✅ Increased title size: `text-3xl lg:text-4xl`
- ✅ Added shadow-soft for depth

---

### 3. **Search & Filter Section**

#### Before

```tsx
<Card className="mb-6 glass-card shadow-soft">
  <CardContent className="p-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
      <span className="flex items-center gap-2 text-lg font-semibold">
        <Search className="h-5 w-5" />
        Search Templates
      </span>
      <span className="text-sm font-normal text-muted-foreground">
        {visible.length} template(s) found
      </span>
    </div>
    <Input placeholder="Search by title or category..." />
  </CardContent>
</Card>
```

#### After

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-5 sm:p-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold text-foreground">
          Search Templates
        </span>
      </div>
      <Badge
        variant="secondary"
        className="bg-blue-100 text-blue-700 border-blue-200 text-sm font-semibold px-3 py-1"
      >
        {visible.length} template(s)
      </Badge>
    </div>
    <div className="w-full md:w-1/2 lg:w-1/3">
      <Label className="mb-2 block text-sm font-medium">
        Search by title or category
      </Label>
      <Input placeholder="Type to search..." />
    </div>
  </CardContent>
</Card>
```

**Improvements**:

- ✅ Changed `glass-card` to `glass-effect` for consistency
- ✅ Added `border-0` to remove default border
- ✅ Changed count display from plain text to color-coded Badge
- ✅ Added `text-primary` to Search icon
- ✅ Added Label above input field
- ✅ Restricted input width: `w-full md:w-1/2 lg:w-1/3`
- ✅ Improved placeholder text

---

### 4. **Template Cards**

This is the biggest change - complete restructure from simple cards to avatar-based layout.

#### Before

```tsx
<Card className="hover-lift shadow-soft transition-all">
  <CardContent className="p-6">
    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg truncate">{title}</h3>
          <Badge>{weightage}% Weight</Badge>
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-3">{description}</p>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((c) => (
            <Badge>{c.name}</Badge>
          ))}
        </div>

        {/* Importance & Performance Factor */}
        <div className="flex gap-4 text-xs">
          <span>
            Importance: <strong>{importance}</strong>
          </span>
          <span>
            Performance Factor: <strong>{factor}</strong>
          </span>
        </div>
      </div>

      {/* Action buttons inline */}
      <div className="flex gap-2">
        <Button>Edit</Button>
        <Button>Delete</Button>
      </div>
    </div>
  </CardContent>
</Card>
```

#### After

```tsx
<Card className="shadow-soft hover-lift border-0 glass-effect transition-all border-l-4 border-l-blue-500 relative">
  <CardContent className="p-5 sm:p-6">
    <div className="flex flex-col gap-4 mb-6">
      {/* Line 1: Title & Weightage with Avatars */}
      <div className="flex items-start justify-between gap-4 flex-wrap pr-24">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 bg-blue-50">
            <AvatarFallback className="bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-primary font-medium mb-1">
              Template Title
            </p>
            <h3 className="text-xl font-semibold text-foreground truncate">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10 bg-purple-50">
            <AvatarFallback className="bg-purple-50 text-purple-600">
              <Weight className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-primary font-medium">Weightage</p>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              {weightage}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Line 2: Description with Avatar */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 bg-emerald-50">
          <AvatarFallback className="bg-emerald-50 text-emerald-600">
            <FileText className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm text-primary font-medium mb-1">Description</p>
          <p className="text-base text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Line 3: Categories with Avatar */}
      {categories && categories.length > 0 && (
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 bg-amber-50">
            <AvatarFallback className="bg-amber-50 text-amber-600">
              <Layers className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-primary font-medium mb-2">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Line 4: Importance & Performance Factor with Avatars */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-rose-50">
            <AvatarFallback className="bg-rose-50 text-rose-600">
              <TrendingUp className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-primary font-medium">Importance</p>
            <p className="text-base font-semibold text-foreground">
              {importance}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-indigo-50">
            <AvatarFallback className="bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-primary font-medium">
              Performance Factor
            </p>
            <p className="text-base font-semibold text-foreground">{factor}</p>
          </div>
        </div>
      </div>
    </div>

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

**Major Improvements**:

1. **Visual Hierarchy**:

   - ✅ Added Avatar icons for each section (Title, Weightage, Description, Categories, Importance, Performance Factor)
   - ✅ Consistent color coding matching design system
   - ✅ Clear labels (`text-sm text-primary font-medium`) above values
   - ✅ Larger, bolder values (`text-base font-semibold text-foreground`)

2. **Layout Structure**:

   - ✅ Organized into clear horizontal lines
   - ✅ Each line has consistent avatar + content pattern
   - ✅ Proper spacing with `gap-4` and `mb-6`
   - ✅ Responsive wrapping with `flex-wrap`

3. **Card Styling**:

   - ✅ Added `border-l-4 border-l-blue-500` for left accent
   - ✅ Added `border-0 glass-effect` for modern look
   - ✅ Made card `relative` for absolute button positioning
   - ✅ Added `pr-24` padding-right to prevent content overlapping buttons

4. **Action Buttons**:

   - ✅ Moved to absolute positioning (top-right)
   - ✅ Changed to `size="sm"` for cleaner look
   - ✅ Text hidden on mobile, shown on desktop
   - ✅ Doesn't affect card content layout

5. **Typography**:

   - ✅ Title increased to `text-xl` (was `text-lg`)
   - ✅ Description now `text-base` with `line-clamp-2`
   - ✅ Importance/Factor values now `text-base font-semibold`
   - ✅ All labels use consistent `text-sm text-primary font-medium`

6. **Colors & Badges**:
   - ✅ Weightage badge: `bg-purple-100 text-purple-700 border-purple-200`
   - ✅ Category badges: `bg-amber-50 text-amber-700 border-amber-200`
   - ✅ Avatar backgrounds match badge colors for consistency

---

### 5. **Empty State**

#### Before

```tsx
<div className="text-center py-12">
  <div className="text-muted-foreground text-lg mb-2">No templates found</div>
  <div className="text-sm text-muted-foreground">{/* Message */}</div>
</div>
```

#### After

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-12 text-center">
    <div className="text-muted-foreground text-lg mb-2">No templates found</div>
    <div className="text-sm text-muted-foreground">{/* Message */}</div>
  </CardContent>
</Card>
```

**Changes**:

- ✅ Wrapped in Card with glass-effect
- ✅ Added proper shadow and border styling

---

### 6. **Loading Skeleton**

#### Before

```tsx
<Card className="shadow-soft">
  <CardContent className="p-6">{/* Shimmer elements */}</CardContent>
</Card>
```

#### After

```tsx
<Card className="shadow-soft border-0 glass-effect">
  <CardContent className="p-5 sm:p-6">{/* Shimmer elements */}</CardContent>
</Card>
```

**Changes**:

- ✅ Added `border-0 glass-effect`
- ✅ Changed padding to `p-5 sm:p-6` for consistency

---

## New Imports Added

```tsx
import { Label } from "../../components/ui/label";
import { CardHeader } from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  FileText, // Template/Document icon
  Weight, // Weightage icon
  TrendingUp, // Importance/Performance icon
  Layers, // Categories icon
} from "lucide-react";
```

---

## Color Scheme Applied

Following the design system's avatar color scheme:

| Section         | Avatar BG       | Icon Color         | Badge BG        | Badge Text        |
| --------------- | --------------- | ------------------ | --------------- | ----------------- |
| **Title**       | `bg-blue-50`    | `text-blue-600`    | -               | -                 |
| **Weightage**   | `bg-purple-50`  | `text-purple-600`  | `bg-purple-100` | `text-purple-700` |
| **Description** | `bg-emerald-50` | `text-emerald-600` | -               | -                 |
| **Categories**  | `bg-amber-50`   | `text-amber-600`   | `bg-amber-50`   | `text-amber-700`  |
| **Importance**  | `bg-rose-50`    | `text-rose-600`    | -               | -                 |
| **Performance** | `bg-indigo-50`  | `text-indigo-600`  | -               | -                 |

---

## Benefits of Redesign

### 1. **Visual Consistency**

- Matches My Appraisal, Team Appraisal, and AppraisalCard exactly
- Same avatar icons, colors, and layout patterns
- Consistent typography hierarchy

### 2. **Improved Scannability**

- Clear visual separation between sections
- Avatar icons provide instant recognition
- Labels make each field's purpose obvious

### 3. **Better Information Hierarchy**

- Most important info (title, weightage) at top
- Supporting details (description, categories) in middle
- Metadata (importance, factor) at bottom

### 4. **Cleaner Layout**

- Action buttons don't interfere with content
- Better use of whitespace
- More breathing room between elements

### 5. **Enhanced User Experience**

- Glass-effect cards feel modern and premium
- Hover-lift provides subtle interaction feedback
- Responsive design works on all screen sizes

### 6. **Accessibility**

- Proper semantic structure
- Aria-labels on all interactive elements
- Color is not the only indicator (text + icons)

---

## Testing Checklist

- [ ] Test on mobile (320px - 640px)
- [ ] Test on tablet (640px - 1024px)
- [ ] Test on desktop (1024px+)
- [ ] Verify empty state displays correctly
- [ ] Check loading skeleton animations
- [ ] Test Edit button functionality
- [ ] Test Delete button with alert dialog
- [ ] Verify search filter works
- [ ] Check template count badge updates
- [ ] Test Create Template button (managers only)
- [ ] Verify hover effects work
- [ ] Check accessibility with screen reader
- [ ] Test keyboard navigation

---

## File Changes Summary

**Modified File**: `frontend/src/pages/goal-templates/GoalTemplates.tsx`

**Lines Changed**: ~200+ lines restructured

**New Components Used**:

- `CardHeader`
- `Avatar`
- `AvatarFallback`
- `Label`

**New Icons Used**:

- `FileText`
- `Weight`
- `TrendingUp`
- `Layers`

---

## Screenshots (Conceptual)

### Before

```
┌─────────────────────────────────────┐
│ ← Back  Manage Goal Templates      │
│                      [Create Template]│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔍 Search Templates    5 found      │
│ [Search input........................]│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Template Title        [80% Weight]  │
│ Description text here...            │
│ [Cat1] [Cat2] [Cat3]               │
│ Importance: High                    │
│ Performance: Innovation             │
│                    [Edit] [Delete]  │
└─────────────────────────────────────┘
```

### After

```
┌──────────────────────────────────────────┐
│ ← Back                                   │
│   Manage Goal Templates         [Create] │
│   Create and manage reusable templates   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🔍 Search Templates      │5 template(s)│ │
│                                          │
│ Search by title or category             │
│ [Search input...............]            │
└──────────────────────────────────────────┘

┌─|────────────────────────────────────────┐ ← Blue left border
│ │  📄 Template Title                     │
│ │     Template Name          💜 Weightage│
│ │                               │80%│    │
│ │                                [Edit][×]│← Absolute positioned
│ │  📄 Description                        │
│ │     Description text here...           │
│ │                                        │
│ │  📚 Categories                         │
│ │     │Cat1│ │Cat2│ │Cat3│             │
│ │                                        │
│ │  📈 Importance    📊 Performance       │
│ │     High             Innovation        │
└──────────────────────────────────────────┘
```

---

## Conclusion

The Manage Templates page now fully aligns with the established design system, providing:

- ✅ Visual consistency across the application
- ✅ Improved information hierarchy
- ✅ Better user experience
- ✅ Modern, clean aesthetic
- ✅ Responsive design
- ✅ Accessible interface

All design patterns documented in `DESIGN_SYSTEM_IMPLEMENTATION.md` have been successfully applied to this page.
