# Appraisal Acknowledgement Feature Implementation

## Overview

Added an acknowledgement step where the appraisee must review and acknowledge the performance goals before proceeding to self-assessment.

## Changes Made

### 1. New Component: `AcknowledgeAppraisalModal.tsx`

**Location:** `frontend/src/features/appraisal/AcknowledgeAppraisalModal.tsx`

**Purpose:** Displays a modal dialog showing all appraisal details and goals for the appraisee to review before acknowledging.

**Key Features:**

- **Appraisal Details Display:**

  - Employee name
  - Appraiser name
  - Reviewer name
  - Appraisal type
  - Range (if applicable)
  - Period (start and end dates)

- **Goals Display:**

  - Complete list of all performance goals
  - Goal title, description, and weightage
  - Category, performance factor, and importance
  - Total weightage calculation
  - Visual card layout for easy reading

- **Acknowledgement Notice:**

  - Clear explanation of what acknowledgement means
  - Information about next steps (self-assessment)

- **Actions:**
  - **Cancel:** Close modal without acknowledging
  - **Acknowledge & Proceed:** Confirms review and transitions status to "Appraisee Self Assessment"

**Modal Structure:**

- Fixed header with title and description
- Scrollable content area for appraisal details and goals
- Fixed footer with action buttons
- Loading state while fetching data
- Error handling with toast notifications

### 2. Updated: `MyAppraisal.tsx`

**Location:** `frontend/src/pages/my-appraisal/MyAppraisal.tsx`

**Changes:**

#### a. Import Addition

```typescript
import AcknowledgeAppraisalModal from "../../features/appraisal/AcknowledgeAppraisalModal";
```

#### b. New State Variables

```typescript
const [acknowledgeModalOpen, setAcknowledgeModalOpen] = useState(false);
const [acknowledgeAppraisalId, setAcknowledgeAppraisalId] = useState<number>(0);
```

#### c. Updated `useSelfAssessmentHandler` Function

**Before:** Directly updated status from "Submitted" to "Appraisee Self Assessment" via API call.

**After:** Opens acknowledgement modal when status is "Submitted", allowing appraisee to review goals first.

```typescript
const useSelfAssessmentHandler = (
  setActionError: (error: string | null) => void,
  navigate: (path: string) => void,
  setAcknowledgeModalOpen: (open: boolean) => void,
  setAcknowledgeAppraisalId: (id: number) => void
) => {
  return async (a: Appraisal) => {
    try {
      // If status is Submitted, show acknowledgement modal first
      if (a.status === "Submitted") {
        setAcknowledgeAppraisalId(a.appraisal_id);
        setAcknowledgeModalOpen(true);
        return;
      }
      // If already in Appraisee Self Assessment, navigate directly
      setActionError(null);
      navigate(`/self-assessment/${a.appraisal_id}`);
    } catch (e: any) {
      console.error("Failed to start self assessment:", e);
      setActionError("Unable to start self assessment");
    }
  };
};
```

#### d. New `handleAcknowledgeSuccess` Function

Handles post-acknowledgement actions:

- Reloads appraisals to get updated status
- Navigates to self-assessment page

```typescript
const handleAcknowledgeSuccess = () => {
  // Reload appraisals after acknowledgement
  if (!user?.emp_id) return;
  const loadAppraisals = async () => {
    const res = await apiFetch<Appraisal[]>(
      `/api/appraisals/?appraisee_id=${encodeURIComponent(user.emp_id)}`
    );
    if (res.ok && res.data) {
      setAppraisals(res.data);
    }
  };
  loadAppraisals();
  // Navigate to self-assessment page
  navigate(`/self-assessment/${acknowledgeAppraisalId}`);
};
```

#### e. Modal Integration in Return Statement

```typescript
return (
  <>
    <AcknowledgeAppraisalModal
      open={acknowledgeModalOpen}
      onClose={() => setAcknowledgeModalOpen(false)}
      appraisalId={acknowledgeAppraisalId}
      onAcknowledge={handleAcknowledgeSuccess}
    />
    <div className="space-y-6 text-foreground">
      {/* Rest of the component */}
    </div>
  </>
);
```

#### f. Button Text Update

Changed button text for "Submitted" status from "Take Self Assessment" to "Acknowledge & Start" to better reflect the new flow.

```typescript
const buttonText =
  appraisal.status === "Submitted"
    ? "Acknowledge & Start"
    : "Continue Self Assessment";
```

## User Flow

### Previous Flow:

1. Manager creates appraisal → Status: "Draft"
2. Manager submits → Status: "Submitted"
3. Appraisee clicks "Take Self Assessment"
4. Status immediately changes to "Appraisee Self Assessment"
5. Self-assessment page opens

### New Flow:

1. Manager creates appraisal → Status: "Draft"
2. Manager submits → Status: "Submitted"
3. Appraisee clicks "Acknowledge & Start"
4. **Acknowledgement modal opens** showing:
   - Appraisal details (appraiser, reviewer, type, period)
   - All performance goals with details
   - Acknowledgement notice
5. Appraisee reviews goals and clicks "Acknowledge & Proceed to Self-Assessment"
6. Status changes to "Appraisee Self Assessment"
7. Self-assessment page opens

## Benefits

1. **Transparency:** Appraisees can clearly see all goals before starting self-assessment
2. **Formal Acknowledgement:** Creates a clear checkpoint where appraisee confirms awareness of goals
3. **Better UX:** Goals are presented in an organized, easy-to-read format
4. **Audit Trail:** The status transition provides a record of when goals were acknowledged
5. **Prevents Surprises:** Appraisees can review expectations before starting evaluation

## Technical Details

### API Endpoints Used:

- `GET /api/appraisals/{id}` - Fetch appraisal details with goals
- `PUT /api/appraisals/{id}/status` - Update appraisal status to "Appraisee Self Assessment"

### Modal Features:

- **Responsive Design:** Works on desktop and mobile devices
- **Scrollable Content:** Handles long lists of goals gracefully
- **Fixed Header & Footer:** Action buttons always visible
- **Loading States:** Shows spinner while fetching data
- **Error Handling:** Toast notifications for API errors
- **Disabled State:** Acknowledge button disabled if no goals exist

### Styling:

- Uses shadcn/ui components for consistency
- Gradient text for title
- Card-based layout for goals
- Badge indicators for weightage and status
- Border-left accent color for goal cards
- Primary color highlights for important information

## Testing Recommendations

1. **Happy Path:**

   - Create appraisal with goals
   - Submit for acknowledgement
   - Appraisee clicks "Acknowledge & Start"
   - Verify modal shows correct data
   - Click "Acknowledge & Proceed"
   - Verify status changes and navigation works

2. **Edge Cases:**

   - Test with 0 goals (button should be disabled)
   - Test with many goals (scrolling behavior)
   - Test modal close without acknowledging
   - Test network errors during acknowledgement
   - Test with missing optional fields (range)

3. **UI/UX:**
   - Verify responsive layout on mobile
   - Test modal scrolling with many goals
   - Verify all data displays correctly
   - Check button states (loading, disabled)
   - Test toast notifications

## Future Enhancements

1. **Acknowledgement Timestamp:** Store when appraisee acknowledged
2. **Acknowledgement History:** Track who acknowledged and when
3. **Digital Signature:** Add signature field for formal acknowledgement
4. **Email Notification:** Notify manager when appraisee acknowledges
5. **Print/Export:** Allow appraisee to download goals as PDF
6. **Comments:** Allow appraisee to add comments during acknowledgement
7. **Reminder System:** Send reminders if not acknowledged within timeframe

## Conclusion

The acknowledgement feature adds a critical step in the appraisal process, ensuring appraisees are fully aware of their performance goals before beginning self-assessment. This creates a more transparent and formal process that benefits both employees and managers.
