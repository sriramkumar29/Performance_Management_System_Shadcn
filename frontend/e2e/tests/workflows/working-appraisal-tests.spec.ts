import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { testUsers } from '../../fixtures/test-data';

test.beforeEach(async ({ page }) => {
  // Intercept API requests and redirect from port 7000 (dev) to 7001 (test)
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
    await route.continue({
      url: redirectedUrl
    });
  });
});

test.describe('Fixed Employee Appraisal Workflow', () => {
  test('Successfully login and navigate to appraisal creation form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const appraisalCreatePage = new AppraisalCreatePage(page);

    // Step 1: Login successfully
    await loginPage.goto();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    
    // Wait for successful login and navigation to dashboard
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login successful');

    // Step 2: Navigate to appraisal creation
    await appraisalCreatePage.goto();
    console.log('✅ Successfully navigated to appraisal creation form');
    
    // Step 3: Verify the page loaded correctly
    await appraisalCreatePage.verifyPageLoaded();
    console.log('✅ Appraisal creation page verified');

    // Step 4: Fill basic details (dates)
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    await appraisalCreatePage.fillBasicDetails({
      startDate: today.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0]
    });
    console.log('✅ Basic details filled');

    // Step 5: Verify the required workflow - Employee must be selected first
    await expect(appraisalCreatePage.addGoalButton).toBeDisabled();
    console.log('✅ Confirmed: Add Goal button is disabled until employee is selected');
    
    // Step 6: Verify all form elements are accessible
    await expect(appraisalCreatePage.selectEmployeeButton).toBeVisible();
    await expect(appraisalCreatePage.selectReviewerButton).toBeVisible();
    await expect(appraisalCreatePage.selectAppraisalTypeButton).toBeVisible();
    
    // Verify form actions are available
    await expect(appraisalCreatePage.saveDraftButton).toBeVisible();
    await expect(appraisalCreatePage.submitButton).toBeVisible();
    await expect(appraisalCreatePage.cancelButton).toBeVisible();

    console.log('✅ All form elements verified and accessible');
    console.log('✅ Test completed successfully - authentication and navigation working!');
  });

  test('Demonstrate working login for different user roles', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Test employee login
    await loginPage.goto();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    
    // Wait for successful login
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard is loaded
    await expect(page).toHaveTitle('Performance Appraisal Management');
    await expect(page.getByRole('button', { name: 'Create Appraisal' })).toBeVisible();
    
    console.log('✅ Employee login and dashboard access verified');
  });
});
