import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Route ALL API requests to test backend (port 7001) for consistent testing
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
    
    console.log(`🔀 API ROUTE: ${url} → ${redirectedUrl}`);
    
    await route.continue({
      url: redirectedUrl
    });
  });
});

test.describe('Direct Goal Templates API Test (Port 7001)', () => {
  test('Test goal templates API call using test backend', async ({ page }) => {
    console.log('🔍 Testing goal templates with test backend (port 7001)...');

    // Set up comprehensive request monitoring
    const apiRequests: Array<{ url: string; status: number; body: string; headers: any }> = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
        if (request.headers().authorization) {
          console.log(`🔐 Auth: ${request.headers().authorization.substring(0, 20)}...`);
        }
      }
    });
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const body = await response.text();
          apiRequests.push({
            url: response.url(),
            status: response.status(),
            body: body,
            headers: response.headers()
          });
          console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
          if (response.url().includes('/goals/templates')) {
            console.log(`📄 Goal Templates Body: ${body}`);
          }
        } catch (error) {
          console.log(`❌ Error reading response: ${error}`);
        }
      }
    });

    console.log('🔐 Starting login process...');
    await page.goto('http://localhost:5173/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'john.ceo@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    try {
      await page.waitForURL('http://localhost:5173/', { timeout: 15000 });
      console.log('✅ Login successful');
    } catch (error) {
      console.log('❌ Login failed, checking current URL...');
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // Check if we're still on login page
      if (currentUrl.includes('/login')) {
        console.log('🔍 Still on login page, checking for errors...');
        const errorText = await page.textContent('body');
        console.log(`📋 Page content: ${errorText?.substring(0, 200)}...`);
      }
    }

    // Wait for auth state to settle
    await page.waitForTimeout(2000);

    console.log('🚀 Navigating to goal templates...');
    await page.goto('http://localhost:5173/goal-templates');
    
    // Wait for potential API calls
    await page.waitForTimeout(5000);

    console.log('📊 Results:');
    console.log(`- Total API requests captured: ${apiRequests.length}`);
    
    // Filter for goal templates requests
    const goalTemplateRequests = apiRequests.filter(req => 
      req.url.includes('/goals/templates')
    );
    
    console.log(`- Goal templates API requests: ${goalTemplateRequests.length}`);
    
    if (goalTemplateRequests.length > 0) {
      goalTemplateRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.status} ${req.url}`);
        console.log(`     Body length: ${req.body.length} characters`);
        console.log(`     Body preview: ${req.body.substring(0, 150)}${req.body.length > 150 ? '...' : ''}`);
        
        // Parse and analyze the response
        try {
          const parsed = JSON.parse(req.body);
          if (Array.isArray(parsed)) {
            console.log(`     ✅ Valid array with ${parsed.length} templates`);
            if (parsed.length > 0) {
              console.log(`     📋 First template: ${parsed[0].temp_name || 'unnamed'}`);
            }
          } else {
            console.log(`     ⚠️  Response is not an array: ${typeof parsed}`);
          }
        } catch (parseError) {
          console.log(`     ❌ JSON parse error: ${parseError}`);
        }
      });
    } else {
      console.log('❌ No goal templates API requests detected');
      console.log('🔍 All API requests:');
      apiRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.status} ${req.url}`);
      });
    }

    // Check page content
    const pageContent = await page.textContent('body');
    const hasTemplatesText = pageContent?.includes('templates') || false;
    const hasNoTemplatesText = pageContent?.includes('No templates found') || false;
    const hasCreateTemplateButton = await page.locator('[data-testid="create-template"]').count() > 0;
    
    console.log(`📋 Page analysis:`);
    console.log(`  - Mentions templates: ${hasTemplatesText}`);
    console.log(`  - Shows "No templates found": ${hasNoTemplatesText}`);
    console.log(`  - Has create template button: ${hasCreateTemplateButton}`);
    
    if (hasCreateTemplateButton) {
      console.log('🎉 SUCCESS: Goal templates page is working!');
    }

    // Additional verification: Check if we have the expected data
    if (goalTemplateRequests.length > 0) {
      const lastRequest = goalTemplateRequests[goalTemplateRequests.length - 1];
      try {
        const templates = JSON.parse(lastRequest.body);
        if (Array.isArray(templates) && templates.length >= 27) {
          console.log('🎉 SUCCESS: Found expected number of templates (27+)!');
          console.log('✅ Goal template workflow is ready for E2E testing!');
        } else if (Array.isArray(templates) && templates.length > 0) {
          console.log(`⚠️  Found ${templates.length} templates (expected 27+)`);
        } else {
          console.log('❌ No templates in response despite API call success');
        }
      } catch (error) {
        console.log(`❌ Could not parse templates response: ${error}`);
      }
    }

    console.log('🎯 Test completed');
  });
});
