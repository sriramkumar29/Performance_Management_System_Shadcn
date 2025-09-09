import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test('Debug dashboard and appraisal creation flow', async ({ page }) => {
  // Intercept API requests and redirect from port 7000 (dev) to 7001 (test)
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
    await route.continue({
      url: redirectedUrl
    });
  });

  console.log('=== LOGIN FLOW ===');
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const loginButton = page.getByRole('button', { name: /sign in/i });
  
  await emailInput.fill(testUsers.employee.email);
  await passwordInput.fill(testUsers.employee.password);
  await loginButton.click();
  
  // Wait for dashboard to load
  await page.waitForURL('/');
  await page.waitForLoadState('networkidle');
  console.log('✅ Successfully logged in to dashboard');
  
  console.log('=== CLICKING CREATE APPRAISAL BUTTON ===');
  
  // Click the "Create Appraisal" button
  const createAppraisalButton = page.getByRole('button', { name: 'Create Appraisal' });
  await createAppraisalButton.click();
  await page.waitForLoadState('networkidle');
  
  console.log('✅ Clicked Create Appraisal button');
  console.log('Current URL:', page.url());
  
  // Take screenshot after clicking
  await page.screenshot({ path: 'debug-after-create-click.png', fullPage: true });
  
  // Wait a bit for any modal or form to appear
  await page.waitForTimeout(1000);
  
  console.log('=== EXPLORING FORM AFTER CREATE CLICK ===');
  
  // Look for any input fields (might be in a modal)
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  console.log(`Found ${inputCount} input fields:`);
  
  for (let i = 0; i < Math.min(inputCount, 15); i++) {
    const inputType = await inputs.nth(i).getAttribute('type');
    const inputPlaceholder = await inputs.nth(i).getAttribute('placeholder');
    const inputName = await inputs.nth(i).getAttribute('name');
    const inputId = await inputs.nth(i).getAttribute('id');
    const isVisible = await inputs.nth(i).isVisible();
    console.log(`  Input ${i}: type="${inputType}" placeholder="${inputPlaceholder}" name="${inputName}" id="${inputId}" visible="${isVisible}"`);
  }
  
  // Look for textareas
  const textareas = page.locator('textarea');
  const textareaCount = await textareas.count();
  console.log(`Found ${textareaCount} textarea fields:`);
  
  for (let i = 0; i < textareaCount; i++) {
    const placeholder = await textareas.nth(i).getAttribute('placeholder');
    const name = await textareas.nth(i).getAttribute('name');
    const id = await textareas.nth(i).getAttribute('id');
    const isVisible = await textareas.nth(i).isVisible();
    console.log(`  Textarea ${i}: placeholder="${placeholder}" name="${name}" id="${id}" visible="${isVisible}"`);
  }
  
  // Look for select dropdowns
  const selects = page.locator('select');
  const selectCount = await selects.count();
  console.log(`Found ${selectCount} select fields:`);
  
  for (let i = 0; i < selectCount; i++) {
    const name = await selects.nth(i).getAttribute('name');
    const id = await selects.nth(i).getAttribute('id');
    const isVisible = await selects.nth(i).isVisible();
    console.log(`  Select ${i}: name="${name}" id="${id}" visible="${isVisible}"`);
  }
  
  // Look for any modals or dialogs
  const dialogs = page.locator('[role="dialog"], .modal, .dialog');
  const dialogCount = await dialogs.count();
  console.log(`Found ${dialogCount} dialogs/modals:`);
  
  for (let i = 0; i < dialogCount; i++) {
    const isVisible = await dialogs.nth(i).isVisible();
    const ariaLabel = await dialogs.nth(i).getAttribute('aria-label');
    console.log(`  Dialog ${i}: visible="${isVisible}" aria-label="${ariaLabel}"`);
  }
  
  // Look for buttons again to see if any new ones appeared
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  console.log(`Found ${buttonCount} buttons total:`);
  
  for (let i = 0; i < Math.min(buttonCount, 15); i++) {
    const buttonText = await buttons.nth(i).textContent();
    const isVisible = await buttons.nth(i).isVisible();
    console.log(`  Button ${i}: "${buttonText}" visible="${isVisible}"`);
  }
});
