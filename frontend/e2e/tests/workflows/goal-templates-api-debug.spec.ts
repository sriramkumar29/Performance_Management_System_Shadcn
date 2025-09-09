import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { testUsers } from '../../fixtures/test-data';

test.beforeEach(async ({ page }) => {
  // Monitor all network requests
  page.on('request', request => {
    console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
  });

  // Intercept API requests and redirect from port 7000 (dev) to 7001 (test)
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
    console.log(`🔀 API ROUTE: ${url} → ${redirectedUrl}`);
    await route.continue({
      url: redirectedUrl
    });
  });
});

test.describe('Goal Templates API Call Debug', () => {
  test('Monitor exact API calls when loading goal templates page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    console.log('🔐 Starting login...');
    await loginPage.goto();
    await loginPage.loginSuccessfully(testUsers.manager.email, testUsers.manager.password);
    console.log('✅ Login successful');

    console.log('🚀 Navigating to goal templates page...');
    
    // Navigate and wait for network idle
    await page.goto('/goal-templates');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Navigation complete');

    // Wait a bit more to catch any delayed requests
    await page.waitForTimeout(3000);

    // Check what's actually displayed
    const pageContent = await page.content();
    const hasTemplateList = pageContent.includes('data-testid="template-list"');
    const templateListContent = await page.locator('[data-testid="template-list"]').textContent();
    
    console.log(`🔍 Page has template list element: ${hasTemplateList}`);
    console.log(`📋 Template list content: "${templateListContent?.trim()}"`);

    // Check for any JavaScript errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`❌ JS ERROR: ${msg.text()}`);
      }
    });

    // Reload the page to catch any initialization errors
    console.log('🔄 Reloading to catch JS errors...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    if (logs.length > 0) {
      console.log('🚨 JavaScript errors found:');
      logs.forEach(log => console.log(log));
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    // Try to manually trigger the API call
    console.log('🧪 Manually triggering goal templates API call...');
    const manualApiResult = await page.evaluate(async () => {
      try {
        // Use the same API function that the component should use
        const token = sessionStorage.getItem('auth_token');
        console.log('Token available:', !!token);
        
        const response = await fetch('/api/goals/templates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const text = await response.text();
        console.log('Response text:', text);
        
        return {
          status: response.status,
          statusText: response.statusText,
          data: text
        };
      } catch (error) {
        return { error: error.toString() };
      }
    });

    console.log('🧪 Manual API result:', manualApiResult);

    console.log('🎯 Debug completed');
  });
});
