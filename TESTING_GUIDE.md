# Goal Template Header - End-to-End Testing Guide

## Overview
This document provides a comprehensive testing guide for the new Goal Template Header feature, which enables role-based template management and header-level import with proportional weightage.

---

## Pre-Testing Setup

### Backend Requirements
1. Ensure backend server is running
2. Database migrations have been applied (tables created)
3. At least 2-3 roles exist in the system (e.g., "Software Engineer", "Manager", "Designer")
4. User is logged in with Manager role or higher

### Frontend Requirements
1. Frontend development server is running
2. User is authenticated
3. Browser console is open for debugging (F12)

---

## Test Suite 1: Goal Template Headers Management Page

### Access the Page
1. Navigate to `/goal-templates-by-role`
2. **Expected**: Page loads with header "Goal Templates by Role"
3. **Expected**: Role filter dropdown is visible
4. **Expected**: "Create Header" button is visible

### Test 1.1: Create Template Header
**Steps:**
1. Click "Create Header" button
2. Modal opens with title "Create Template Header"
3. Select a role from dropdown (e.g., "Software Engineer")
4. Enter title: "Core Competencies"
5. Enter description: "Essential skills for software engineers"
6. Click "Create" button

**Expected Results:**
- ✅ Success toast appears
- ✅ Modal closes
- ✅ New header appears in the list
- ✅ Header shows: title, description, role badge, "0 templates", "0% total weightage"

**Backend Verification:**
- Check browser network tab for POST request to `/api/goal-template-headers`
- Status should be 200/201
- Response should include created header with `header_id`

### Test 1.2: View Header Details (Collapsed/Expanded)
**Steps:**
1. Find the newly created header
2. Click the chevron icon to expand
3. **Expected**: Header expands showing "Templates in this header:" section
4. **Expected**: Empty state or "No templates" message
5. Click chevron again to collapse

**Expected Results:**
- ✅ Smooth expand/collapse animation
- ✅ Empty state shows "Manage Templates" button

### Test 1.3: Edit Template Header
**Steps:**
1. Click the Edit (pencil) icon on the header
2. Modal opens pre-filled with existing data
3. Change title to "Core Competencies Updated"
4. Change description
5. Click "Save Changes"

**Expected Results:**
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Header title and description update immediately
- ✅ No page refresh needed

**Backend Verification:**
- PUT request to `/api/goal-template-headers/{header_id}`
- Status 200
- Response shows updated data

### Test 1.4: Filter by Role
**Steps:**
1. Create headers for different roles (Software Engineer, Manager)
2. Use role filter dropdown at the top
3. Select "Software Engineer"
4. **Expected**: Only Software Engineer headers visible
5. Select "Manager"
6. **Expected**: Only Manager headers visible

**Expected Results:**
- ✅ Filtering works instantly without API calls
- ✅ Header count changes based on filter

### Test 1.5: Delete Template Header
**Steps:**
1. Click delete (trash) icon on a header
2. Confirmation dialog appears
3. Dialog warns: "This will permanently delete this header and ALL templates within it"
4. Click "Cancel"
5. **Expected**: Dialog closes, header remains
6. Click delete icon again
7. Click "Delete" in dialog

**Expected Results:**
- ✅ Success toast appears
- ✅ Header disappears from list
- ✅ Page updates without refresh

**Backend Verification:**
- DELETE request to `/api/goal-template-headers/{header_id}`
- Status 200
- If header had templates, they should also be deleted (cascade)

### Test 1.6: Header with Templates (Integration)
**Prerequisites:** Create some templates via the regular goal templates page with `header_id` set

**Steps:**
1. Navigate to regular Goal Templates page
2. Create 2-3 templates and assign them to a header
3. Go back to `/goal-templates-by-role`
4. Find the header
5. Expand the header

**Expected Results:**
- ✅ Templates appear in the collapsible section
- ✅ Each template shows: title, description, categories, importance, weightage
- ✅ Total weightage is calculated and displayed (sum of all template weightages)
- ✅ Template count badge is accurate

---

## Test Suite 2: Import From Template Modal (Header-Level Selection)

### Access the Modal
1. Navigate to `/appraisals/create`
2. Fill appraisal details:
   - Select an appraisee (note their role, e.g., "Software Engineer")
   - Select a reviewer
   - Select appraisal type
   - Set period
3. Click "Import from Templates" button
4. Modal opens

### Test 2.1: Role Filter Auto-Selection
**Steps:**
1. Modal opens
2. **Expected**: Role filter dropdown is pre-selected with appraisee's role
3. **Expected**: Headers for that role are already loaded and visible

**Expected Results:**
- ✅ Role dropdown shows appraisee's role
- ✅ Headers list is populated
- ✅ No need to manually select role

**Backend Verification:**
- GET request to `/api/goal-template-headers/role/{role_id}`
- Status 200
- Response includes headers with templates nested

### Test 2.2: Manual Role Selection
**Steps:**
1. Change role filter to a different role
2. **Expected**: Headers list updates
3. **Expected**: Loading state shows briefly
4. **Expected**: New headers appear

**Expected Results:**
- ✅ API call triggered on role change
- ✅ Previous selection cleared
- ✅ New headers loaded

### Test 2.3: Search/Filter Templates
**Steps:**
1. Select a role with multiple headers
2. Type in search box: "Core"
3. **Expected**: Only headers matching "Core" are shown
4. Clear search
5. Type a template name
6. **Expected**: Headers containing matching templates are shown

**Expected Results:**
- ✅ Search filters in real-time
- ✅ Searches across header title, description, and template titles
- ✅ Case-insensitive matching

### Test 2.4: Select Single Header
**Steps:**
1. Click checkbox on a header (e.g., "Core Competencies" with 3 templates totaling 60%)
2. **Expected**: Header background changes to primary color
3. **Expected**: Weightage adjustment input appears
4. **Expected**: Input pre-filled with default total (60%)
5. **Expected**: Total Selected Weightage shows 60%

**Expected Results:**
- ✅ Checkbox is checked
- ✅ Visual feedback (border, background color change)
- ✅ Weightage input appears
- ✅ Total at top updates

### Test 2.5: Expand Header to View Templates
**Steps:**
1. Select a header (checkbox checked)
2. Click chevron to expand
3. **Expected**: All templates in header are visible
4. **Expected**: Each template shows original weightage
5. **Expected**: No checkboxes on individual templates (not selectable)

**Expected Results:**
- ✅ Templates are read-only preview
- ✅ All template details visible: title, description, categories, importance, weightage
- ✅ Cannot select individual templates

### Test 2.6: Adjust Header Weightage (Proportional Distribution)
**Scenario:** Header has 3 templates: 20%, 25%, 15% (total 60%)

**Steps:**
1. Select the header
2. Expand to see templates
3. Change weightage input from 60% to 30%
4. **Expected**: Template weightages update in real-time:
   - Template 1: 20% → 10% (20/60 * 30)
   - Template 2: 25% → 12.5% → 13% (rounded) (25/60 * 30)
   - Template 3: 15% → 7.5% → 8% (rounded) (15/60 * 30)
5. **Expected**: Original weightage shown with strikethrough, new weightage displayed

**Expected Results:**
- ✅ Proportional calculation is correct
- ✅ Visual indication of changed weightages (strikethrough + new value)
- ✅ Ratios are preserved
- ✅ Rounding is applied (Math.round)

### Test 2.7: Select Multiple Headers
**Steps:**
1. Select Header 1 (30% total)
2. Select Header 2 (40% total)
3. **Expected**: Total Selected Weightage shows 70%
4. **Expected**: Both headers show as selected

**Expected Results:**
- ✅ Multiple selection works
- ✅ Total weightage sums correctly
- ✅ Each header maintains its own adjusted weightage

### Test 2.8: Weightage Validation - Exceeds Remaining
**Scenario:** Remaining weightage is 50%

**Steps:**
1. Select Header 1, set to 30%
2. Select Header 2, set to 40%
3. **Expected**: Total is 70%, which exceeds 50%
4. **Expected**: Total Selected Weightage shows 70% in red color
5. Click "Import Selected Headers"
6. **Expected**: Error toast: "Total weightage exceeds remaining"

**Expected Results:**
- ✅ Visual warning (red color) when exceeding
- ✅ Import button is NOT disabled
- ✅ Error toast on import attempt
- ✅ Modal remains open

### Test 2.9: Import Valid Selection
**Scenario:** Remaining weightage is 100%, Header has 3 templates

**Steps:**
1. Select a header (e.g., 60% total with 3 templates)
2. Keep default weightage or adjust to valid amount
3. Click "Import Selected Headers"
4. **Expected**: Success toast appears
5. **Expected**: Modal closes
6. **Expected**: Goals section shows 3 new goals

**Expected Results:**
- ✅ Import succeeds
- ✅ 3 goals added (one per template)
- ✅ Each goal has proportionally adjusted weightage
- ✅ Goals are in "staged" state (not saved to backend yet)
- ✅ Total weightage at bottom updates

**Verify Each Imported Goal:**
- ✅ Goal title matches template title
- ✅ Goal description matches template description
- ✅ Goal categories match template categories
- ✅ Goal importance matches template importance
- ✅ Goal weightage is proportionally adjusted
- ✅ Each goal shows as "unsaved" (pseudo goal)

### Test 2.10: Import Multiple Headers
**Steps:**
1. Select Header 1 (3 templates, 40% total)
2. Select Header 2 (2 templates, 30% total)
3. Click "Import Selected Headers"
4. **Expected**: Success toast shows "Imported 5 goals from 2 template headers"
5. **Expected**: All 5 goals appear in goals section

**Expected Results:**
- ✅ Batch import works
- ✅ Goals from different headers are imported together
- ✅ Weightages are correctly distributed
- ✅ Total count is accurate

### Test 2.11: Cancel/Close Modal
**Steps:**
1. Select some headers
2. Adjust weightages
3. Click "Cancel" or X icon
4. **Expected**: Modal closes
5. Reopen modal
6. **Expected**: Previous selections are cleared

**Expected Results:**
- ✅ Modal resets on close
- ✅ No goals are imported
- ✅ State is clean when reopened

---

## Test Suite 3: End-to-End Appraisal Creation Flow

### Test 3.1: Complete Appraisal with Header Import
**Steps:**
1. Create new appraisal
2. Select appraisee with role "Software Engineer"
3. Fill other details
4. Import from templates
5. Select 2 headers (total 80%)
6. Import successfully
7. Add 1 manual goal (20%)
8. **Expected**: Total weightage = 100%
9. Save appraisal as draft
10. **Expected**: Success toast
11. Navigate to appraisal list
12. **Expected**: Appraisal appears with correct goal count

**Expected Results:**
- ✅ Complete flow works seamlessly
- ✅ Imported goals are saved to backend
- ✅ Manual + imported goals coexist
- ✅ Weightage constraint (100%) is enforced

### Test 3.2: Edit Imported Goals
**Steps:**
1. After importing goals from headers
2. Click edit icon on an imported goal
3. Change title, description, or weightage
4. Save changes

**Expected Results:**
- ✅ Imported goals are editable
- ✅ Changes persist
- ✅ No reference to original template is broken

---

## Test Suite 4: Edge Cases & Error Handling

### Test 4.1: Empty State - No Headers for Role
**Steps:**
1. Create a new role with no headers
2. Open import modal
3. Select that role

**Expected Results:**
- ✅ Empty state message: "No template headers found for this role"
- ✅ No errors in console
- ✅ User can select different role

### Test 4.2: Header with No Templates
**Steps:**
1. Create a header without any templates
2. Try to select and import it

**Expected Results:**
- ✅ Header shows "0 templates"
- ✅ Selecting it works
- ✅ Importing shows warning: "Selected headers have no templates"
- ✅ Nothing is imported

### Test 4.3: Network Error Handling
**Steps:**
1. Stop backend server
2. Open import modal
3. Select a role

**Expected Results:**
- ✅ Error toast appears
- ✅ Graceful error message
- ✅ No application crash

### Test 4.4: Large Template Sets
**Steps:**
1. Create header with 15+ templates
2. Import the header

**Expected Results:**
- ✅ All templates import successfully
- ✅ UI remains responsive
- ✅ No performance degradation

---

## Test Suite 5: Backward Compatibility

### Test 5.1: Templates Without Headers
**Steps:**
1. Ensure some old templates exist without `header_id` (null)
2. Navigate to goal templates page
3. **Expected**: Templates without headers still appear
4. Create appraisal and check if old import method still works (if not removed)

**Expected Results:**
- ✅ Null `header_id` is supported
- ✅ Existing templates continue to work
- ✅ No data loss

---

## Test Suite 6: UI/UX Validation

### Test 6.1: Responsive Design
**Steps:**
1. Test on desktop (1920x1080)
2. Test on tablet (768px width)
3. Test on mobile (375px width)

**Expected Results:**
- ✅ Layout adapts to screen size
- ✅ Buttons remain accessible
- ✅ Text doesn't overflow
- ✅ Modals are scrollable

### Test 6.2: Accessibility
**Steps:**
1. Navigate using keyboard only (Tab, Enter, Escape)
2. Use screen reader (optional)

**Expected Results:**
- ✅ All interactive elements are focusable
- ✅ Modal can be closed with Escape key
- ✅ Proper ARIA labels

### Test 6.3: Visual Feedback
**Expected:**
- ✅ Loading states show spinners
- ✅ Selected items have visual distinction
- ✅ Hover states work
- ✅ Disabled states are clear
- ✅ Error states show in red

---

## Test Suite 7: Performance

### Test 7.1: Load Time
**Steps:**
1. Role has 20 headers with 100+ templates total
2. Open import modal

**Expected Results:**
- ✅ Loads in < 2 seconds
- ✅ No UI freeze

### Test 7.2: Search Performance
**Steps:**
1. Large dataset (50+ headers)
2. Type in search box

**Expected Results:**
- ✅ Instant filtering (debounced if needed)
- ✅ No lag

---

## Common Issues & Troubleshooting

### Issue 1: Headers Not Loading
**Symptoms:** Modal opens but shows empty state
**Checks:**
- Verify backend is running
- Check network tab for API errors
- Verify role has headers in database
- Check browser console for JavaScript errors

### Issue 2: Weightage Not Calculating
**Symptoms:** Total weightage shows 0 or incorrect value
**Checks:**
- Verify `total_default_weightage` is calculated in backend schema
- Check template weightages are not null/0
- Verify field_validator in Pydantic schema

### Issue 3: Import Does Nothing
**Symptoms:** Click import but no goals appear
**Checks:**
- Verify `onGoalsAdded` prop is passed correctly
- Check if goals are actually created (use debugger)
- Verify appraisal context is correct

### Issue 4: Modal Doesn't Open
**Symptoms:** Click button but modal stays closed
**Checks:**
- Verify modal state management
- Check if there are JS errors
- Verify `open` prop is controlled correctly

---

## Success Criteria Checklist

### Backend
- [ ] All API endpoints respond correctly
- [ ] Database relationships work (cascade delete)
- [ ] Validation errors are handled gracefully
- [ ] Logging is working

### Frontend - Management Page
- [ ] CRUD operations work for headers
- [ ] Role filtering works
- [ ] Delete confirmation prevents accidents
- [ ] UI is intuitive

### Frontend - Import Modal
- [ ] Role auto-selection works
- [ ] Header-level selection works (no individual template selection)
- [ ] Proportional weightage calculation is accurate
- [ ] Visual feedback shows adjusted weightages
- [ ] Multiple header selection works
- [ ] Validation prevents over-weightage
- [ ] Import creates correct goals

### Integration
- [ ] Complete appraisal creation works
- [ ] Imported goals can be edited
- [ ] Backward compatibility maintained
- [ ] No data loss or corruption

### UX
- [ ] Responsive on all devices
- [ ] Clear error messages
- [ ] Loading states are informative
- [ ] Animations are smooth
- [ ] Keyboard navigation works

---

## Automated Testing Recommendations

### Unit Tests (Frontend)
```typescript
// Test proportional weightage calculation
describe('Proportional Weightage', () => {
  it('should calculate proportional weightage correctly', () => {
    const original = [20, 25, 15]; // total 60
    const adjusted = 30;
    const expected = [10, 13, 8]; // rounded
    // Assert proportional calculation
  });
});
```

### Integration Tests (Backend)
```python
# Test header with templates cascade delete
async def test_delete_header_cascades_to_templates():
    # Create header
    # Create templates under header
    # Delete header
    # Assert templates are also deleted
```

---

## Sign-Off

After completing all test suites:
- [ ] All critical tests pass
- [ ] No blocking bugs
- [ ] Performance is acceptable
- [ ] User experience is smooth
- [ ] Documentation is updated

**Tested By:** _____________
**Date:** _____________
**Version:** _____________
**Status:** ✅ PASS / ❌ FAIL / ⚠️ WITH ISSUES

---

**Last Updated:** 2025-01-29
**Document Version:** 1.0
