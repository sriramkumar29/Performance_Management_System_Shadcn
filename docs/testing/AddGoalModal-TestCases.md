# Test Cases for AddGoalModal Component

This document outlines the test cases for the `AddGoalModal` component in the Performance Management System.

## 1. Modal Rendering

### Test Case: `should render modal when open`
*   **Description**: Verifies that the modal dialog becomes visible when its `open` prop is set to `true`.
*   **Steps**:
    1.  Render the `AddGoalModal` component with `open={true}`.
    2.  Wait for asynchronous operations (like fetching categories) to complete.
*   **Expected Result**: The modal title "Add New Goal" should be present in the document.

### Test Case: `should not render when closed`
*   **Description**: Ensures the modal is not rendered in the DOM when the `open` prop is `false`.
*   **Steps**:
    1.  Render the `AddGoalModal` component with `open={false}`.
*   **Expected Result**: The component should render nothing (the container's first child should be null).

## 2. Form Fields and Initial State

### Test Case: `should render goal form fields`
*   **Description**: Checks if all the necessary form input fields are rendered correctly after the category data has been loaded.
*   **Steps**:
    1.  Render the component with `open={true}`.
    2.  Wait for the "Loading..." text to disappear.
*   **Expected Result**: The following fields should be in the document:
    *   Goal Title (input)
    *   Goal Description (textarea)
    *   Performance Factors (textarea)
    *   Importance Level (select/combobox)
    *   Category (select/combobox)
    *   Weightage (input)

### Test Case: `should disable submit when no remaining weightage`
*   **Description**: Verifies that the 'Add Goal' button is disabled if the `remainingWeightage` is zero, preventing users from adding goals that would violate the 100% total weightage rule.
*   **Steps**:
    1.  Render the component with `remainingWeightage={0}`.
    2.  Wait for the component to stabilize.
*   **Expected Result**: A message "No weightage remaining" should be visible, and the "Add Goal" button should have the `disabled` attribute.

## 3. Form Submission and Validation

### Test Case: `should handle form submission (staged pseudo goal) and show success toast`
*   **Description**: Simulates a user filling out the form with valid data and submitting it successfully.
*   **Steps**:
    1.  Render the component.
    2.  Fill in all required fields: Title, Description, Performance Factors, Importance, Category, and a valid Weightage.
    3.  Click the "Add Goal" button.
*   **Expected Result**:
    *   The `onGoalAdded` callback function is called.
    *   The `onClose` callback function is called.
    *   A success toast notification with the message "Goal added to appraisal" is displayed.

### Test Case: `should validate required fields and show error toast`
*   **Description**: Ensures that submitting the form with empty required fields triggers a validation error.
*   **Steps**:
    1.  Render the component.
    2.  Click the "Add Goal" button without filling in any fields.
*   **Expected Result**:
    *   An error toast with the message "Please complete all fields before submitting" is displayed.
    *   The `onGoalAdded` callback is **not** called.

### Test Case: `should error when weightage exceeds remaining weightage`
*   **Description**: Tests the validation logic that prevents a user from entering a weightage greater than the available `remainingWeightage`.
*   **Steps**:
    1.  Render the component with a specific `remainingWeightage` (e.g., 10%).
    2.  Fill in all other required fields.
    3.  Enter a weightage value that is higher than the remaining amount (e.g., 45).
    4.  Click the "Add Goal" button.
*   **Expected Result**:
    *   A validation message like "Value must be less than or equal to 10" appears.
    *   The `onGoalAdded` callback is **not** called.

### Test Case: `should allow valid weightage within remaining and succeed`
*   **Description**: Confirms that a user can submit a goal when the entered weightage is valid and within the allowed remaining limit.
*   **Steps**:
    1.  Render the component with a sufficient `remainingWeightage` (e.g., 60%).
    2.  Fill in all required fields.
    3.  Enter a valid weightage (e.g., 50).
    4.  Click the "Add Goal" button.
*   **Expected Result**:
    *   The `onGoalAdded` and `onClose` callbacks are called.
    *   A success toast is displayed.

## 4. Modal Actions

### Test Case: `should close modal when cancel is clicked`
*   **Description**: Verifies that clicking the 'Cancel' button triggers the `onClose` callback.
*   **Steps**:
    1.  Render the component.
    2.  Click the "Cancel" button.
*   **Expected Result**: The `onClose` callback function is called.
