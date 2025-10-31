# Frontend Implementation Progress

## ✅ Completed (Phase 1 - Foundation)

### 1. TypeScript Type Definitions ✅
**File:** `frontend/src/types/goalTemplateHeader.ts`

**Types Created:**
- `GoalTemplateHeader` - Basic header structure
- `GoalTemplateHeaderCreate` - For creating new headers
- `GoalTemplateHeaderUpdate` - For updating headers
- `GoalTemplate` - Template structure with header_id
- `GoalTemplateHeaderWithTemplates` - Header with all templates and total weightage
- `Role` - Role structure
- `HeaderSelection` - For import modal state
- `TemplatesByHeader` - For grouping templates by header

### 2. API Integration Layer ✅
**File:** `frontend/src/api/goalTemplateHeaders.ts`

**Functions Implemented:**
- `createTemplateHeader()` - Create new header
- `getHeadersByRole()` - Get headers for specific role with templates
- `getHeaderById()` - Get single header with templates
- `getAllHeaders()` - Get all headers with pagination
- `updateTemplateHeader()` - Update header
- `deleteTemplateHeader()` - Delete header (cascades)
- `getTemplatesByRole()` - Get templates for role
- `createTemplateForHeader()` - Create template under header

### 3. Goal Templates Management Page ✅
**File:** `frontend/src/pages/goal-templates-by-role/GoalTemplatesByRole.tsx`

**Features Implemented:**
- ✅ Role filter dropdown
- ✅ Display headers grouped by role
- ✅ Collapsible header cards showing all templates
- ✅ Header info: title, description, role badge, template count, total weightage
- ✅ Template cards with full details (title, description, performance factors, importance, weightage, categories)
- ✅ Delete header functionality with confirmation
- ✅ Edit/delete buttons (placeholders for modals)
- ✅ Empty state handling
- ✅ Loading states
- ✅ Permission check (manager or above)
- ✅ Refresh functionality

## 🚧 Next Steps (Phase 2 - Modals & Integration)

### 1. Add Route for New Page
**File to Update:** `frontend/src/App.tsx` or your routing configuration

```typescript
{
  path: "/goal-templates-by-role",
  element: <ProtectedRoute component={GoalTemplatesByRole} requiredRole="Manager" />
}
```

### 2. Create Header Management Modals

#### A. Create Header Modal
**File to Create:** `frontend/src/components/modals/CreateHeaderModal.tsx`

**Features Needed:**
- Form with role dropdown, title input, description textarea
- Validation (required fields, duplicate check)
- API integration with `createTemplateHeader()`
- Success/error handling

#### B. Edit Header Modal
**File to Create:** `frontend/src/components/modals/EditHeaderModal.tsx`

**Features Needed:**
- Pre-filled form with existing data
- Same validation as create
- API integration with `updateTemplateHeader()`

**Then:** Wire these modals into `GoalTemplatesByRole.tsx` (replace toast.info placeholders)

### 3. Update ImportFromTemplateModal (MAJOR CHANGE)

**File to Update:** `frontend/src/features/goals/ImportFromTemplateModal.tsx`

**Current State:**
- Displays flat list of individual templates
- Individual template selection
- Manual weightage per template

**New Implementation:**
1. **Add Role Filter:**
   ```typescript
   const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
   const [roles, setRoles] = useState<Role[]>([]);
   ```

2. **Fetch Headers Instead of Templates:**
   ```typescript
   const loadHeadersWithTemplates = async (roleId: number) => {
     const result = await getHeadersByRole(roleId);
     if (result.ok && result.data) {
       setHeaderGroups(result.data);
     }
   };
   ```

3. **Header-Level Selection:**
   ```typescript
   const [selectedHeaders, setSelectedHeaders] = useState<Record<number, HeaderSelection>>({});

   const toggleHeaderSelection = (headerId: number, defaultWeightage: number) => {
     setSelectedHeaders(prev => ({
       ...prev,
       [headerId]: prev[headerId]?.checked
         ? { ...prev[headerId], checked: false }
         : { header_id: headerId, checked: true, adjusted_total_weightage: defaultWeightage }
     }));
   };
   ```

4. **UI Structure:**
   ```tsx
   {headerGroups.map((group) => (
     <Collapsible key={group.header_id}>
       <div className="header-card">
         <Checkbox
           checked={selectedHeaders[group.header_id]?.checked}
           onCheckedChange={() => toggleHeaderSelection(group.header_id, group.total_default_weightage)}
         />
         <div>
           <h3>{group.title}</h3>
           <p>{group.description}</p>
           <Badge>{group.goal_templates.length} templates</Badge>
           <Badge>{group.total_default_weightage}% total</Badge>
         </div>

         {selectedHeaders[group.header_id]?.checked && (
           <Input
             type="number"
             label="Adjust Total Weightage"
             value={selectedHeaders[group.header_id].adjusted_total_weightage}
             onChange={(e) => adjustHeaderWeightage(group.header_id, Number(e.target.value))}
           />
         )}
       </div>

       <CollapsibleContent>
         {group.goal_templates.map(template => (
           <div key={template.temp_id} className="template-preview">
             {/* Full template details */}
           </div>
         ))}
       </CollapsibleContent>
     </Collapsible>
   ))}
   ```

5. **Import Logic (Proportional Weightage):**
   ```typescript
   const handleImportHeaders = () => {
     const allGoals: AppraisalGoal[] = [];

     Object.keys(selectedHeaders)
       .filter(id => selectedHeaders[Number(id)].checked)
       .forEach(headerId => {
         const headerGroup = headerGroups.find(h => h.header_id === Number(headerId));
         if (!headerGroup) return;

         const adjustedTotal = selectedHeaders[Number(headerId)].adjusted_total_weightage
           || headerGroup.total_default_weightage;
         const ratio = adjustedTotal / headerGroup.total_default_weightage;

         // Create goals from all templates with proportional weightage
         headerGroup.goal_templates.forEach(template => {
           const adjustedWeightage = Math.round(template.temp_weightage * ratio);
           const pseudoGoal = createPseudoGoalFromTemplate(template, adjustedWeightage);
           allGoals.push(pseudoGoal);
         });
       });

     onGoalsAdded(allGoals); // Use existing batch import
     toast.success(`Imported ${allGoals.length} goals`);
     closeAndReset();
   };
   ```

### 4. Update CreateAppraisal Integration

**File to Update:** `frontend/src/pages/appraisal-create/CreateAppraisal.tsx`

**Change Needed:**
```typescript
// Line ~718-724
<ImportFromTemplateModal
  open={importFromTemplateOpen}
  onClose={() => setImportFromTemplateOpen(false)}
  onGoalAdded={handleGoalAdded}
  onGoalsAdded={handleGoalsAdded}  // Already exists
  appraisalId={createdAppraisalId ?? undefined}
  remainingWeightage={Math.max(0, 100 - totalWeightageUi)}
  defaultRoleId={formValues.appraisee_id ? employees.find(e => e.emp_id === formValues.appraisee_id)?.role_id : undefined}  // NEW
/>
```

## 📊 Implementation Status

### ✅ Completed (All Implementation Phases)
- [x] TypeScript interfaces
- [x] API integration functions
- [x] GoalTemplatesByRole page (management)
- [x] Role filtering
- [x] Header display with templates
- [x] Delete functionality
- [x] Add route to AppRouter.tsx
- [x] Create header modals (Create/Edit)
- [x] Wire modals to management page
- [x] Update ImportFromTemplateModal (header-level selection) ✅
- [x] Add role context to CreateAppraisal ✅

### 🧪 Testing Phase
- [ ] End-to-end testing ⬅️ READY FOR TESTING

## 🎯 Key Design Implementation

### Header-Level Import (Most Important Change)

**Before:**
```
☐ Template 1 (25%)  [Weightage: ___ ]
☐ Template 2 (30%)  [Weightage: ___ ]
☐ Template 3 (20%)  [Weightage: ___ ]
```

**After:**
```
☐ 📋 Core Competencies (Total: 75%)
   Role: Software Engineer | 3 Templates
   [Adjust Total: 75 %]

   ▼ Templates Included:
     🎯 Template 1 (25%) - Code Quality
     🎯 Template 2 (30%) - Technical Design
     🎯 Template 3 (20%) - Collaboration
```

When user selects the header and adjusts to 60%:
- Template 1: 20% (25/75 * 60)
- Template 2: 24% (30/75 * 60)
- Template 3: 16% (20/75 * 60)

## 📁 File Structure

```
frontend/src/
├── types/
│   └── goalTemplateHeader.ts ✅
├── api/
│   └── goalTemplateHeaders.ts ✅
├── pages/
│   └── goal-templates-by-role/
│       └── GoalTemplatesByRole.tsx ✅
├── components/
│   └── modals/
│       ├── CreateHeaderModal.tsx ✅
│       └── EditHeaderModal.tsx ✅
├── AppRouter.tsx ✅ (route added)
└── features/
    └── goals/
        └── ImportFromTemplateModal.tsx (TO UPDATE ⬅️ NEXT)
```

## 🚀 Implementation Checklist

1. ~~Add route to AppRouter.tsx~~ ✅ DONE
2. ~~Create Modals: Create/Edit header modals~~ ✅ DONE
3. ~~Wire modals to management page~~ ✅ DONE
4. ~~Refactor ImportFromTemplateModal for header-level selection~~ ✅ DONE
5. ~~Connect CreateAppraisal with role context~~ ✅ DONE
6. **READY:** End-to-end testing and validation

## ✨ Summary

**Phase 1 Complete:** Foundation is solid with types, API layer, and management page. ✅

**Phase 2 Complete:** Modals created and fully wired to management page. ✅

**Phase 3 Complete:** ImportFromTemplateModal refactored with header-level selection and proportional weightage. ✅

**All Implementation Complete:** Ready for end-to-end testing!

---

**Last Updated:** 2025-01-29
**Status:** All Implementation Complete - Ready for Testing
