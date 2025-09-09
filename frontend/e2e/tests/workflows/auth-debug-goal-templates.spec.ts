import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { testUsers } from '../../fixtures/test-data';

test.beforeEach(async ({ page }) => {
  // Intercept API requests and redirect from port 7000 (dev) to 7001 (test)
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
    console.log(`🔀 Routing: ${url} → ${redirectedUrl}`);
    
    // Log headers to see if auth token is present
    const headers = route.request().headers();
    console.log(`📋 Request headers: ${JSON.stringify(headers, null, 2)}`);
    
    await route.continue({
      url: redirectedUrl
    });
  });
});

test.describe('Authentication Debug for Goal Templates', () => {
  test('Debug authentication token flow', async ({ page }) => {
    const loginPage = new LoginPage(page);

    console.log('🔐 Starting authentication debug...');
    
    // Monitor sessionStorage changes
    await page.addInitScript(() => {
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = function(key, value) {
        console.log(`📝 SessionStorage SET: ${key} = ${value.substring(0, 50)}...`);
        return originalSetItem.call(this, key, value);
      };
    });

    // Login
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.manager.email,
      testUsers.manager.password
    );

    console.log('✅ Login completed');

    // Check sessionStorage after login
    const authToken = await page.evaluate(() => sessionStorage.getItem('auth_token'));
    const refreshToken = await page.evaluate(() => sessionStorage.getItem('refresh_token'));
    
    console.log(`🔑 Auth token present: ${!!authToken}`);
    console.log(`🔄 Refresh token present: ${!!refreshToken}`);
    
    if (authToken) {
      console.log(`🔑 Auth token length: ${authToken.length}`);
      console.log(`🔑 Auth token start: ${authToken.substring(0, 20)}...`);
    }

    // Check the API base URL configuration
    const apiBaseUrl = await page.evaluate(() => {
      // Check if the app is using the correct API base URL
      return (window as any).__API_BASE_URL__ || 
             (import.meta as any)?.env?.VITE_API_BASE_URL || 
             'not set';
    });
    console.log(`🌐 API Base URL: ${apiBaseUrl}`);

    // Now try to make a request to goal templates
    console.log('🚀 Navigating to goal templates...');
    await page.goto('/goal-templates');
    await page.waitForLoadState('networkidle');

    // Wait a bit to see the requests
    await page.waitForTimeout(2000);

    // Check what happened
    const templateListText = await page.locator('[data-testid="template-list"]').textContent();
    console.log(`📋 Template list shows: "${templateListText?.trim()}"`);

    // Manual API test from browser context
    console.log('🧪 Testing direct API call from browser...');
    const apiTestResult = await page.evaluate(async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const response = await fetch('http://localhost:7001/api/goals/templates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          hasToken: !!token,
          tokenLength: token?.length || 0
        };
      } catch (error) {
        return { error: error.toString() };
      }
    });

    console.log(`🧪 Direct API test result:`, apiTestResult);

    if (apiTestResult.status === 200) {
      console.log('✅ Direct API call succeeded - issue is in React app API calls');
    } else if (apiTestResult.status === 401) {
      console.log('❌ Direct API call failed - authentication issue');
    } else {
      console.log(`❌ Direct API call failed with status: ${apiTestResult.status}`);
    }

    // Test: Set the API base URL explicitly for the frontend
    await page.evaluate(() => {
      (window as any).__API_BASE_URL__ = 'http://localhost:7001';
    });

    console.log('🔧 Set API base URL to test backend, refreshing...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if templates load now
    await page.waitForTimeout(2000);
    const templateListAfterFix = await page.locator('[data-testid="template-list"]').textContent();
    console.log(`📋 After API base URL fix: "${templateListAfterFix?.trim()}"`);

    console.log('🎯 Authentication debug completed');
  });
});
