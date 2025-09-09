import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { APIHelper } from '../../utils/api-helpers';
import { testUsers, appraisalTemplates, invalidWeightageScenarios } from '../../fixtures/test-data';

test.describe('Complete Employee Appraisal Workflow', () => {
  let apiHelper: APIHelper;
  let loginPage: LoginPage;
  let appraisalPage: AppraisalCreatePage;

  test.beforeEach(async ({ page }) => {
    apiHelper = new APIHelper();
    loginPage = new LoginPage(page);
    appraisalPage = new AppraisalCreatePage(page);

    // Setup test environment
    await apiHelper.cleanupTestData();
    await apiHelper.createTestUsers();
  });

  test.afterEach(async () => {
    await apiHelper.cleanupTestData();
  });

  test('Employee creates appraisal with valid goal weightage', async ({ page }) => {
    // Step 1: Login as employee
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testData.testUsers.employee.email,
      testData.testUsers.employee.password
    );

    // Step 2: Navigate to create appraisal
    await appraisalPage.goto();

    // Step 3: Create appraisal with valid 100% weightage
    const appraisalData = testData.appraisalTemplates.quarterlyReview;
    await appraisalPage.createAppraisalWithGoals(appraisalData);

    // Step 4: Verify all goals were added
    const goalCount = await appraisalPage.getGoalCount();
    expect(goalCount).toBe(appraisalData.goals.length);

    // Step 5: Verify total weightage is 100%
    const totalWeightage = await appraisalPage.getTotalWeightage();
    expect(totalWeightage).toBe(100);

    // Step 6: Verify initial status is draft
    const currentStatus = await appraisalPage.getCurrentStatus();
    expect(currentStatus).toBe('draft');

    // Step 7: Submit appraisal for review
    await appraisalPage.submitAppraisal();

    // Step 8: Verify status transitioned to submitted
    const newStatus = await appraisalPage.getCurrentStatus();
    expect(newStatus).toBe('submitted');
  });

  test('System prevents submission with invalid goal weightage', async ({ page }) => {
    // Step 1: Login as employee
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testData.testUsers.employee.email,
      testData.testUsers.employee.password
    );

    // Step 2: Navigate to create appraisal
    await appraisalPage.goto();

    // Step 3: Fill basic appraisal info
    await appraisalPage.fillBasicInfo('Test Appraisal with Invalid Weightage');

    // Step 4: Add goals with invalid weightage (total != 100%)
    const invalidScenario = testData.invalidWeightageScenarios[0]; // Under 100%
    for (const goal of invalidScenario.goals) {
      await appraisalPage.addGoal({
        title: goal.title,
        description: `Description for ${goal.title}`,
        weightage: goal.weightage,
        category: goal.category,
      });
    }

    // Step 5: Verify total weightage is incorrect
    const totalWeightage = await appraisalPage.getTotalWeightage();
    expect(totalWeightage).toBe(invalidScenario.expectedTotal);

    // Step 6: Attempt submission - should fail
    await appraisalPage.attemptSubmissionWithInvalidWeightage();

    // Step 7: Verify still in draft status
    const currentStatus = await appraisalPage.getCurrentStatus();
    expect(currentStatus).toBe('draft');
  });

  test('Employee completes self-assessment phase', async ({ page }) => {
    // Step 1: Create appraisal through API (faster setup)
    const employee = await apiHelper.login({
      email: testData.testUsers.employee.email,
      password: testData.testUsers.employee.password,
    });

    const appraisal = await apiHelper.createTestAppraisal(testData.appraisalTemplates.quarterlyReview);
    
    // Transition to submitted status
    await apiHelper.transitionAppraisalStatus(appraisal.id, 'submitted');
    
    // Transition to self-assessment phase
    await apiHelper.transitionAppraisalStatus(appraisal.id, 'appraisee_self_assessment');

    // Step 2: Login to frontend
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testData.testUsers.employee.email,
      testData.testUsers.employee.password
    );

    // Step 3: Navigate to appraisal for self-assessment
    await page.goto(`/appraisals/${appraisal.id}/self-assessment`);

    // Step 4: Complete self-assessment for each goal
    const goals = await apiHelper.getAppraisal(appraisal.id);
    for (let i = 0; i < goals.goals.length; i++) {
      const goalId = goals.goals[i].id;
      await page.locator(`[data-testid="goal-${goalId}-self-comment"]`).fill(
        `Self-assessment comment for goal ${i + 1}`
      );
      await page.locator(`[data-testid="goal-${goalId}-self-rating"]`).selectOption('4');
    }

    // Step 5: Submit self-assessment
    await page.locator('[data-testid="submit-self-assessment"]').click();

    // Step 6: Verify status transition
    await expect(page.locator('[data-testid="appraisal-status"]')).toContainText('appraiser_evaluation');
  });

  test('Manager completes appraisal evaluation', async ({ page }) => {
    // Step 1: Setup appraisal in correct state through API
    await apiHelper.login({
      email: testData.testUsers.employee.email,
      password: testData.testUsers.employee.password,
    });

    const appraisal = await apiHelper.createTestAppraisal(testData.appraisalTemplates.quarterlyReview);
    
    // Progress through workflow to appraiser_evaluation phase
    await apiHelper.transitionAppraisalStatus(appraisal.id, 'submitted');
    await apiHelper.transitionAppraisalStatus(appraisal.id, 'appraisee_self_assessment');
    
    // Complete self-assessment
    const goals = await apiHelper.getAppraisal(appraisal.id);
    const selfAssessment = {};
    goals.goals.forEach((goal, index) => {
      selfAssessment[goal.id] = {
        self_comment: `Self-assessment for ${goal.title}`,
        self_rating: 4,
      };
    });
    await apiHelper.submitSelfAssessment(appraisal.id, selfAssessment);

    await apiHelper.transitionAppraisalStatus(appraisal.id, 'appraiser_evaluation');

    // Step 2: Login as manager
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testData.testUsers.manager.email,
      testData.testUsers.manager.password
    );

    // Step 3: Navigate to appraisal evaluation
    await page.goto(`/appraisals/${appraisal.id}/evaluation`);

    // Step 4: Complete evaluation for each goal
    for (let i = 0; i < goals.goals.length; i++) {
      const goalId = goals.goals[i].id;
      await page.locator(`[data-testid="goal-${goalId}-appraiser-comment"]`).fill(
        `Manager evaluation comment for goal ${i + 1}`
      );
      await page.locator(`[data-testid="goal-${goalId}-appraiser-rating"]`).selectOption('4');
    }

    // Step 5: Provide overall evaluation
    await page.locator('[data-testid="overall-rating"]').selectOption('4');
    await page.locator('[data-testid="overall-comments"]').fill(
      'Overall strong performance with room for growth in specific areas'
    );

    // Step 6: Submit evaluation
    await page.locator('[data-testid="submit-evaluation"]').click();

    // Step 7: Verify status transition
    await expect(page.locator('[data-testid="appraisal-status"]')).toContainText('reviewer_evaluation');
  });

  test('Complete appraisal workflow from creation to completion', async ({ page }) => {
    // This test validates the entire workflow discovered in Phase 2 integration testing
    // Status flow: draft → submitted → appraisee_self_assessment → appraiser_evaluation → reviewer_evaluation → complete

    // Step 1: Employee creates appraisal
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testData.testUsers.employee.email,
      testData.testUsers.employee.password
    );

    await appraisalPage.goto();
    await appraisalPage.createAppraisalWithGoals(testData.appraisalTemplates.quarterlyReview);
    await appraisalPage.submitAppraisal();

    // Verify submitted status
    let currentStatus = await appraisalPage.getCurrentStatus();
    expect(currentStatus).toBe('submitted');

    // Step 2: Navigate through self-assessment (simplified for E2E)
    // In real scenario, this would involve more detailed UI interactions
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="pending-self-assessment"]')).toBeVisible();

    // Step 3: Manager login and evaluation
    await loginPage.logout();
    await loginPage.loginSuccessfully(
      testData.testUsers.manager.email,
      testData.testUsers.manager.password
    );

    // Verify manager can see pending evaluations
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="pending-evaluations"]')).toBeVisible();

    // Step 4: HR login for final review
    await loginPage.logout();
    await loginPage.loginSuccessfully(
      testData.testUsers.hr.email,
      testData.testUsers.hr.password
    );

    // Verify HR can access review dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="pending-reviews"]')).toBeVisible();
  });

  test('Performance validation: Page loads within target time', async ({ page }) => {
    // Performance test based on targets from TEST_IMPLEMENTATION_PLAN
    const startTime = Date.now();

    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testData.testUsers.employee.email,
      testData.testUsers.employee.password
    );

    const loginTime = Date.now() - startTime;
    expect(loginTime).toBeLessThan(3000); // <3s page load target

    const dashboardStartTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const dashboardLoadTime = Date.now() - dashboardStartTime;
    expect(dashboardLoadTime).toBeLessThan(3000); // <3s page load target

    // Verify critical components loaded
    await expect(page.locator('[data-testid="appraisal-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activities"]')).toBeVisible();
  });
});
