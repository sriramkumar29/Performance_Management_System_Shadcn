import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
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

test.describe('Debug Goal Template Data Loading', () => {
  test('Debug template loading process', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as manager
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.manager.email,
      testUsers.manager.password
    );

    // Navigate to goal templates with debug
    console.log('🔍 Navigating to goal templates page...');
    await page.goto('/goal-templates');
    await page.waitForLoadState('networkidle');

    // Debug: Check if we're on the right page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Debug: Check if the page title is correct
    const pageTitle = await page.locator('h1').textContent();
    console.log(`Page title: ${pageTitle}`);

    // Debug: Check if template list container exists
    const templateListExists = await page.locator('[data-testid="template-list"]').count();
    console.log(`Template list container count: ${templateListExists}`);

    // Debug: Check all elements in the template area
    const templateArea = page.locator('[data-testid="template-list"]');
    const allElements = await templateArea.locator('*').count();
    console.log(`Elements in template area: ${allElements}`);

    // Debug: Get all text content
    if (templateListExists > 0) {
      const templateText = await templateArea.textContent();
      console.log(`Template area content: ${templateText?.slice(0, 200)}...`);
    }

    // Debug: Check for loading states
    const loadingElements = await page.locator('text=Loading').count();
    console.log(`Loading indicators: ${loadingElements}`);

    // Debug: Check for error messages
    const errorElements = await page.locator('[role="alert"], .error, text=Error').count();
    console.log(`Error indicators: ${errorElements}`);

    // Debug: Intercept network requests
    page.on('response', response => {
      if (response.url().includes('/api/goals/templates')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Wait a bit and check again
    await page.waitForTimeout(3000);
    
    const finalTemplateCount = await page.locator('[data-testid="template-list"] > *').count();
    console.log(`Final template count: ${finalTemplateCount}`);

    // Try to trigger a refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const afterReloadCount = await page.locator('[data-testid="template-list"] > *').count();
    console.log(`After reload template count: ${afterReloadCount}`);
  });
});
