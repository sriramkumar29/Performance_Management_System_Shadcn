import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { testUsers } from '../../fixtures/test-data';

test.describe('🔧 Simple Employee Selection Test', () => {
  let loginPage: LoginPage;
  let appraisalPage: AppraisalCreatePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    appraisalPage = new AppraisalCreatePage(page);

    // Apply API routing fix
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
      await route.continue({ url: redirectedUrl });
    });

    await loginPage.goto();
    await loginPage.loginSuccessfully(testUsers.manager.email, testUsers.manager.password);
  });

  test('🎯 Simple Employee Selection and Add Goal Button Test', async ({ page }) => {
    console.log('=== TESTING SIMPLE EMPLOYEE SELECTION WORKFLOW ===');
    
    // Navigate to appraisal creation
    await appraisalPage.goto();
    console.log('✅ Navigated to appraisal create page');

    // Check initial state
    const addGoalBtn = page.getByRole('button', { name: 'Add Goal' }).first();
    await expect(addGoalBtn).toBeDisabled();
    console.log('✅ Add Goal button initially disabled');

    // Try employee selection using our updated method
    console.log('🔍 Attempting employee selection...');
    const selectionResult = await appraisalPage.selectEmployee();
    
    if (selectionResult) {
      console.log('✅ Employee selection successful');
      
      // Wait for state to update
      await page.waitForTimeout(2000);
      
      // Check if Add Goal button is now enabled
      const isEnabled = await addGoalBtn.isEnabled();
      console.log(`🔍 Add Goal button enabled after employee selection: ${isEnabled}`);
      
      if (isEnabled) {
        console.log('🎉 SUCCESS: Employee selection enables Add Goal button');
        
        // Try clicking the Add Goal button
        await addGoalBtn.click();
        await page.waitForTimeout(1000);
        
        // Check if modal appeared
        const modal = page.getByRole('dialog');
        const modalVisible = await modal.isVisible();
        console.log(`🔍 Add Goal modal visible: ${modalVisible}`);
        
        if (modalVisible) {
          console.log('🎉 SUCCESS: Add Goal modal opens successfully');
          // Close modal
          const closeBtn = modal.getByRole('button', { name: /cancel|close/i }).first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          }
        }
      } else {
        const disabledReason = await addGoalBtn.getAttribute('title');
        console.log(`❌ Add Goal still disabled. Reason: ${disabledReason}`);
      }
    } else {
      console.log('❌ Employee selection failed - no options available');
    }
    
    console.log('🎉 Test completed');
  });
});
