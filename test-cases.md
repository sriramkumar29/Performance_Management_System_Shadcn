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
- should provide default light theme
- should restore theme from localStorage
- should toggle theme from light to dark
- should toggle theme from dark to light
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
- should submit appraiser evaluation

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
- should show create appraisal button for managers
- should display team appraisals when loaded
- should filter appraisals by status
- should show different actions based on appraisal status
- should handle create appraisal button click
- should not show create button for non-managers

## `ProtectedRoute.test.tsx`
- should render children for authenticated user
- should redirect to login for unauthenticated user
- should show loading state while checking auth status

## `rbac-stage.test.tsx`
- Appraisee should not see appraiser/reviewer comments until 'Complete' status
- Appraiser should be able to edit in 'Draft' but not after
- Reviewer should only have access during 'Reviewer Evaluation' stage
- Appraisee should be able to perform self-assessment only during 'Appraisee Self Assessment' stage
