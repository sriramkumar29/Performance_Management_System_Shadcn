import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { testUsers } from '../../fixtures/test-data';

test.describe('🔧 Debugging API Data Loading', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);

    // Apply API routing fix with header preservation
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
      
      // Preserve all headers including authorization
      const headers = route.request().headers();
      
      await route.continue({ 
        url: redirectedUrl,
        headers: headers
      });
    });
  });

  test('🔍 Debug API Endpoints and Data Loading', async ({ page }) => {
    console.log('=== DEBUGGING API DATA LOADING ===');
    
    // Login first
    await loginPage.goto();
    await loginPage.loginSuccessfully(testUsers.manager.email, testUsers.manager.password);
    await page.waitForURL('/');
    console.log('✅ Successfully logged in');

    // Check token immediately after login
    const tokenAfterLogin = await page.evaluate(() => localStorage.getItem('token'));
    console.log('🔍 Auth token after login:', !!tokenAfterLogin, tokenAfterLogin ? `(${tokenAfterLogin.substring(0, 20)}...)` : '');

    // Set up request/response monitoring
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const authHeader = request.headers()['authorization'];
        apiCalls.push(`${request.method()} ${request.url()} [Auth: ${authHeader ? 'Bearer ***' : 'NONE'}]`);
      }
    });

    // Navigate to appraisal creation page
    const createButton = page.getByRole('button', { name: 'Create Appraisal' });
    await createButton.click();
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Navigated to appraisal creation page');
    
    // Check token after navigation
    const tokenAfterNav = await page.evaluate(() => localStorage.getItem('token'));
    console.log('🔍 Auth token after navigation:', !!tokenAfterNav, tokenAfterNav ? `(${tokenAfterNav.substring(0, 20)}...)` : '');
    
    // Wait a bit more for API calls to complete
    await page.waitForTimeout(3000);
    
    console.log('🔍 API calls made:');
    apiCalls.slice(-10).forEach(call => console.log(`  - ${call}`)); // Show last 10 calls
    
    // Try to manually call the employees API with proper token
    const response = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Using token:', token ? 'exists' : 'missing');
        const response = await fetch('http://localhost:7001/api/employees/', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        return {
          status: response.status,
          ok: response.ok,
          data: data
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('🔍 Direct employees API call result:', response);
    
    console.log('🎉 API debug session completed');
  });
});
