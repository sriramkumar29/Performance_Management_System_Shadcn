import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { testUsers } from '../../fixtures/test-data';

test.describe('🔧 Debugging Employee Selection Workflow', () => {
  let loginPage: LoginPage;
  let appraisalPage: AppraisalCreatePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    appraisalPage = new AppraisalCreatePage(page);

    // Apply simple API routing fix
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
      await route.continue({ url: redirectedUrl });
    });

    await loginPage.goto();
    await loginPage.loginSuccessfully(testUsers.manager.email, testUsers.manager.password);
  });

  test('🔍 Debug Employee Selection Step by Step', async ({ page }) => {
    console.log('=== DEBUGGING EMPLOYEE SELECTION WORKFLOW ===');
    
    // Set up response monitoring to see actual API responses
    const apiResponses: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('/api/employees')) {
        try {
          const responseBody = await response.text();
          let parsedBody;
          try {
            parsedBody = JSON.parse(responseBody);
          } catch {
            parsedBody = responseBody;
          }
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            body: parsedBody
          });
        } catch (error) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            error: error.message
          });
        }
      }
    });
    
    // Step 1: Navigate to appraisal creation
    await appraisalPage.goto();
    console.log('✅ Successfully navigated to appraisal create page');

    // Wait for API calls to complete
    await page.waitForTimeout(3000);
    
    // Log API responses
    console.log('🔍 Employee API responses received:');
    apiResponses.forEach(resp => {
      console.log(`  - ${resp.status} ${resp.url}`);
      if (resp.body && typeof resp.body === 'object') {
        if (Array.isArray(resp.body)) {
          console.log(`    -> Array with ${resp.body.length} items`);
          if (resp.body.length > 0) {
            console.log(`    -> First item: ${JSON.stringify(resp.body[0])}`);
          }
        } else {
          console.log(`    -> ${JSON.stringify(resp.body)}`);
        }
      } else {
        console.log(`    -> ${resp.body}`);
      }
    });

    // Step 2: Check initial state
    const addGoalBtn = page.getByRole('button', { name: 'Add Goal' }).first();
    await expect(addGoalBtn).toBeDisabled();
    console.log('✅ Add Goal button is initially disabled');

    // Step 3: Try employee selection
    console.log('🔍 Attempting employee selection...');
    const employeeSelect = page.getByRole('combobox', { name: 'Employee' });
    await expect(employeeSelect).toBeVisible();
    console.log('✅ Employee combobox is visible');

    await employeeSelect.click();
    console.log('✅ Clicked employee combobox');
    
    // Wait for dropdown options
    await page.waitForTimeout(1000);
    
    // Check if options appeared
    const options = page.getByRole('option');
    const optionCount = await options.count();
    console.log(`🔍 Found ${optionCount} employee options`);
    
    if (optionCount === 0) {
      // Take screenshot and inspect DOM
      await page.screenshot({ path: 'debug-no-employees.png', fullPage: true });
      console.log('� Screenshot saved as debug-no-employees.png');
      
      // Check if there are any console errors
      const logs = [];
      page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
      
      console.log('🔍 Page console logs:');
      logs.forEach(log => console.log(`  - ${log}`));
    }
    
    console.log('🎉 Debug session completed');
  });
});
