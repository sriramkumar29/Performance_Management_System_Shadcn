# Test Case Details

## `PeriodFilter.test.tsx`
- should render period filter dropdown
- should show all period options when opened
- should call onPeriodChange when option is selected
- should display selected period correctly
- should handle custom date range selection

## `ThemeToggle.test.tsx`
- should render theme toggle button
- should show sun icon for light theme
- should show moon icon for dark theme
- should call toggleTheme when clicked
- should have proper accessibility attributes

## `Navbar.test.tsx`
- should render first name when authenticated
- should render theme toggle and user info for authenticated user
- should display the user's role from auth
- should handle logout when 'Sign out' is clicked
- should show default placeholders when user is not authenticated

## `AuthContext.test.tsx`
- should provide initial unauthenticated state
- should restore user from sessionStorage on mount
- should handle successful login
- should handle logout
- should handle unauthorized events

## `ThemeContext.test.tsx`
- should default to light theme (documentElement does not have `dark` class)
- should restore theme from localStorage
- should toggle theme between light and dark and update documentElement `dark` class
- should apply theme class to document element

## `CreateAppraisalButton.test.tsx`
- should render create appraisal button for managers
- should not render create appraisal button for non-managers
- should navigate to create appraisal page on click
- should have correct styling

## `AddGoalModal.test.tsx`
- should render all form fields
- should show validation errors for empty required fields
- should submit form with valid data
- should call onClose when cancel is clicked
- should show success toast on successful submission
- should error when weightage exceeds remaining and show toast; must not call onGoalAdded

## `CreateAppraisal.int.test.tsx`
- should render all form fields and sections
- should load initial data (appraisal types, employees)
- should calculate period start/end dates based on type and range
- should allow adding goals from templates
- should allow adding custom goals
- should enforce 100% total weightage validation
- should save draft appraisal
- should submit appraisal
- should handle API errors gracefully
- should restrict access for non-managers

## `AppraiserEvaluation.test.tsx`
- should render page title
- should display goals and self assessments
- should allow entering appraiser comments and ratings
- should submit appraiser evaluation from the Overall Evaluation tab

## `Login.test.tsx`
- should render login form
- should redirect if already authenticated
- should show validation errors for invalid inputs
- should handle successful login
- should handle failed login
- should support keyboard navigation

## `GoalTemplates.test.tsx`
- should render page title
- should show create template button
- should display goal templates when loaded
- should handle template deletion
- should handle template editing
- should filter templates by category
- should show empty state when no templates

## `MyAppraisal.test.tsx`
- should render page title
- should hide list content while loading
- should display appraisals when loaded
- should display empty state when no appraisals
- should handle API error gracefully
- should show different actions based on appraisal status
- should filter appraisals by period

## `ReviewerEvaluation.test.tsx`
- should render page title
- should display appraiser evaluation summary
- should allow entering reviewer overall comments
- should submit reviewer evaluation

## `SelfAssessment.test.tsx`
- should render page title
- should display goals for self assessment
- should allow entering self assessment comments
- should submit self assessment

## `TeamAppraisal.test.tsx`
- should render page title
- should display team appraisals when loaded
- should filter between Active and Completed lists
- should show Evaluate action during Appraiser Evaluation
- should resolve employee names and appraisal type labels via API data

## `ProtectedRoute.test.tsx`
- should render children for authenticated user
- should redirect to login for unauthenticated user
- should show loading state while checking auth status

## `rbac-stage.test.tsx`
- Appraisee should not see appraiser/reviewer comments until 'Complete' status
- Appraiser should be able to edit in 'Draft' but not after
- Reviewer should only have access during 'Reviewer Evaluation' stage
- Appraisee should be able to perform self-assessment only during 'Appraisee Self Assessment' stage

## `utils/api.test.ts`
- should construct URLs correctly (absolute and normalized /api paths)
- should attach Authorization header when token exists
- should respect Content-Type for JSON/FormData
- should parse JSON and handle 204 No Content
- should attempt token refresh on 401, update tokens, and retry
- should emit unauthorized when refresh fails; should not refresh login endpoints
- should retry on 5xx and network/AbortError with exponential backoff (fake timers)
- should not retry on 4xx
- should return timeout error when request aborts repeatedly

## `src/test/App.integration.test.tsx`
- should perform real login against backend and store tokens
- should load dashboard for authenticated user and show role-based UI

## `e2e/integration-auth.spec.ts` (Playwright)
- should perform real login via UI and navigate to dashboard
- should verify sessionStorage tokens exist after login

---

# Testing Files Overview

| File Path | Type | Framework | Purpose |
| --- | --- | --- | --- |
| `frontend/vitest.config.ts` | Config | Vitest | Unit tests config with MSW mocking and jsdom |
| `frontend/vitest.integration.config.ts` | Config | Vitest | Integration tests config against live backend |
| `frontend/playwright.config.ts` | Config | Playwright | E2E configuration and global setup |
| `backend/pytest.ini` | Config | pytest | Pytest markers and defaults for backend |
| `frontend/src/test/setup.ts` | Setup | Vitest + MSW | Global MSW server, DOM/storage mocks |
| `frontend/src/test/integration-setup.ts` | Setup | Vitest | Backend health check; disables MSW |
| `frontend/src/test/test-utils.tsx` | Utility | RTL | Custom render with providers (Auth/Theme/Router) |
| `frontend/src/test/App.integration.test.tsx` | Integration | Vitest | Real login + dashboard load via backend |
| `frontend/e2e/integration-auth.spec.ts` | E2E | Playwright | Full UI login flow asserts tokens and dashboard |
| `frontend/src/utils/api.test.ts` | Unit | Vitest | API client URL/auth/retry/timeout/401-refresh tests |
| `frontend/src/contexts/AuthContext.test.tsx` | Unit | Vitest | Auth context state and unauthorized handling |
| `frontend/src/contexts/ThemeContext.test.tsx` | Unit | Vitest | Theme toggling; `dark` class management |
| `frontend/src/routes/ProtectedRoute.test.tsx` | Unit | Vitest | Auth guard with loading/redirect |
| `frontend/src/components/ThemeToggle.test.tsx` | Unit | Vitest | Theme toggle button/accessibility |
| `frontend/src/components/PeriodFilter.test.tsx` | Unit | Vitest | Period filter behavior and custom range |
| `frontend/src/components/navbar/Navbar.test.tsx` | Unit | Vitest | Navbar auth UI and logout flow |
| `frontend/src/features/goals/AddGoalModal.test.tsx` | Unit | Vitest | Goal form validations and weightage error toast |
| `frontend/src/features/appraisal/CreateAppraisalButton.test.tsx` | Unit | Vitest | Role-gated create button and navigation |
| `frontend/src/pages/appraiser-evaluation/AppraiserEvaluation.test.tsx` | Unit | Vitest | Appraiser flow; submit from Overall tab |
| `frontend/src/pages/reviewer-evaluation/ReviewerEvaluation.test.tsx` | Unit | Vitest | Reviewer overall comments/rating submit |
| `frontend/src/pages/self-assessment/SelfAssessment.test.tsx` | Unit | Vitest | Appraisee self assessment inputs submit |
| `frontend/src/pages/my-appraisal/MyAppraisal.test.tsx` | Unit | Vitest | Listing, empty/error states, filters |
| `frontend/src/pages/team-appraisal/TeamAppraisal.test.tsx` | Unit | Vitest | Active/Completed filters; Evaluate action |
| `frontend/src/pages/goal-templates/GoalTemplates.test.tsx` | Unit | Vitest | Templates CRUD and filters |
| `frontend/src/pages/appraisal-create/CreateAppraisal.int.test.tsx` | Integration | Vitest | Create appraisal flow validations |
| `frontend/src/test/rbac-stage.test.tsx` | Integration | Vitest | Role + stage-based access matrix checks |
| `backend/tests/conftest.py` | Setup | pytest | Async DB session, test client, auth helpers |
| `backend/tests/test_integration_appraisal.py` | Integration | pytest | API → DB flow for appraisal CRUD |
| `backend/tests/test_simple_integration.py` | Integration | pytest | DB connection and basic model ops |
| `backend/test_appraisals.py` | Unit | pytest | Appraisal endpoint unit tests |
| `backend/test_employees.py` | Unit | pytest | Employee endpoint unit tests |
| `backend/test_auth.py` | Unit | pytest | Authentication and JWT tests |
| `backend/test_goals.py` | Unit | pytest | Goal and template endpoints |
| `backend/test_appraisal_types.py` | Unit | pytest | Appraisal type/range endpoints |
| `backend/test_models.py` | Unit | pytest | SQLAlchemy model validations |
| `backend/test_date_calculator.py` | Unit | pytest | Date calculation utilities |
