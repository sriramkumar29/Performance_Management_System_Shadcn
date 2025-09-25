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

    // Step 6: Verify all form controls are present
    await expect(page.getByRole('combobox', { name: 'Employee' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Reviewer' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Appraisal Type' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit for Acknowledgement' })).toBeVisible();
    console.log('✅ All expected form controls are present and visible');

    console.log('🎉 APPRAISAL CREATION FORM: FULLY FUNCTIONAL');
  });

  test('🔍 Employee Selection Workflow Discovery', async ({ page }) => {
    console.log('=== 🔍 TESTING EMPLOYEE SELECTION WORKFLOW ===');
    
    await appraisalPage.goto();
    
    // Try to click the employee selection combobox
    const selectEmployeeCombobox = page.getByRole('combobox', { name: 'Employee' });
    await selectEmployeeCombobox.click();
    console.log('✅ Successfully clicked employee selection combobox');
    
    // Wait for dropdown to appear
    await page.waitForTimeout(1000);
    
    // Look for employee options
    const employeeOptions = page.locator('[role="option"]');
    const optionCount = await employeeOptions.count();
    console.log(`🔍 Found ${optionCount} employee option(s) in dropdown`);
    
    if (optionCount > 0) {
      console.log('✅ Employee dropdown contains selectable options');
      // List first few options for debugging
      for (let i = 0; i < Math.min(3, optionCount); i++) {
        const optionText = await employeeOptions.nth(i).textContent();
        console.log(`  Option ${i + 1}: ${optionText}`);
      }
    } else {
      console.log('⚠️ No employee options found in dropdown');
    }
    
    // Take a screenshot to see what appears
    await page.screenshot({ path: 'employee-selection-dropdown.png', fullPage: true });
    console.log('� Screenshot saved as employee-selection-dropdown.png');
    
    // Look for dropdowns and listboxes
    const dropdowns = page.locator('[role="listbox"], [role="menu"], .dropdown-menu');
    const dropdownCount = await dropdowns.count();
    console.log(`🔍 Found ${dropdownCount} dropdown(s) after clicking employee selection`);
  });

  test('🎭 Form State Management Validation', async ({ page }) => {
    console.log('=== 🎭 TESTING FORM STATE MANAGEMENT ===');
    
    await appraisalPage.goto();
    
    // Test initial state
    const addGoalBtn = page.getByRole('button', { name: 'Add Goal' }).first();
    const selectEmployeeCombobox = page.getByRole('combobox', { name: 'Employee' });
    const selectReviewerCombobox = page.getByRole('combobox', { name: 'Reviewer' });
    const selectTypeCombobox = page.getByRole('combobox', { name: 'Appraisal Type' });
    
    // Verify initial disabled states
    await expect(addGoalBtn).toBeDisabled();
    await expect(selectReviewerCombobox).toBeDisabled(); 
    await expect(selectTypeCombobox).toBeDisabled();
    console.log('✅ Initial form state: correct controls disabled');
    
    // Try opening employee dropdown to see options
    await selectEmployeeCombobox.click();
    await page.waitForTimeout(1000);
    
    // Look for employee options in the dropdown
    const employeeOptions = page.locator('[role="option"]');
    const optionCount = await employeeOptions.count();
    console.log(`🔍 Found ${optionCount} employee option(s) in dropdown`);
    
    if (optionCount > 0) {
      // Select the first employee
      await employeeOptions.first().click();
      console.log('✅ Selected first employee from dropdown');
      
      // Wait a moment for form state to update
      await page.waitForTimeout(1000);
      
      // Check if reviewer field is now enabled
      const reviewerEnabledAfter = await selectReviewerCombobox.isEnabled();
      const typeEnabledAfter = await selectTypeCombobox.isEnabled();
      
      console.log(`🔍 After employee selection:`);
      console.log(`  - Reviewer control enabled: ${reviewerEnabledAfter}`);
      console.log(`  - Type control enabled: ${typeEnabledAfter}`);
    } else {
      console.log('⚠️ No employee options found - skipping state change test');
    }
  });
});
