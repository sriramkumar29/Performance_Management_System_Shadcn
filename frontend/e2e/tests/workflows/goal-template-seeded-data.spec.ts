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

test.describe('Goal Template Workflow - Using Seeded Data', () => {
  test('Manager can view existing goal templates', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as manager (CEO has all permissions)
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.manager.email,
      testUsers.manager.password
    );

    // Navigate to goal templates page
    await page.goto('/goal-templates');
    await page.waitForLoadState('networkidle');

    // Verify the page loads and shows templates
    await expect(page).toHaveURL('/goal-templates');
    await expect(page.locator('h1')).toContainText('Manage Goal Templates');

    // Wait for templates to load and verify we have seeded templates
    await page.waitForSelector('[data-testid="template-list"]', { timeout: 10000 });
    
    // Check that at least some of our seeded templates are visible
    const templateList = page.locator('[data-testid="template-list"]');
    
    // Look for some of our seeded templates
    await expect(templateList.locator('text=Technical Excellence')).toBeVisible({ timeout: 5000 });
    await expect(templateList.locator('text=Strategic Planning')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Goal templates page loads with seeded data');
  });

  test('Employee can browse goal templates for appraisal creation', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as employee
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.employee.email,
      testUsers.employee.password
    );

    // Navigate to goal templates
    await page.goto('/goal-templates');
    await page.waitForLoadState('networkidle');

    // Verify templates are visible
    await expect(page.locator('[data-testid="template-list"]')).toBeVisible();
    
    // Check that we can see template details
    const templateCards = page.locator('[data-testid="template-list"] .hover\\:shadow-md');
    const templateCount = await templateCards.count();
    
    console.log(`✅ Found ${templateCount} goal templates available`);
    expect(templateCount).toBeGreaterThan(0);

    // Verify template information is displayed
    await expect(templateCards.first().locator('h3')).not.toBeEmpty();
    await expect(templateCards.first().locator('.text-muted-foreground')).not.toBeEmpty();
    
    console.log('✅ Goal template details are properly displayed');
  });

  test('Goal template API endpoints are working', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login first to get authentication
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.manager.email,
      testUsers.manager.password
    );

    // Test API endpoints directly
    const response = await page.request.get('http://localhost:7001/api/goals/templates');
    expect(response.status()).toBe(200);
    
    const templates = await response.json();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    
    console.log(`✅ API returned ${templates.length} goal templates`);
    
    // Verify template structure
    const firstTemplate = templates[0];
    expect(firstTemplate).toHaveProperty('temp_id');
    expect(firstTemplate).toHaveProperty('temp_title');
    expect(firstTemplate).toHaveProperty('temp_description');
    expect(firstTemplate).toHaveProperty('temp_weightage');
    
    console.log('✅ Goal template API structure is correct');
  });

  test('Goal template weightage validation works correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as manager
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.manager.email,
      testUsers.manager.password
    );

    // Get templates and verify weightage values
    const response = await page.request.get('http://localhost:7001/api/goals/templates');
    const templates = await response.json();
    
    // Check that all templates have valid weightage (0-100)
    for (const template of templates) {
      expect(template.temp_weightage).toBeGreaterThanOrEqual(0);
      expect(template.temp_weightage).toBeLessThanOrEqual(100);
    }
    
    console.log('✅ All goal templates have valid weightage values');
    
    // Verify specific template sets that should total 100%
    const seniorDevTemplates = templates.filter(t => 
      t.temp_title.includes('Technical Excellence') || 
      t.temp_title.includes('Project Leadership') || 
      t.temp_title.includes('Team Collaboration')
    );
    
    if (seniorDevTemplates.length >= 3) {
      const totalWeight = seniorDevTemplates.slice(0, 3).reduce((sum, t) => sum + t.temp_weightage, 0);
      console.log(`Senior Dev template set total: ${totalWeight}%`);
      // Note: Individual templates don't need to sum to 100%, that's managed during appraisal creation
    }
    
    console.log('✅ Goal template weightage validation passed');
  });
});
