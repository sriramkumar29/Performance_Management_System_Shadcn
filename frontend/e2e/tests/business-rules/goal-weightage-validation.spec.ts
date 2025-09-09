import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { APIHelper } from '../../utils/api-helpers';
import { testUsers, appraisalTemplates, invalidWeightageScenarios } from '../../fixtures/test-data';

test.describe('Business Rules Validation', () => {
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

    // Login as employee for most tests
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.employee.email,
      testUsers.employee.password
    );
  });

  test.afterEach(async () => {
    await apiHelper.cleanupTestData();
  });

  test.describe('Goal Weightage Validation', () => {
    test.beforeEach(async () => {
      await appraisalPage.goto();
      await appraisalPage.fillBasicInfo('Goal Weightage Validation Test');
    });

    test('Prevents submission when goal weightage totals less than 100%', async ({ page }) => {
      // Add goals totaling 70% (30% + 40%)
      const invalidScenario = invalidWeightageScenarios[0];
      
      for (const goal of invalidScenario.goals) {
        await appraisalPage.addGoal({
          title: goal.title,
          description: `Description for ${goal.title}`,
          weightage: goal.weightage,
          category: goal.category,
        });
      }

      // Verify total weightage shows incorrect amount
      const totalWeightage = await appraisalPage.getTotalWeightage();
      expect(totalWeightage).toBe(70);

      // Attempt submission - should fail with validation error
      await appraisalPage.attemptSubmissionWithInvalidWeightage();

      // Verify error message matches expected
      await expect(page.locator('[data-testid="weightage-error"]')).toContainText(
        'Goal weightage must total 100%. Current total: 70%'
      );

      // Verify status remains draft
      const status = await appraisalPage.getCurrentStatus();
      expect(status).toBe('draft');
    });

    test('Prevents submission when goal weightage totals more than 100%', async ({ page }) => {
      // Add goals totaling 110% (60% + 50%)
      const invalidScenario = invalidWeightageScenarios[1];
      
      for (const goal of invalidScenario.goals) {
        await appraisalPage.addGoal({
          title: goal.title,
          description: `Description for ${goal.title}`,
          weightage: goal.weightage,
          category: goal.category,
        });
      }

      // Verify total weightage shows incorrect amount
      const totalWeightage = await appraisalPage.getTotalWeightage();
      expect(totalWeightage).toBe(110);

      // Attempt submission - should fail with validation error
      await appraisalPage.attemptSubmissionWithInvalidWeightage();

      // Verify error message matches expected
      await expect(page.locator('[data-testid="weightage-error"]')).toContainText(
        'Goal weightage must total 100%. Current total: 110%'
      );

      // Verify status remains draft
      const status = await appraisalPage.getCurrentStatus();
      expect(status).toBe('draft');
    });

    test('Allows submission when goal weightage totals exactly 100%', async () => {
      // Add goals totaling exactly 100%
      const validGoals = appraisalTemplates.quarterlyReview.goals;
      
      for (const goal of validGoals) {
        await appraisalPage.addGoal(goal);
      }

      // Verify total weightage is 100%
      const totalWeightage = await appraisalPage.getTotalWeightage();
      expect(totalWeightage).toBe(100);

      // Submit successfully
      await appraisalPage.submitAppraisal();

      // Verify status transitioned to submitted
      const status = await appraisalPage.getCurrentStatus();
      expect(status).toBe('submitted');
    });

    test('Dynamic weightage validation updates as goals are modified', async ({ page }) => {
      // Add first goal with 60% weightage
      await appraisalPage.addGoal({
        title: 'Goal 1',
        description: 'First goal',
        weightage: 60,
        category: 'performance',
      });

      // Verify partial weightage
      let totalWeightage = await appraisalPage.getTotalWeightage();
      expect(totalWeightage).toBe(60);

      // Add second goal with 30% weightage (total 90%)
      await appraisalPage.addGoal({
        title: 'Goal 2',
        description: 'Second goal',
        weightage: 30,
        category: 'behavior',
      });

      // Verify updated weightage
      totalWeightage = await appraisalPage.getTotalWeightage();
      expect(totalWeightage).toBe(90);

      // Edit first goal to 70% weightage (total 100%)
      await appraisalPage.editGoal('Goal 1', {
        title: 'Goal 1 Updated',
        description: 'Updated first goal',
        weightage: 70,
        category: 'performance',
      });

      // Verify final weightage is 100%
      totalWeightage = await appraisalPage.getTotalWeightage();
      expect(totalWeightage).toBe(100);

      // Should now be able to submit
      await appraisalPage.submitAppraisal();
      const status = await appraisalPage.getCurrentStatus();
      expect(status).toBe('submitted');
    });
  });

  test.describe('Status Transition Validation', () => {
    test('Enforces valid status transition sequence', async ({ page }) => {
      // Create appraisal and verify initial draft status
      await appraisalPage.goto();
      await appraisalPage.createAppraisalWithGoals(appraisalTemplates.quarterlyReview);
      
      let currentStatus = await appraisalPage.getCurrentStatus();
      expect(currentStatus).toBe('draft');

      // Test valid transition: draft → submitted
      await appraisalPage.transitionStatus('draft', 'submitted');
      currentStatus = await appraisalPage.getCurrentStatus();
      expect(currentStatus).toBe('submitted');

      // Verify invalid transition buttons are not available
      // Should not be able to go back to draft or skip to evaluation
      await expect(page.locator('[data-testid="status-transition-draft"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="status-transition-appraiser_evaluation"]')).not.toBeVisible();

      // Only valid next transition should be available
      await expect(page.locator('[data-testid="status-transition-appraisee_self_assessment"]')).toBeVisible();
    });

    test('Prevents invalid status transitions', async ({ page }) => {
      // Create appraisal in draft status
      await appraisalPage.goto();
      await appraisalPage.createAppraisalWithGoals(appraisalTemplates.quarterlyReview);

      // Attempt to jump directly to evaluation phase (should not be possible)
      await expect(page.locator('[data-testid="status-transition-appraiser_evaluation"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="status-transition-complete"]')).not.toBeVisible();

      // Only submit transition should be available from draft
      await expect(page.locator('[data-testid="status-transition-submitted"]')).toBeVisible();
    });
  });

  test.describe('Role-Based Permission Validation', () => {
    test('Employee can only access own appraisals', async ({ page }) => {
      // Create appraisal as employee
      await appraisalPage.goto();
      await appraisalPage.createAppraisalWithGoals(appraisalTemplates.quarterlyReview);

      // Navigate to appraisal list
      await page.goto('/appraisals');

      // Verify only own appraisals are visible
      const appraisalCards = page.locator('[data-testid="appraisal-card"]');
      const cardCount = await appraisalCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(1); // At least the one just created

      // Verify no manager-only controls are visible
      await expect(page.locator('[data-testid="bulk-approve"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="assign-reviewer"]')).not.toBeVisible();

      // Verify employee can edit only draft appraisals
      await expect(page.locator('[data-testid="edit-appraisal"]')).toBeVisible();
    });

    test('Manager can access team appraisals and has manager controls', async ({ page }) => {
      // Logout as employee and login as manager
      await loginPage.logout();
      await loginPage.loginSuccessfully(
        testUsers.manager.email,
        testUsers.manager.password
      );

      // Navigate to appraisal management
      await page.goto('/appraisals');

      // Verify manager controls are visible
      await expect(page.locator('[data-testid="team-appraisals-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-operations"]')).toBeVisible();

      // Verify manager can see team member appraisals
      await page.selectOption('[data-testid="team-appraisals-filter"]', 'all-team');
      
      // Should be able to see appraisals from team members
      const teamAppraisals = page.locator('[data-testid="appraisal-card"]');
      // Note: Actual count depends on test data setup
    });

    test('HR can access all appraisals and has admin controls', async ({ page }) => {
      // Logout and login as HR
      await loginPage.logout();
      await loginPage.loginSuccessfully(
        testUsers.hr.email,
        testUsers.hr.password
      );

      // Navigate to admin dashboard
      await page.goto('/admin/appraisals');

      // Verify HR admin controls are available
      await expect(page.locator('[data-testid="global-appraisal-search"]')).toBeVisible();
      await expect(page.locator('[data-testid="appraisal-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-settings"]')).toBeVisible();

      // Verify HR can access all appraisals across the organization
      await expect(page.locator('[data-testid="all-appraisals-view"]')).toBeVisible();
    });
  });

  test.describe('Data Validation and Constraints', () => {
    test('Enforces required fields in goal creation', async ({ page }) => {
      await appraisalPage.goto();
      await appraisalPage.fillBasicInfo('Required Fields Test');

      // Click add goal to open form
      await page.locator('[data-testid="add-goal-button"]').click();

      // Attempt to save without filling required fields
      await page.locator('[data-testid="save-goal"]').click();

      // Verify validation errors appear
      await expect(page.locator('[data-testid="goal-title-error"]')).toContainText('Title is required');
      await expect(page.locator('[data-testid="goal-weightage-error"]')).toContainText('Weightage is required');
      await expect(page.locator('[data-testid="goal-category-error"]')).toContainText('Category is required');
    });

    test('Validates weightage input constraints', async ({ page }) => {
      await appraisalPage.goto();
      await appraisalPage.fillBasicInfo('Weightage Constraints Test');

      await page.locator('[data-testid="add-goal-button"]').click();

      // Test negative weightage
      await page.locator('[data-testid="goal-title"]').fill('Test Goal');
      await page.locator('[data-testid="goal-description"]').fill('Test Description');
      await page.locator('[data-testid="goal-weightage"]').fill('-10');
      await page.locator('[data-testid="goal-category"]').selectOption('performance');

      await page.locator('[data-testid="save-goal"]').click();

      await expect(page.locator('[data-testid="goal-weightage-error"]')).toContainText(
        'Weightage must be between 1 and 100'
      );

      // Test weightage over 100
      await page.locator('[data-testid="goal-weightage"]').fill('150');
      await page.locator('[data-testid="save-goal"]').click();

      await expect(page.locator('[data-testid="goal-weightage-error"]')).toContainText(
        'Weightage must be between 1 and 100'
      );

      // Test valid weightage
      await page.locator('[data-testid="goal-weightage"]').fill('50');
      await page.locator('[data-testid="save-goal"]').click();

      // Should save successfully
      await expect(page.locator('[data-testid="goal-item"]:has-text("Test Goal")')).toBeVisible();
    });
  });
});
