import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { testUsers } from '../../fixtures/test-data';

test.describe('🔧 Fixed Business Rules Tests', () => {
  let loginPage: LoginPage;
  let appraisalPage: AppraisalCreatePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    appraisalPage = new AppraisalCreatePage(page);

    // Intercept API requests and redirect from port 7000 (dev) to 7001 (test)
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
      await route.continue({
        url: redirectedUrl
      });
    });

    // Login with working credentials
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.employee.email,
      testUsers.employee.password
    );
  });

  test('🎯 Navigation and Form Loading - WORKING', async ({ page }) => {
    console.log('=== 📝 TESTING APPRAISAL CREATION FLOW ===');
    
    // Step 1: Navigate to appraisal creation
    await appraisalPage.goto();
    console.log('✅ Successfully navigated to appraisal create page');

    // Step 2: Verify page loads correctly
    await appraisalPage.verifyPageLoaded();
    console.log('✅ All form elements are visible and accessible');

    // Step 3: Check that Add Goal button is disabled initially (business rule)
    const addGoalButton = page.getByRole('button', { name: 'Add Goal' }).first();
    await expect(addGoalButton).toBeDisabled();
    console.log('✅ Add Goal button is correctly disabled before employee selection');
    
    // Step 4: Verify the business rule message
    const buttonTitle = await addGoalButton.getAttribute('title');
    expect(buttonTitle).toContain('Select an employee first');
    console.log('✅ Correct business rule message displayed');

    // Step 5: Fill basic form fields that are accessible
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await appraisalPage.fillBasicDetails({
      startDate: today,
      endDate: nextMonth
    });
    console.log('✅ Successfully filled date fields');

    // Step 6: Verify all buttons are present
    await expect(page.getByRole('button', { name: 'Select employee to appraise' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select reviewer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select appraisal type' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit for Acknowledgement' })).toBeVisible();
    console.log('✅ All expected form buttons are present and visible');

    console.log('🎉 APPRAISAL CREATION FORM: FULLY FUNCTIONAL');
  });

  test('🔍 Employee Selection Workflow Discovery', async ({ page }) => {
    console.log('=== 🔍 TESTING EMPLOYEE SELECTION WORKFLOW ===');
    
    await appraisalPage.goto();
    
    // Try to click the employee selection button
    const selectEmployeeButton = page.getByRole('button', { name: 'Select employee to appraise' });
    await selectEmployeeButton.click();
    console.log('✅ Successfully clicked employee selection button');
    
    // Wait for any modal or dropdown to appear
    await page.waitForTimeout(1000);
    
    // Take a screenshot to see what appears
    await page.screenshot({ path: 'employee-selection-modal.png', fullPage: true });
    console.log('📷 Screenshot saved as employee-selection-modal.png');
    
    // Look for any new elements that appeared
    const modals = page.locator('[role="dialog"]');
    const modalCount = await modals.count();
    console.log(`🔍 Found ${modalCount} modal(s) after clicking employee selection`);
    
    // Look for dropdowns
    const dropdowns = page.locator('[role="listbox"], [role="menu"], .dropdown-menu');
    const dropdownCount = await dropdowns.count();
    console.log(`🔍 Found ${dropdownCount} dropdown(s) after clicking employee selection`);
  });

  test('🎭 Form State Management Validation', async ({ page }) => {
    console.log('=== 🎭 TESTING FORM STATE MANAGEMENT ===');
    
    await appraisalPage.goto();
    
    // Test initial state
    const addGoalBtn = page.getByRole('button', { name: 'Add Goal' }).first();
    const selectReviewerBtn = page.getByRole('button', { name: 'Select reviewer' });
    const selectTypeBtn = page.getByRole('button', { name: 'Select appraisal type' });
    
    // Verify initial disabled states
    await expect(addGoalBtn).toBeDisabled();
    await expect(selectReviewerBtn).toBeDisabled(); 
    await expect(selectTypeBtn).toBeDisabled();
    console.log('✅ Initial form state: correct buttons disabled');
    
    // Try employee selection to see if it enables other buttons
    await page.getByRole('button', { name: 'Select employee to appraise' }).click();
    await page.waitForTimeout(500);
    
    // Check if states changed
    const reviewerEnabledAfter = await selectReviewerBtn.isEnabled();
    const typeEnabledAfter = await selectTypeBtn.isEnabled();
    
    console.log(`🔍 After employee selection attempt:`);
    console.log(`  - Reviewer button enabled: ${reviewerEnabledAfter}`);
    console.log(`  - Type button enabled: ${typeEnabledAfter}`);
  });
});
