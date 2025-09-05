# Backend Integration Test Cases - Appraisal Module

This document outlines the integration test cases for the appraisal endpoints, as defined in `tests/test_integration_appraisal.py`. These tests validate the full application flow, including API requests, business logic execution, and real database interactions against a test database.

## Test Suite: `TestAppraisalIntegration`

### 1. Happy Path Scenarios

These tests validate the core functionality and successful user flows.

#### **`test_create_appraisal_full_flow`**
-   **Objective**: Verify that a new appraisal can be created via the API and is correctly persisted in the database.
-   **Steps**:
    1.  Construct valid appraisal data (appraisee, appraiser, type, dates).
    2.  Send a `POST` request to `/api/appraisals/`.
    3.  Assert the API response status is `201 Created`.
    4.  Assert the response body contains the correct data and the status is "Draft".
    5.  Query the database to confirm the `Appraisal` record was created with the correct details.

#### **`test_get_appraisals_with_filters`**
-   **Objective**: Ensure that appraisals can be retrieved and filtered correctly.
-   **Steps**:
    1.  Create a test appraisal to ensure data exists.
    2.  Send a `GET` request to `/api/appraisals/` with a filter (e.g., `?appraisee_id=...`).
    3.  Assert the API response status is `200 OK`.
    4.  Assert the response body is a list containing the filtered appraisal(s).

#### **`test_login_and_get_employee_profile`**
-   **Objective**: Validate the authentication flow and subsequent access to a protected endpoint.
-   **Steps**:
    1.  Send a `POST` request to `/api/employees/login` with valid credentials.
    2.  Assert the API response status is `200 OK` and contains `access_token` and `refresh_token`.
    3.  Use the obtained access token to send a `GET` request to a protected employee endpoint (e.g., `/api/employees/by-email`).
    4.  Assert the API response status is `200 OK` and the correct employee profile is returned.

### 2. Edge Case & Error Handling Scenarios

These tests validate the system's robustness and ability to handle invalid inputs and states gracefully.

#### **`test_create_appraisal_with_nonexistent_appraisee_returns_400`**
-   **Objective**: Verify that creating an appraisal with a non-existent `appraisee_id` fails with a `400 Bad Request`.
-   **Asserts**: Status code is `400` and the error detail contains "Appraisee not found".

#### **`test_update_status_to_submitted_without_goals_returns_400`**
-   **Objective**: Ensure an appraisal cannot be "Submitted" if it has no goals or if the goal weightage does not total 100%.
-   **Steps**:
    1.  Create a new appraisal (which starts in "Draft" with no goals).
    2.  Attempt to `PUT` the status to "Submitted".
-   **Asserts**: Status code is `400` and the error detail mentions that goals must exist and total 100%.

#### **`test_read_appraisal_not_found_returns_404`**
-   **Objective**: Verify that requesting a non-existent appraisal by ID returns a `404 Not Found`.
-   **Asserts**: Status code is `404` and the error detail contains "Appraisal not found".

#### **`test_delete_appraisal_not_found_returns_404`**
-   **Objective**: Verify that attempting to delete a non-existent appraisal returns a `404 Not Found`.
-   **Asserts**: Status code is `404` and the error detail contains "Appraisal not found".

#### **`test_self_assessment_wrong_status_returns_400`**
-   **Objective**: Ensure that a self-assessment can only be updated when the appraisal is in the correct status (`APPRAISEE_SELF_ASSESSMENT`).
-   **Asserts**: Attempting to update while in "Draft" status returns a `400 Bad Request` with a relevant error message.

#### **`test_update_appraisal_with_invalid_type_returns_400`**
-   **Objective**: Verify that updating an appraisal with a non-existent `appraisal_type_id` fails with a `400 Bad Request`.
-   **Asserts**: Status code is `400` and the error detail contains "Appraisal type not found".
