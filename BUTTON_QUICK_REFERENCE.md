# Button Styling Quick Reference Card

## 🎨 Color System at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│ BUTTON COLOR CODING                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔴 RED (Destructive)                                        │
│    • Delete • Cancel • Remove • Close X                     │
│    • variant="destructive"                                  │
│    • Color: #dc2626 (red-600)                               │
│                                                             │
│ 🔵 BLUE FILLED (Primary Actions)                            │
│    • Submit • Save • Create • Confirm • Evaluate • Review   │
│    • variant="default"                                      │
│    • Color: bg-primary (blue filled)                        │
│                                                             │
│ 🔷 BLUE BORDER (Secondary Actions)                          │
│    • Edit • View • Back • Save Draft                        │
│    • variant="outline"                                      │
│    • Color: border-primary (blue outline)                   │
│                                                             │
│ ⚪ TRANSPARENT (Ghost Actions)                              │
│    • Toggle • Expand/Collapse • Icon navigation             │
│    • variant="ghost"                                        │
│    • Color: transparent with hover                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📏 Size Standards

```
┌──────────────────────────────────────────────┐
│ BUTTON SIZES                                 │
├──────────────────────────────────────────────┤
│                                              │
│ sm (Small)                                   │
│ • Card action buttons                        │
│ • Compact layouts                            │
│ • Example: Edit/Delete in card views         │
│                                              │
│ default (Default)                            │
│ • Main action buttons                        │
│ • Forms and primary actions                  │
│ • Example: Submit, Save, Create              │
│                                              │
│ icon (Icon-only)                             │
│ • Icon-only buttons                          │
│ • Navigation buttons                         │
│ • Example: Back arrow, Close X               │
│                                              │
└──────────────────────────────────────────────┘
```

## 🔧 Quick Implementation

### Import
```typescript
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
```

### Common Button Types

#### ❌ Delete Button
```tsx
<Button
  variant={BUTTON_STYLES.DELETE.variant}
  size={BUTTON_STYLES.DELETE.size}
  className={BUTTON_STYLES.DELETE.className}
>
  <Trash2 className={ICON_SIZES.DEFAULT} />
  Delete
</Button>
```

#### ✏️ Edit Button
```tsx
<Button
  variant={BUTTON_STYLES.EDIT.variant}
  size={BUTTON_STYLES.EDIT.size}
  className={BUTTON_STYLES.EDIT.className}
>
  <Edit className={ICON_SIZES.DEFAULT} />
  Edit
</Button>
```

#### 👁️ View Button
```tsx
<Button
  variant={BUTTON_STYLES.VIEW.variant}
  size={BUTTON_STYLES.VIEW.size}
  className={BUTTON_STYLES.VIEW.className}
>
  <span className="hidden sm:inline">View</span>
  <ArrowRight className={`${ICON_SIZES.DEFAULT} sm:ml-2`} />
</Button>
```

#### ⬅️ Back Button
```tsx
<Button
  variant={BUTTON_STYLES.BACK.variant}
  size={BUTTON_STYLES.BACK.size}
  className={BUTTON_STYLES.BACK.className}
>
  <ArrowLeft className={ICON_SIZES.DEFAULT} />
</Button>
```

#### ✅ Submit Button
```tsx
<Button
  variant={BUTTON_STYLES.SUBMIT.variant}
  className={BUTTON_STYLES.SUBMIT.className}
>
  <Send className={`${ICON_SIZES.DEFAULT} mr-2`} />
  Submit
</Button>
```

#### 💾 Save Button
```tsx
<Button
  variant={BUTTON_STYLES.SAVE.variant}
  className={BUTTON_STYLES.SAVE.className}
>
  <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
  Save
</Button>
```

#### 📝 Save Draft Button
```tsx
<Button
  variant={BUTTON_STYLES.SAVE_DRAFT.variant}
  className={BUTTON_STYLES.SAVE_DRAFT.className}
>
  <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
  Save Draft
</Button>
```

#### 🚫 Cancel Button
```tsx
<Button
  variant={BUTTON_STYLES.CANCEL.variant}
>
  Cancel
</Button>
```

## 📐 Spacing Standards

```
┌────────────────────────────────────────┐
│ SPACING                                │
├────────────────────────────────────────┤
│                                        │
│ Button Groups:                         │
│ • gap-3 (0.75rem / 12px)               │
│ • Example: Save Draft | Submit         │
│                                        │
│ Card Button Groups:                    │
│ • gap-2 (0.5rem / 8px)                 │
│ • Example: Edit | Delete               │
│                                        │
│ Icon Spacing:                          │
│ • mr-2 (icon before text)              │
│ • ml-2 (icon after text)               │
│ • sm:ml-2 (responsive after text)      │
│                                        │
│ Minimum Widths:                        │
│ • min-w-[80px] (button groups)         │
│ • min-w-[100px] (prominent actions)    │
│                                        │
└────────────────────────────────────────┘
```

## 🎯 Decision Tree

```
Need a button? Start here:
│
├─ Is it destructive/dangerous?
│  ├─ YES → Use BUTTON_STYLES.DELETE or .CANCEL (Red)
│  └─ NO  → Continue...
│
├─ Is it the primary action?
│  ├─ YES → Use BUTTON_STYLES.SUBMIT or .SAVE (Blue Filled)
│  └─ NO  → Continue...
│
├─ Is it a secondary action?
│  ├─ YES → Use BUTTON_STYLES.EDIT or .VIEW (Blue Border)
│  └─ NO  → Continue...
│
└─ Is it a subtle/toggle action?
   └─ YES → Use BUTTON_STYLES.BACK or custom ghost (Transparent)
```

## 📦 Available Button Styles

| Constant | Variant | Size | Color | Use Case |
|----------|---------|------|-------|----------|
| `BUTTON_STYLES.DELETE` | destructive | sm | Red | Delete actions |
| `BUTTON_STYLES.CANCEL` | destructive | default | Red | Cancel dialogs |
| `BUTTON_STYLES.CLOSE` | ghost | icon | Transparent | Close X buttons |
| `BUTTON_STYLES.SUBMIT` | default | default | Blue filled | Submit forms |
| `BUTTON_STYLES.SAVE` | default | default | Blue filled | Save changes |
| `BUTTON_STYLES.SAVE_DRAFT` | outline | default | Blue border | Save drafts |
| `BUTTON_STYLES.CREATE` | default | default | Blue filled | Create new items |
| `BUTTON_STYLES.VIEW` | outline | sm | Blue border | View details |
| `BUTTON_STYLES.EDIT` | outline | sm | Blue border | Edit items |
| `BUTTON_STYLES.BACK` | outline | icon | Blue border | Navigation back |
| `BUTTON_STYLES.EVALUATE` | default | default | Blue filled | Evaluate appraisals |
| `BUTTON_STYLES.REVIEW` | default | default | Blue filled | Review appraisals |

## 🔍 Icon Sizes

| Constant | Size | Use Case |
|----------|------|----------|
| `ICON_SIZES.SM` | h-3 w-3 | Small icons |
| `ICON_SIZES.DEFAULT` | h-4 w-4 | Standard icons (most common) |
| `ICON_SIZES.LG` | h-5 w-5 | Large icons |
| `ICON_SIZES.XL` | h-6 w-6 | Extra large icons |

## ✨ Common Patterns

### Dialog Footer Buttons
```tsx
<DialogFooter className="flex-col sm:flex-row gap-2">
  <Button variant={BUTTON_STYLES.CANCEL.variant}>
    Cancel
  </Button>
  <Button
    variant={BUTTON_STYLES.SAVE.variant}
    className={BUTTON_STYLES.SAVE.className}
  >
    <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
    Save
  </Button>
</DialogFooter>
```

### Card Action Buttons
```tsx
<div className="flex items-center gap-2">
  <EditAppraisalButton className="min-w-[80px]" />
  <DeleteAppraisalButton className="min-w-[80px]" />
</div>
```

### Fixed Bottom Action Bar
```tsx
<div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm">
  <div className="flex items-center justify-between gap-4 px-4 py-4">
    <Button variant={BUTTON_STYLES.SAVE_DRAFT.variant}>
      Save Draft
    </Button>
    <Button
      variant={BUTTON_STYLES.SUBMIT.variant}
      className={BUTTON_STYLES.SUBMIT.className}
    >
      Submit
    </Button>
  </div>
</div>
```

### Responsive Button Text
```tsx
<Button variant={BUTTON_STYLES.VIEW.variant}>
  <span className="hidden sm:inline">View Details</span>
  <ArrowRight className={`${ICON_SIZES.DEFAULT} sm:ml-2`} />
</Button>
```

## 📋 Checklist for New Buttons

- [ ] Import `BUTTON_STYLES` and `ICON_SIZES` from constants
- [ ] Choose appropriate button style based on action type
- [ ] Use standardized variant, size, and className
- [ ] Apply correct icon size using `ICON_SIZES.DEFAULT`
- [ ] Add proper icon spacing (mr-2 or ml-2)
- [ ] Include aria-label and title for accessibility
- [ ] Test responsive behavior if applicable
- [ ] Verify button group spacing (gap-2 or gap-3)
- [ ] Check minimum width if in button group

## 🚀 Quick Start Example

```typescript
// 1. Import at top of file
import { BUTTON_STYLES, ICON_SIZES } from "../../constants/buttonStyles";
import { Save, Send } from "lucide-react";

// 2. Use in component
function MyComponent() {
  return (
    <div className="flex gap-3">
      <Button
        variant={BUTTON_STYLES.SAVE_DRAFT.variant}
        className={BUTTON_STYLES.SAVE_DRAFT.className}
      >
        <Save className={`${ICON_SIZES.DEFAULT} mr-2`} />
        Save Draft
      </Button>
      
      <Button
        variant={BUTTON_STYLES.SUBMIT.variant}
        className={BUTTON_STYLES.SUBMIT.className}
      >
        <Send className={`${ICON_SIZES.DEFAULT} mr-2`} />
        Submit
      </Button>
    </div>
  );
}
```

## 📚 Full Documentation

For complete documentation, examples, and migration guides, see:
- `BUTTON_STYLING_STANDARDS.md` - Comprehensive guide
- `BUTTON_STANDARDIZATION_COMPLETE.md` - Implementation summary
- `frontend/src/constants/buttonStyles.ts` - Source code with inline docs

---

**Last Updated**: Implementation complete for TeamAppraisal, CreateAppraisal, and SelfAssessment pages.
