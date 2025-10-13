# Goal Template Weightage Redesign

## Overview

This document outlines the changes made to improve the goal template system by:

1. **Adding dynamic weightage input when importing templates** - Allow users to specify weightage for each template during import into appraisals
2. **Redesigning all modal dialogs** - Modern, consistent design following the application's design system

## Changes Made

### 1. Backend Changes

**No changes required** - Backend already supports weightage in goal templates.

### 2. Frontend Changes

#### CreateTemplateModal.tsx

**Redesigned:**

- Modern card-based layout with proper spacing
- Enhanced visual hierarchy with gradient accents
- Better responsive design
- Improved form field organization
- Category management with visual badges
- Consistent button styling
- **Weightage field included** with validation (1-100%)

#### EditTemplateModal.tsx

**Redesigned:**

- Matching design with CreateTemplateModal
- Loading state with skeleton
- Modern card-based layout
- Enhanced visual feedback
- **Weightage field included** with validation (1-100%)

#### ImportFromTemplateModal.tsx

**Added:**

- Dynamic weightage input for each selected template
- Real-time validation against remaining weightage
- Visual feedback for weightage allocation
- Clear indication of remaining weightage per template

**Redesigned:**

- Modern card-based layout for each template
- Improved checkbox and category selection UI
- Inline weightage input with validation
- Better visual hierarchy
- Enhanced spacing and organization
- Real-time remaining weightage calculation

#### AddGoalModal.tsx

**Redesigned:**

- Modern gradient header with icons
- Card-based form layout
- Enhanced input styling with focus states
- Better visual hierarchy
- Improved spacing and responsiveness
- Icon-enhanced labels

#### EditGoalModal.tsx

**Redesigned:**

- Matching design with AddGoalModal
- Modern gradient header
- Card-based form layout
- Enhanced visual feedback
- Consistent styling

## Design System Applied

### Modal Layout Pattern

```tsx
<Dialog>
  <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-auto nice-scrollbar p-4 sm:p-6">
    <DialogHeader className="pb-3">
      {/* Icon + Title + Description */}
    </DialogHeader>

    <form className="space-y-4">
      {/* Card-wrapped form sections */}
      <div className="rounded-md border p-4 space-y-4">{/* Form fields */}</div>

      {/* Footer buttons */}
    </form>
  </DialogContent>
</Dialog>
```

### Color Scheme

- Primary gradient: `from-blue-600 to-purple-600`
- Success/Add: `text-green-600`
- Edit: `text-blue-600`
- Delete/Cancel: `text-red-600`
- Muted text: `text-muted-foreground`

### Typography

- Dialog titles: `text-lg sm:text-xl font-semibold`
- Section labels: `text-sm font-medium`
- Helper text: `text-xs text-muted-foreground`
- Input labels with icons

### Spacing

- Modal padding: `p-4 sm:p-6`
- Form spacing: `space-y-4`
- Card padding: `p-4`
- Button gap: `gap-2`

### Interactive Elements

- Focus rings: `focus:ring-2 focus:ring-primary/20`
- Hover effects: `hover:bg-accent transition-colors`
- Shadow system: `shadow-soft hover:shadow-medium`
- Border radius: `rounded-md`, `rounded-lg`, `rounded-xl`

## User Flow

### Creating a Goal Template

1. Click "Create Template" button
2. Fill in:
   - Title (required)
   - Description
   - Performance Factor
   - Importance Level
   - **Default Weightage** (1-100%, required) - Suggested weightage for this template
   - Categories
3. Save template with default weightage

### Importing Templates into Appraisal

1. Click "Import from Templates" in Create/Edit Appraisal
2. Browse available templates
3. Select templates to import (checkbox)
4. **For each selected template:**
   - Assign a category
   - **Template's default weightage is pre-filled**
   - **Optionally override the weightage** (validated against remaining %)
5. Import selected templates with specified weightages
6. Templates become goals with the weightages you specified (default or overridden)

### Benefits

- **Default Suggestions:** Templates come with recommended weightage based on typical usage
- **Flexibility:** Weightage can be adjusted during import to fit specific appraisal needs
- **Context-aware:** Use default weightage as-is or customize per appraisal context
- **Validation:** Real-time validation ensures total doesn't exceed 100%
- **Best of Both Worlds:** Templates provide guidance while maintaining full customization

## Technical Details

### State Management in ImportFromTemplateModal

```tsx
const [selected, setSelected] = useState<
  Record<
    number,
    {
      checked: boolean;
      categoryId?: number;
      weightage?: number; // NEW
    }
  >
>({});
```

### Validation Logic

```tsx
// Check if weightage exceeds remaining
if (weightage > remainingWeightage) {
  // Show error
}

// Calculate total selected weightage
const totalSelectedWeightage = templates
  .filter((t) => selected[t.temp_id]?.checked)
  .reduce((sum, t) => sum + (selected[t.temp_id]?.weightage || 0), 0);
```

### Import Flow

```tsx
for (const t of chosen) {
  // Use user-specified weightage if overridden, otherwise use template's default
  const userWeightage = selected[t.temp_id]?.weightage || t.temp_weightage || 0;

  if (userWeightage > remaining) {
    toast.error("Insufficient remaining weightage");
    continue;
  }

  // Create pseudo goal with specified weightage (default or overridden)
  const pseudo: AppraisalGoal = {
    // ... other fields
    goal_weightage: userWeightage, // User can override template's default
  };

  remaining -= userWeightage;
}
```

## Migration Notes

### No Database Migration Required

- `temp_weightage` remains a required field (NOT NULL)
- All existing templates already have weightage values
- Full backward compatibility maintained

### Backward Compatibility

- Existing templates continue to work as before
- Default weightage from template is pre-filled during import
- Users can choose to use default or override during import

## Testing Checklist

- [ ] Create template with default weightage (1-100%)
- [ ] Edit template and modify weightage
- [ ] Import single template using default weightage
- [ ] Import single template with overridden weightage
- [ ] Import multiple templates with mixed default/custom weightages
- [ ] Validate weightage doesn't exceed remaining
- [ ] Validate total weightage equals 100% on submission
- [ ] Test all modal designs on mobile and desktop
- [ ] Test form validation and error messages
- [ ] Test category assignment during import
- [ ] Test cancel and close behaviors

## Files Modified

### Backend

- **No changes** - Backend already supports required weightage field

### Frontend

- `frontend/src/components/modals/CreateTemplateModal.tsx` - **Redesigned with modern UI, weightage field retained**
- `frontend/src/components/modals/EditTemplateModal.tsx` - **Redesigned with modern UI, weightage field retained**
- `frontend/src/features/goals/ImportFromTemplateModal.tsx` - **Added weightage override input, redesigned**
- `frontend/src/features/goals/AddGoalModal.tsx` - **Redesigned**
- `frontend/src/features/goals/EditGoalModal.tsx` - **Redesigned**

## Future Enhancements

1. **Template Weightage Suggestions:** Based on historical usage patterns
2. **Preset Weightage Profiles:** Quick allocation patterns (Equal, Priority-based, etc.)
3. **Bulk Weightage Adjustment:** Adjust all selected templates proportionally
4. **Template Favorites:** Mark frequently used templates
5. **Template Categories:** Organize templates by department/role
