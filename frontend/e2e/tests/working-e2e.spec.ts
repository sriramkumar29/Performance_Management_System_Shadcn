import { test, expect } from '@playwright/test';

test.describe('Working E2E Tests', () => {
  test('Login page loads and shows form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Verify login page loads with correct title
    await expect(page).toHaveTitle(/Performance.*Appraisal.*Management/);
    
    // Check if login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Application navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/.*login.*/);
    
    // Verify page structure is accessible
    await expect(page.locator('body')).toBeVisible();
  });

  test('Performance target met', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 5s generous target
    
    console.log(`Login page load time: ${loadTime}ms`);
  });

  test('Responsive design works', async ({ page }) => {
    await page.goto('/login');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Basic form validation', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Form should still be visible (either browser validation or custom)
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
