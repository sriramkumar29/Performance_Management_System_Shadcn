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

test('Debug: Show exact UI elements on appraisal create page', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Login
  await loginPage.goto();
  await loginPage.login(testUsers.employee.email, testUsers.employee.password);
  await page.waitForURL('/');
  await page.waitForLoadState('networkidle');

  // Navigate to appraisal creation
  const createAppraisalButton = page.getByRole('button', { name: 'Create Appraisal' });
  await createAppraisalButton.click();
  await page.waitForLoadState('networkidle');

  console.log('=== CURRENT URL ===');
  console.log(page.url());

  console.log('=== ALL BUTTONS ON PAGE ===');
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  for (let i = 0; i < buttonCount; i++) {
    const buttonText = await buttons.nth(i).textContent();
    const isVisible = await buttons.nth(i).isVisible();
    const isDisabled = await buttons.nth(i).isDisabled();
    const title = await buttons.nth(i).getAttribute('title');
    console.log(`Button ${i}: "${buttonText}" visible=${isVisible} disabled=${isDisabled} title="${title}"`);
  }

  console.log('=== ALL INPUT FIELDS ===');
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  for (let i = 0; i < inputCount; i++) {
    const type = await inputs.nth(i).getAttribute('type');
    const placeholder = await inputs.nth(i).getAttribute('placeholder');
    const isVisible = await inputs.nth(i).isVisible();
    console.log(`Input ${i}: type="${type}" placeholder="${placeholder}" visible=${isVisible}`);
  }

  console.log('=== ALL TEXT CONTENT CONTAINING "employee" ===');
  const employeeElements = page.locator('text=employee');
  const employeeCount = await employeeElements.count();
  for (let i = 0; i < employeeCount; i++) {
    const text = await employeeElements.nth(i).textContent();
    const isVisible = await employeeElements.nth(i).isVisible();
    console.log(`Employee text ${i}: "${text}" visible=${isVisible}`);
  }

  console.log('=== ALL TEXT CONTENT CONTAINING "reviewer" ===');
  const reviewerElements = page.locator('text=reviewer');
  const reviewerCount = await reviewerElements.count();
  for (let i = 0; i < reviewerCount; i++) {
    const text = await reviewerElements.nth(i).textContent();
    const isVisible = await reviewerElements.nth(i).isVisible();
    console.log(`Reviewer text ${i}: "${text}" visible=${isVisible}`);
  }

  // Take a screenshot
  await page.screenshot({ path: 'appraisal-create-debug.png', fullPage: true });
  console.log('Screenshot saved as appraisal-create-debug.png');
});
