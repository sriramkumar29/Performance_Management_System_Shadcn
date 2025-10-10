# Button Styling Standards

## Overview
This document defines the standardized button colors, variants, sizes, and usage patterns to ensure consistency across the entire Performance Management System application.

---

## 🎨 Color System

### Button Color Guide

| Action Type | Variant | Color | Use Case |
|------------|---------|-------|----------|
| **Destructive** | `destructive` | 🔴 Red | Delete, Cancel, Remove, Close |
| **Primary** | `default` | 🔵 Blue (Primary color) | Submit, Save, Create, Confirm |
| **Secondary** | `outline` | 🔵 Blue border + transparent | Edit, View, Back, Save Draft |
| **Ghost** | `ghost` | Transparent | Toggle, Expand/Collapse |
| **Link** | `link` | Underlined text | Text links |

---

## 📏 Size Standards

### Button Sizes

| Size | Usage | Example |
|------|-------|---------|
| **`sm`** | Small actions, secondary buttons | Edit, Delete, Add buttons in cards |
| **`default`** | Standard actions | Submit, Save, Cancel |
| **`lg`** | Prominent actions | Hero/Landing page CTAs |
| **`icon`** | Icon-only buttons | Back arrow, Close X, Pagination |

### Minimum Widths (for consistency)

```tsx
// Small buttons
min-w-[70px]

// Default buttons
min-w-[80px]

// Large buttons
min-w-[100px]
```

---

## 🎯 Button Standards by Action

### 1. Destructive Actions (Red Buttons)

#### Delete Button
```tsx
<Button 
  variant="destructive"
  size="sm"
  className="hover:shadow-glow transition-all min-w-[80px]"
>
  <Trash2 className="h-4 w-4 mr-2" />
  Delete
</Button>
```

#### Cancel Button
```tsx
<Button 
  variant="destructive"
  className="hover:shadow-soft transition-all"
>
  Cancel
</Button>
```

#### Close X Button (Icon only)
```tsx
<Button 
  variant="destructive"
  size="icon"
  className="rounded-full hover:shadow-glow"
>
  <X className="h-4 w-4" />
</Button>
```

#### Remove Button
```tsx
<Button 
  variant="destructive"
  size="sm"
  className="hover:shadow-glow"
>
  <Trash2 className="h-4 w-4 mr-2" />
  Remove
</Button>
```

---

### 2. Primary Actions (Filled Blue Buttons)

#### Submit Button
```tsx
<Button 
  variant="default"
  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
>
  <Send className="h-4 w-4 mr-2" />
  Submit
</Button>
```

#### Save Button
```tsx
<Button 
  variant="default"
  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
>
  <Save className="h-4 w-4 mr-2" />
  Save
</Button>
```

#### Create Button
```tsx
<Button 
  variant="default"
  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
>
  <Plus className="h-4 w-4 mr-2" />
  Create New
</Button>
```

#### Confirm Button (in dialogs)
```tsx
<Button 
  variant="default"
  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
>
  Confirm
</Button>
```

---

### 3. Secondary Actions (Blue Outline Buttons)

#### View Button
```tsx
<Button 
  variant="outline"
  size="sm"
  className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40 min-w-[80px]"
>
  <Eye className="h-4 w-4 mr-2" />
  View
</Button>
```

#### Edit Button
```tsx
<Button 
  variant="outline"
  size="sm"
  className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40 min-w-[80px]"
>
  <Edit className="h-4 w-4 mr-2" />
  Edit
</Button>
```

#### Save Draft Button
```tsx
<Button 
  variant="outline"
  className="shadow-sm"
>
  <Save className="h-4 w-4 mr-2" />
  Save Draft
</Button>
```

#### Back Button (Circular Icon)
```tsx
<Button 
  variant="outline"
  size="icon"
  className="rounded-full"
>
  <ArrowLeft className="h-4 w-4" />
</Button>
```

#### Cancel Button (Secondary Style, Non-Destructive)
```tsx
<Button 
  variant="outline"
  className="hover:shadow-soft transition-shadow"
>
  Cancel
</Button>
```

---

### 4. Ghost Buttons (Minimal Style)

#### Toggle Button
```tsx
<Button 
  variant="ghost"
  size="sm"
>
  <ChevronDown className="h-4 w-4" />
</Button>
```

#### Pagination Button
```tsx
<Button 
  variant="ghost"
  size="icon"
  className="rounded-full hover:bg-primary/10"
>
  <ArrowLeft className="h-4 w-4" />
</Button>
```

---

## 🎭 Special Use Cases

### Action Button Groups

When placing Edit and Delete buttons together:

```tsx
<div className="flex items-center gap-3">
  <Button 
    variant="outline"
    size="sm"
    className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40 min-w-[80px]"
  >
    <Edit className="h-4 w-4 mr-2" />
    Edit
  </Button>
  <Button 
    variant="destructive"
    size="sm"
    className="hover:shadow-glow min-w-[80px]"
  >
    <Trash2 className="h-4 w-4 mr-2" />
    Delete
  </Button>
</div>
```

### Tab Buttons

```tsx
// Active tab
<Button 
  variant="default"
  className="bg-primary text-primary-foreground"
>
  Active Tab
</Button>

// Inactive tab
<Button 
  variant="outline"
>
  Inactive Tab
</Button>
```

### Dialog Buttons

```tsx
<DialogFooter className="gap-2">
  <Button 
    variant="outline"
    className="hover:shadow-soft transition-shadow"
  >
    Cancel
  </Button>
  <Button 
    variant="default"
    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
  >
    Confirm
  </Button>
</DialogFooter>
```

---

## 📐 Icon Guidelines

### Icon Sizes

| Context | Size Class | Use Case |
|---------|-----------|----------|
| Small buttons | `h-3 w-3` | Compact UI |
| Default buttons | `h-4 w-4` | Standard size |
| Large buttons | `h-5 w-5` | Prominent actions |
| Extra large | `h-6 w-6` | Hero sections |

### Icon Spacing

```tsx
// Icon before text
<Icon className="h-4 w-4 mr-2" />

// Icon after text
<Icon className="h-4 w-4 ml-2" />

// Icon only (no spacing needed)
<Icon className="h-4 w-4" />
```

---

## 🎯 Quick Reference Table

| Action | Variant | Size | Color | Min Width | Icon Size |
|--------|---------|------|-------|-----------|-----------|
| Delete | `destructive` | `sm` | 🔴 Red | 80px | `h-4 w-4` |
| Cancel | `destructive` | `default` | 🔴 Red | - | `h-4 w-4` |
| Close X | `destructive` | `icon` | 🔴 Red | - | `h-4 w-4` |
| Submit | `default` | `default` | 🔵 Blue | - | `h-4 w-4` |
| Save | `default` | `default` | 🔵 Blue | - | `h-4 w-4` |
| Create | `default` | `default` | 🔵 Blue | - | `h-4 w-4` |
| View | `outline` | `sm` | 🔵 Border | 80px | `h-4 w-4` |
| Edit | `outline` | `sm` | 🔵 Border | 80px | `h-4 w-4` |
| Save Draft | `outline` | `default` | 🔵 Border | - | `h-4 w-4` |
| Back | `outline` | `icon` | 🔵 Border | - | `h-4 w-4` |
| Toggle | `ghost` | `sm` | Transparent | - | `h-4 w-4` |

---

## 🔧 Using the Constants File

### Import

```tsx
import { 
  BUTTON_STYLES, 
  ICON_SIZES, 
  BUTTON_SPACING,
  getButtonProps 
} from '@/constants/buttonStyles';
```

### Usage Examples

#### Example 1: Using pre-defined styles

```tsx
<Button {...getButtonProps('DELETE')}>
  <Trash2 className={ICON_SIZES.DEFAULT} />
  Delete
</Button>
```

#### Example 2: Manual approach

```tsx
<Button 
  variant={BUTTON_STYLES.VIEW.variant}
  size={BUTTON_STYLES.VIEW.size}
  className={BUTTON_STYLES.VIEW.className}
>
  <Eye className={ICON_SIZES.DEFAULT} />
  View
</Button>
```

#### Example 3: Button group with spacing

```tsx
<div className={`flex items-center ${BUTTON_SPACING.DEFAULT}`}>
  <Button {...getButtonProps('EDIT', 'min-w-[80px]')}>
    Edit
  </Button>
  <Button {...getButtonProps('DELETE', 'min-w-[80px]')}>
    Delete
  </Button>
</div>
```

---

## ✅ Checklist for New Buttons

When adding a new button, ensure:

- [ ] Correct variant is used (destructive/default/outline/ghost)
- [ ] Appropriate size is set (sm/default/lg/icon)
- [ ] Proper color class is applied
- [ ] Icon size matches button size
- [ ] Icon spacing is correct (mr-2 or ml-2)
- [ ] Hover effects are applied
- [ ] Min-width is set for consistency (when in button groups)
- [ ] Accessible labels (aria-label, title) are provided
- [ ] Loading states are handled (disabled + loading text)

---

## 🎨 Color Reference

### Destructive (Red)
- **Variant:** `destructive`
- **Background:** Red/Error color from theme
- **Text:** White
- **Use:** Delete, Cancel, Remove, Close

### Primary (Blue)
- **Variant:** `default`
- **Background:** Primary color from theme
- **Text:** Primary foreground color
- **Use:** Submit, Save, Create, Confirm

### Secondary (Blue Outline)
- **Variant:** `outline`
- **Border:** Primary color with opacity
- **Text:** Primary color
- **Background:** Transparent (hover: light primary)
- **Use:** Edit, View, Back, Save Draft

### Ghost (Transparent)
- **Variant:** `ghost`
- **Background:** Transparent (hover: slight opacity)
- **Text:** Foreground color
- **Use:** Toggle, Minimize, Expand/Collapse

---

## 📱 Responsive Considerations

### Mobile-Friendly Patterns

```tsx
// Hide text on mobile, show on larger screens
<Button variant="outline" size="sm">
  <Edit className="h-4 w-4" />
  <span className="hidden sm:inline sm:ml-2">Edit</span>
</Button>

// Stack buttons vertically on mobile
<div className="flex flex-col sm:flex-row gap-3">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>
```

---

## 🚀 Migration Guide

To standardize existing buttons:

1. **Identify the button's purpose** (delete, submit, view, etc.)
2. **Find the matching standard** in this document
3. **Update the button props** to match
4. **Test the appearance** and behavior
5. **Verify responsive behavior** on mobile

---

## 📝 Examples from the Application

### Team Appraisal Page

```tsx
// Draft appraisal action buttons
{a.status === "Draft" && (
  <div className="flex items-center gap-3">
    <Button 
      variant="outline"
      size="sm"
      className="border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/40 min-w-[80px]"
    >
      <Edit className="h-4 w-4 mr-2" />
      Edit
    </Button>
    <Button 
      variant="destructive"
      size="sm"
      className="hover:shadow-glow min-w-[80px]"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </Button>
  </div>
)}
```

### Create Appraisal Page

```tsx
// Fixed bottom action bar
<div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50">
  <div className="mx-auto max-w-full px-4 py-4">
    <div className="flex items-center justify-between gap-4">
      <Button 
        variant="outline"
        className="shadow-sm"
      >
        <Save className="h-4 w-4 mr-2" />
        Save Draft
      </Button>
      <Button 
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
      >
        <Send className="h-4 w-4 mr-2" />
        Submit for Acknowledgement
      </Button>
    </div>
  </div>
</div>
```

### Goal Templates Page

```tsx
// Template card actions
<div className="flex items-center gap-2">
  <Button 
    variant="outline"
    size="sm"
    className="hover:shadow-soft"
  >
    <Edit className="h-4 w-4" />
    <span className="hidden sm:inline sm:ml-2">Edit</span>
  </Button>
  <Button 
    variant="destructive"
    size="sm"
    className="hover:shadow-glow"
  >
    <Trash2 className="h-4 w-4" />
    <span className="hidden sm:inline sm:ml-2">Delete</span>
  </Button>
</div>
```

---

## 🎯 Summary

### Key Principles

1. **Consistency:** Use the same style for the same action across the app
2. **Color Coding:** Red = destructive, Blue = primary/secondary actions
3. **Size Matching:** Buttons in the same group should have same size
4. **Icon Standards:** Use consistent icon sizes and spacing
5. **Accessibility:** Always provide aria-labels and titles
6. **Responsive:** Consider mobile users with hidden text patterns

### Quick Decision Tree

```
Is it destructive (delete/cancel/remove)?
  → YES: Use `variant="destructive"` (red)
  → NO: Continue

Is it a primary action (submit/save/create)?
  → YES: Use `variant="default"` (filled blue)
  → NO: Continue

Is it a secondary action (edit/view/back)?
  → YES: Use `variant="outline"` (blue border)
  → NO: Continue

Is it subtle (toggle/expand)?
  → YES: Use `variant="ghost"` (transparent)
```

---

This standardization ensures a professional, consistent user experience throughout the application! 🎉
