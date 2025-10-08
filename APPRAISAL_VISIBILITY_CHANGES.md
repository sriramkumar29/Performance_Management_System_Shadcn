# Appraisal Visibility and Role-Based Actions - Implementation Summary

# Appraisal Visibility and Role-Based Actions - Implementation Summary

## Overview

Modified the appraisal system to ensure proper visibility and role-based actions for all employees involved in the appraisal process.

## Page-Specific Visibility Rules

### 📋 My Appraisal Page

**Shows ONLY appraisals where the logged-in user is the APPRAISEE (receiving the appraisal)**

- **Purpose**: Employee's personal appraisals
- **Visibility**: Own appraisals only (where they are being appraised)
- **Statuses shown**: All stages from Submitted through Complete
- **Actions available**: Acknowledge, Self-Assessment, View

### 👥 Team Appraisal Page

**Shows appraisals where the logged-in user is the APPRAISER or REVIEWER**

- **Purpose**: Manager's view of team appraisals they're conducting or reviewing
- **Visibility**:
  - **As Appraiser**: All non-draft, non-complete appraisals they're conducting
  - **As Reviewer**: All non-draft, non-complete appraisals assigned to them (can track from early stages)
- **Statuses shown**: Draft (appraiser only), Active (Submitted → Reviewer Evaluation), Complete
- **Actions available**: Edit Draft, Evaluate (appraiser), Review (reviewer), View

## Changes Made

### 1. **My Appraisal Page (MyAppraisal.tsx)**

#### Visibility Implementation

**Fetches ONLY appraisals where the user is the appraisee:**

```typescript
// Fetch only appraisals where user is the appraisee (their own appraisals)
const res = await apiFetch<Appraisal[]>(
  `/api/appraisals/?appraisee_id=${user.emp_id}`
);
```

#### Active Appraisals Filtering

Shows all non-draft, non-complete appraisals so employees can track progress:

```typescript
const myActives = appraisalsInPeriod.filter(
  (a) => a.status !== "Draft" && a.status !== "Complete"
);
```

### 2. **Role-Based Action Buttons**

#### Updated AppraisalActionButtons Component

Now accepts `currentUserId` parameter and shows actions based on role:

**For Appraisee (in My Appraisal):**

- **Status: "Submitted"** → Show "Take Self Assessment" button + "Acknowledge" button
- **Status: "Appraisee Self Assessment"** → Show "Continue Self Assessment" button
- **Status: "Appraiser Evaluation"** → Show "View" button (navigates to self-assessment page in read-only mode with `?readonly=true` parameter)
- **Status: "Reviewer Evaluation"** → Show "View" button (navigates to self-assessment page in read-only mode with `?readonly=true` parameter)
- **Status: "Complete"** → Show "View" button

**For Appraiser (in Team Appraisal):**

- **Status: "Draft"** → Show "Edit" button
- **Status: "Appraiser Evaluation"** → Show "Evaluate" button (only if user is the appraiser)
- **Status: "Complete"** → Show "View" button
- **Other statuses** → No button (not actionable)

**For Reviewer (in Team Appraisal):**

- **Status: "Reviewer Evaluation"** → Show "Review" button (only if user is the reviewer)
- **Status: "Complete"** → Show "View" button
- **Other statuses** → No button (not actionable)

### 3. **Acknowledge Button**

#### Updated Logic

- **Before**: Showed for all users when status is "Submitted"
- **After**: Only shows for the **appraisee** when status is "Submitted"

```typescript
{
  a.status === "Submitted" && a.appraisee_id === (user?.emp_id || 0) && (
    <Button onClick={() => handleAcknowledge(a.appraisal_id)}>
      Acknowledge
    </Button>
  );
}
```

### 4. **Progress Bar Corrections**

#### Fixed Status Mapping

Corrected the workflow step labels to match actual database statuses:

**My Appraisal & Team Appraisal Pages:**

```typescript
{
  label: "Self Assessment",
  status: "Appraisee Self Assessment", // Changed from "Self Assessment"
  progress: 40,
}
```

#### Progress Calculation

```typescript
const getStatusProgress = (status: string): number => {
  const statusMap = {
    Draft: 0,
    Submitted: 20,
    "Appraisee Self Assessment": 40, // Fixed
    "Appraiser Evaluation": 60,
    "Reviewer Evaluation": 80,
    Complete: 100,
  };
  return statusMap[status] || 0;
};
```

### 5. **Team Appraisal Page (TeamAppraisal.tsx)**

#### Updates Applied

- Fixed progress bar status mapping to use "Appraisee Self Assessment"
- Progress bar now correctly highlights current step
- All workflow stages display properly

## Progress Bar Visual States

The step-based progress indicator now clearly distinguishes between completed, current, and future stages:

### Visual States

**✅ Completed Steps** (past stages):

- Filled circle with **checkmark icon**
- Primary color background
- Bold text label
- Example: When status is "Appraiser Evaluation", the "Submitted" and "Self Assessment" steps show checkmarks

**🎯 Current Step** (active/in-progress):

- Filled circle with **step number**
- Primary color background with **ring highlight**
- Bold text label
- Example: When status is "Appraiser Evaluation", this step shows "3" with a ring

**⭕ Future Steps** (not yet reached):

- Circle with **step number**
- Gray background with border
- Muted text label
- Example: When status is "Appraiser Evaluation", "Reviewer Evaluation" and "Complete" appear gray

### Implementation Logic

```typescript
const isCompleted = currentProgress > step.progress; // Past steps
const isCurrent = a.status === step.status; // Current step

// Visual rendering:
{
  isCompleted ? (
    <CheckCircle /> // Show checkmark for completed steps
  ) : (
    <span>{idx + 1}</span> // Show number for current/future steps
  );
}
```

### Example Workflow Visualization

**When Self Assessment is submitted (status: "Appraiser Evaluation"):**

1. ✅ Submitted - Checkmark (completed)
2. ✅ Self Assessment - Checkmark (completed)
3. 🎯 Appraiser Evaluation - Number "3" with ring (current)
4. ⭕ Reviewer Evaluation - Number "4" in gray (future)
5. ⭕ Complete - Number "5" in gray (future)

This clearly shows the appraisee that they have completed their self-assessment!

1. **Draft** (0%)

   - Visible to: Appraiser (creator)
   - Action: Edit draft

2. **Submitted** (20%)

   - Visible to: Appraisee, Appraiser, Reviewer
   - Action: Appraisee can acknowledge

3. **Appraisee Self Assessment** (40%)

   - Visible to: Appraisee, Appraiser, Reviewer
   - Action: Appraisee can complete self-assessment

4. **Appraiser Evaluation** (60%)

   - Visible to: Appraisee, Appraiser, Reviewer
   - Action: Appraiser can evaluate

5. **Reviewer Evaluation** (80%)

   - Visible to: Appraisee, Appraiser, Reviewer
   - Action: Reviewer can review

6. **Complete** (100%)
   - Visible to: Appraisee, Appraiser, Reviewer
   - Action: All can view final appraisal

## Benefits

✅ **Proper Visibility**: All involved parties can see appraisals they're part of
✅ **Role-Based Actions**: Only appropriate actions shown based on user role and status
✅ **Accurate Progress**: Progress bar correctly reflects actual workflow stages
✅ **Clear Responsibilities**: Users know exactly what action they need to take
✅ **Data Consistency**: No duplicate appraisals displayed

## Testing Recommendations

1. **Test as Appraisee:**

   - Verify you can see appraisals assigned to you
   - Check acknowledge button appears only when status is "Submitted"
   - Verify self-assessment actions appear at correct stages

2. **Test as Appraiser:**

   - Verify you can see appraisals you're conducting
   - Check evaluate button appears at "Appraiser Evaluation" stage
   - Verify you can view but not act on appraisee's self-assessment stage

3. **Test as Reviewer:**

   - Verify you can see appraisals assigned for review
   - Check review button appears at "Reviewer Evaluation" stage
   - Verify you can view but not act on earlier stages

4. **Test Multiple Roles:**
   - Create scenarios where user has multiple roles in different appraisals
   - Verify no duplicate entries appear
   - Confirm correct actions shown for each appraisal

## Files Modified

1. `frontend/src/pages/my-appraisal/MyAppraisal.tsx`

   - Updated appraisal loading to fetch from all role endpoints
   - Modified AppraisalActionButtons to be role-aware
   - Fixed acknowledge button visibility
   - Corrected progress bar status mapping
   - Updated refresh logic after acknowledge

2. `frontend/src/pages/team-appraisal/TeamAppraisal.tsx`
   - Fixed progress bar status mapping
   - Corrected getStatusProgress function
   - **Fixed active appraisals filtering to include all stages** (Submitted → Reviewer Evaluation) for appraisers
   - **Fixed reviewer visibility** - Reviewers can now see appraisals from early stages to track progress

## Known Issues Fixed

### Issue 1: Appraisals disappearing from Team Appraisal during Reviewer Evaluation

**Problem:** When an appraisal reached "Reviewer Evaluation" status, it disappeared from the manager's (appraiser's) Team Appraisal view because the filtering only included specific statuses (Submitted, Self Assessment, Appraiser Evaluation).

**Solution:** Updated the filtering logic to include all non-draft, non-complete appraisals where the user is the appraiser:

```typescript
// Before: Only specific statuses
const appraiserActiveStatuses = new Set<string>([
  "Submitted",
  "Appraisee Self Assessment",
  "Appraiser Evaluation",
]);

// After: All active stages
const activeAsAppraiser = appraisalsInPeriod.filter(
  (a) =>
    a.appraiser_id === user?.emp_id &&
    a.status !== "Draft" &&
    a.status !== "Complete"
);
```

Now managers can see all appraisals they're conducting throughout the entire workflow, from Submitted through Reviewer Evaluation, until completion.

### Issue 2: Reviewers unable to see appraisals in early stages

**Problem:** Reviewers could only see appraisals when they reached "Reviewer Evaluation" status. They couldn't track appraisals assigned to them during earlier stages (Submitted, Self Assessment, Appraiser Evaluation), limiting their ability to prepare and monitor progress.

**Solution:** Updated the reviewer filtering logic to include all non-draft, non-complete appraisals assigned to them:

```typescript
// Before: Only Reviewer Evaluation status
const activeAsReviewer = appraisalsInPeriod.filter(
  (a) =>
    a.reviewer_id === user?.emp_id &&
    a.status === "Reviewer Evaluation" &&
    a.appraiser_id !== user?.emp_id
);

// After: All active stages
const activeAsReviewer = appraisalsInPeriod.filter(
  (a) =>
    a.reviewer_id === user?.emp_id &&
    a.status !== "Draft" &&
    a.status !== "Complete" &&
    a.appraiser_id !== user?.emp_id // Avoid duplicates
);
```

Now reviewers can see appraisals assigned to them throughout the entire workflow:

- ✅ Submitted - Can track that appraisal has started
- ✅ Appraisee Self Assessment - Can monitor self-assessment progress
- ✅ Appraiser Evaluation - Can see when appraiser is evaluating
- ✅ Reviewer Evaluation - Can perform their review (action button appears)
- ✅ Complete - Can view final results

This allows reviewers to:

- **Prepare in advance** by seeing upcoming reviews
- **Track progress** throughout the appraisal lifecycle
- **Plan their workload** by knowing what's in the pipeline

### Issue 3: Appraisals disappearing from My Appraisal during Appraiser/Reviewer Evaluation

**Problem:** When an appraisal reached "Appraiser Evaluation" or "Reviewer Evaluation" status, it disappeared from the appraisee's My Appraisal view because the filtering only included "Submitted" and "Appraisee Self Assessment" statuses.

**Solution:** Updated the filtering logic in My Appraisal to include all non-draft, non-complete appraisals:

```typescript
// Before: Only actionable statuses for appraisee
const myActives = appraisalsInPeriod.filter(
  (a) => a.status === "Submitted" || a.status === "Appraisee Self Assessment"
);

// After: All active stages
const myActives = appraisalsInPeriod.filter(
  (a) => a.status !== "Draft" && a.status !== "Complete"
);
```

Now appraisees can track their appraisals throughout the entire workflow:

- ✅ Submitted - Can acknowledge
- ✅ Appraisee Self Assessment - Can complete self-assessment
- ✅ Appraiser Evaluation - Can view progress (appraiser is evaluating)
- ✅ Reviewer Evaluation - Can view progress (reviewer is reviewing)
- ✅ Complete - Can view final results

### Issue 4: Reviewer seeing "Evaluate" button during Appraiser Evaluation

**Problem:** When an appraisal was in "Appraiser Evaluation" status, reviewers were seeing both "Evaluate" and "View" buttons. The "Evaluate" button didn't check if the user was actually the appraiser, so it appeared for everyone (including reviewers).

**Solution:** Added appraiser ID verification to the "Evaluate" button condition:

```typescript
// Before: Shows to everyone when status is "Appraiser Evaluation"
{
  a.status === "Appraiser Evaluation" && (
    <Button onClick={() => navigate(`/appraiser-evaluation/${a.appraisal_id}`)}>
      Evaluate
    </Button>
  );
}

// After: Only shows to the actual appraiser
{
  a.status === "Appraiser Evaluation" && a.appraiser_id === user?.emp_id && (
    <Button onClick={() => navigate(`/appraiser-evaluation/${a.appraisal_id}`)}>
      Evaluate
    </Button>
  );
}
```

**Result:**

- ✅ Appraiser sees "Evaluate" button during Appraiser Evaluation
- ✅ Reviewer sees only "View" button during Appraiser Evaluation
- ✅ Proper role-based access control enforced

### Issue 5: Unnecessary View buttons for Appraiser and Reviewer before Complete status

**Problem:** Appraisers and reviewers were able to see "View" buttons for appraisals at various stages before completion. This was unnecessary since:

- Appraisers have the "Evaluate" button when it's their turn to act
- Reviewers have the "Review" button when it's their turn to act
- Both roles don't need to view appraisals when they're not in an actionable state

Additionally, appraisees couldn't view their own self assessment during Appraiser Evaluation and Reviewer Evaluation stages.

**Solution:** Modified action button logic in both pages:

**In MyAppraisal.tsx (AppraisalActionButtons component):**

```typescript
// Added: Appraisee can view their self assessment during evaluation stages
if (
  isAppraisee &&
  (appraisal.status === "Appraiser Evaluation" ||
    appraisal.status === "Reviewer Evaluation")
) {
  return (
    <Button
      variant="outline"
      onClick={() =>
        navigate(`/self-assessment/${appraisal.appraisal_id}?readonly=true`)
      }
    >
      View
    </Button>
  );
}

// Only show View button for Complete status
if (appraisal.status === "Complete") {
  return <Button variant="outline">View</Button>;
}

// No view button for appraiser/reviewer before Complete status
return null;
```

**In TeamAppraisal.tsx:**

```typescript
// Removed the conditional "View" button for reviewers during non-actionable stages
// Only show View button when status is "Complete"
{
  a.status === "Complete" && (
    <Button
      variant="outline"
      onClick={() => navigate(`/appraisal/${a.appraisal_id}`)}
    >
      View
    </Button>
  );
}
```

**In SelfAssessment.tsx:**

```typescript
// Added read-only mode support via query parameter
const [searchParams] = useSearchParams();
const isReadOnly = searchParams.get("readonly") === "true";

// Updated load function to allow different statuses based on mode
const allowedStatuses = isReadOnly
  ? ["Appraiser Evaluation", "Reviewer Evaluation"]
  : ["Appraisee Self Assessment"];

// Disabled form inputs in read-only mode
<Slider disabled={isReadOnly} ... />
<Textarea disabled={isReadOnly} ... />

// Hide submit button in read-only mode
{!isReadOnly && <Button onClick={handleSubmit}>Submit Assessment</Button>}

// Visual indicators for read-only mode
<h1>Self Assessment {isReadOnly && "(Read-Only)"}</h1>
{isReadOnly && <Badge>View Only</Badge>}
```

**Result:**

- ✅ Appraisees can view their self assessment (read-only) during Appraiser Evaluation and Reviewer Evaluation
- ✅ The self-assessment page opens with all form fields disabled and submit button hidden
- ✅ Visual indicators show "Self Assessment (Read-Only)" title and "View Only" badge with eye icon
- ✅ Read-only mode preserves the familiar self-assessment layout while preventing edits
- ✅ Appraisers only see "Evaluate" button when it's their turn, and "View" button when Complete
- ✅ Reviewers only see "Review" button when it's their turn, and "View" button when Complete
- ✅ Cleaner UI with fewer unnecessary buttons
- ✅ Better focus on actionable items
