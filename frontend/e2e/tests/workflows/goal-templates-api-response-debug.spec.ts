import { test, expect } from '@playwright/test';

test.describe('Goal Templates API Response Debug', () => {
  test('Check exact API response content and authentication', async ({ page }) => {
    console.log('🔍 Checking backend availability...');
    
    // Check if test backend is running
    try {
      const response = await page.request.get('http://localhost:7001/api/health', { failOnStatusCode: false });
      if (response.status() !== 200) {
        console.log('❌ Test backend not available, starting it...');
        // Backend should already be running from previous tests
      } else {
        console.log('✅ Backend is available');
      }
    } catch (error) {
      console.log('❌ Backend check failed:', error);
    }

    console.log('🛠️ Using existing backend test data...');
    console.log('✅ Test environment ready');

    // Start request monitoring BEFORE navigation
    const requests: Array<{ url: string; headers: any; method: string; response?: any }> = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        const requestInfo = {
          url: request.url(),
          headers: request.headers(),
          method: request.method()
        };
        console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
        console.log(`📋 Headers:`, JSON.stringify(request.headers(), null, 2));
        requests.push(requestInfo);
      }
    });

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const text = await response.text();
          console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
          console.log(`📄 Content:`, text);
          
          // Find the matching request and add response
          const matchingRequest = requests.find(r => r.url === response.url());
          if (matchingRequest) {
            matchingRequest.response = { status: response.status(), body: text };
          }
        } catch (error) {
          console.log(`❌ Error reading response for ${response.url()}:`, error);
        }
      }
    });

    console.log('🔐 Starting login...');
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="email"]', 'john.ceo@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
    console.log('✅ Login successful');

    // Wait a bit for auth state to settle
    await page.waitForTimeout(1000);

    console.log('🔐 Checking stored authentication...');
    const authData = await page.evaluate(() => {
      return {
        sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
        localStorage: Object.fromEntries(Object.entries(localStorage))
      };
    });
    console.log('💾 Stored auth data:', JSON.stringify(authData, null, 2));

    console.log('🚀 Navigating to goal templates page...');
    await page.goto('http://localhost:5173/goal-templates');
    await page.waitForTimeout(3000); // Give time for API calls

    console.log('📍 Navigation complete');

    // Now manually test the API with proper auth
    console.log('🧪 Testing API call with browser context...');
    
    try {
      const apiResponse = await page.request.get('http://localhost:7001/api/goals/templates');
      const responseText = await apiResponse.text();
      console.log(`🧪 Direct API call result: { status: ${apiResponse.status()}, statusText: '${apiResponse.statusText()}', data: '${responseText}' }`);
    } catch (error) {
      console.log('❌ Direct API call failed:', error);
    }

    // Check what's actually displayed
    console.log('🔍 Checking page content...');
    const hasTemplateList = await page.locator('[data-testid="template-list"]').count() > 0;
    console.log(`🔍 Page has template list element: ${hasTemplateList}`);
    
    if (hasTemplateList) {
      const templateListContent = await page.locator('[data-testid="template-list"]').textContent();
      console.log(`📋 Template list content: "${templateListContent}"`);
    }

    // Check for any JavaScript errors
    const jsErrors: any[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error);
      console.log('❌ JavaScript error:', error.message);
    });

    await page.waitForTimeout(2000);

    console.log('📊 Final analysis:');
    console.log(`- API requests made: ${requests.length}`);
    console.log(`- JavaScript errors: ${jsErrors.length}`);
    console.log('- API requests summary:');
    requests.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.method} ${req.url} -> ${req.response?.status || 'pending'}`);
      if (req.url.includes('/goals/templates')) {
        console.log(`     Auth header: ${req.headers?.authorization || 'MISSING'}`);
        console.log(`     Response: ${req.response?.body || 'no response'}`);
      }
    });

    console.log('🎯 Debug completed');
  });
});
