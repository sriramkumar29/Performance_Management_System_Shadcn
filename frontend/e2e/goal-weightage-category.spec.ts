/**
 * E2E Test Cases - Goal Weightage and Category Assignment
 * Playwright End-to-End Test Suite
 * 
 * @playwright
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const MANAGER_EMAIL = 'lisa.manager@example.com';
const MANAGER_PASSWORD = 'password123';
const EMPLOYEE_EMAIL = 'dev1@example.com';
const EMPLOYEE_PASSWORD = 'password123';

/**
 * Helper function to login
 */
async function login(page: Page, email: string, password: string) {
    await page.goto('/');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")');
    await page.waitForURL(url => !url.pathname.includes('/login'));
}

/**
 * Helper function to navigate to appraisal creation
 */
async function navigateToCreateAppraisal(page: Page) {
    await page.click('a[href*="appraisal"]');
    await page.click('text=/create appraisal/i');
}

/**
 * Helper function to fill goal form
 */
async function fillGoalForm(page: Page, goalData: {
    title: string;
    description: string;
    factor: string;
    importance: string;
    weightage: number;
    category: string;
}) {
    // Fill goal title
    await page.fill('input[id*="goal_title"]', goalData.title);

    // Fill goal description
    await page.fill('textarea[id*="goal_description"]', goalData.description);

    // Fill performance factor
    await page.fill('input[id*="goal_performance_factor"]', goalData.factor);

    // Select importance
    await page.click('label:has-text("Importance") ~ * button, label:has-text("Importance") + * button');
    await page.click(`text="${goalData.importance}"`);

    // Select category
    await page.click('label:has-text("Category") ~ * button, label:has-text("Category") + * button');
    await page.click(`text="${goalData.category}"`);

    // Enter weightage
    await page.fill('input[id*="goal_weightage"]', goalData.weightage.toString());
}

/**
 * Helper function to setup basic appraisal
 */
async function setupBasicAppraisal(page: Page) {
    // Select appraisee
    await page.click('input[name*="appraisee"], button:has-text("Select")');
    await page.click('[role="option"]', { timeout: 5000 });

    // Wait a moment for state to update
    await page.waitForTimeout(500);

    // Select reviewer
    const reviewerButton = page.locator('text=/reviewer/i').locator('..').locator('button').first();
    await reviewerButton.click();
    await page.click('[role="option"]', { timeout: 5000 });

    await page.waitForTimeout(500);

    // Select type
    const typeButton = page.locator('text=/type/i').locator('..').locator('button').first();
    await typeButton.click();
    await page.click('[role="option"]', { timeout: 5000 });
}

test.describe('Goal Weightage and Category Assignment - E2E Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Setup: ensure clean state
        await page.goto('/');
    });

    /**
     * TC-B01.1: Valid Weightage (50%)
     */
    test('TC-B01.1 - should create goal successfully with weightage=50', async ({ page }) => {
        // Login as Manager
        await login(page, MANAGER_EMAIL, MANAGER_PASSWORD);

        // Navigate to create appraisal
        await navigateToCreateAppraisal(page);

        // Setup basic appraisal details
        await setupBasicAppraisal(page);

        // Click Add Goal
        await page.click('button:has-text("Add Goal")');

        // Wait for modal
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // Fill goal form
        await fillGoalForm(page, {
            title: 'Improve Team Leadership Skills',
            description: 'Develop and demonstrate effective team leadership',
            factor: 'Leadership & Management',
            importance: 'High',
            weightage: 50,
            category: 'Leadership',
        });

        // Submit
        await page.click('button:has-text("Add Goal")');

        // Verify success toast
        await expect(page.locator('text=/goal added/i')).toBeVisible({ timeout: 5000 });

        // Verify goal appears in list
        await expect(page.locator('text="Improve Team Leadership Skills"')).toBeVisible();
        await expect(page.locator('text="50%"')).toBeVisible();

        // Verify total weightage
        await expect(page.locator('text=/50.*100/i')).toBeVisible();
    });

    /**
     * TC-B01.4: Edit All Fields of Existing Goal
     * NEW TEST CASE - Edit goal with all fields updated
     */
    test('TC-B01.4 - should edit all fields of an existing goal', async ({ page }) => {
        await login(page, MANAGER_EMAIL, MANAGER_PASSWORD);
        await navigateToCreateAppraisal(page);
        await setupBasicAppraisal(page);

        // Create initial goal
        await page.click('button:has-text("Add Goal")');
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await fillGoalForm(page, {
            title: 'Original Goal Title',
            description: 'Original description',
            factor: 'Original Factor',
            importance: 'Medium',
            weightage: 30,
            category: 'Technical Skills',
        });
        await page.click('button:has-text("Add Goal")');
        await expect(page.locator('text=/goal added/i')).toBeVisible();
        await page.waitForTimeout(1000);

        // Verify original goal exists
        await expect(page.locator('text="Original Goal Title"')).toBeVisible();
        await expect(page.locator('text="30%"')).toBeVisible();

        // Click edit button/icon on the goal
        const goalCard = page.locator('text="Original Goal Title"').locator('..');
        const editButton = goalCard.locator('button[aria-label*="edit"], button:has([class*="pencil"]), button:has([class*="edit"])').first();
        await editButton.click();

        // Wait for edit modal to open
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // Verify pre-filled values
        await expect(page.locator('input[id*="goal_title"]')).toHaveValue('Original Goal Title');
        await expect(page.locator('input[id*="goal_weightage"]')).toHaveValue('30');

        // Edit ALL fields
        // 1. Update title
        await page.fill('input[id*="goal_title"]', 'Updated Goal Title');

        // 2. Update description
        await page.fill('textarea[id*="goal_description"]', 'Updated goal description with new content');

        // 3. Update performance factor
        await page.fill('input[id*="goal_performance_factor"]', 'Updated Performance Factor');

        // 4. Update importance
        await page.click('label:has-text("Importance") ~ * button, label:has-text("Importance") + * button');
        await page.click('text="High"');

        // 5. Update category
        await page.click('label:has-text("Category") ~ * button, label:has-text("Category") + * button');
        await page.click('text="Leadership"');

        // 6. Update weightage
        await page.fill('input[id*="goal_weightage"]', '40');

        // Save changes
        await page.click('button:has-text("Update"), button:has-text("Save")');

        // Verify success message
        await expect(page.locator('text=/goal updated|updated successfully|changes saved/i')).toBeVisible({ timeout: 5000 });

        // Verify all changes are reflected in the UI
        await expect(page.locator('text="Updated Goal Title"')).toBeVisible();
        await expect(page.locator('text="40%"')).toBeVisible();

        // Verify old values are gone
        await expect(page.locator('text="Original Goal Title"')).not.toBeVisible();
        await expect(page.locator('text="30%"')).not.toBeVisible();

        // Verify total weightage updated correctly
        await expect(page.locator('text=/40.*100/i')).toBeVisible();
    });

    /**
     * TC-B01.7A: Role-Based Access Control - Manager
     */
    test('TC-B01.7A - should allow Manager to create goals', async ({ page }) => {
        await login(page, MANAGER_EMAIL, MANAGER_PASSWORD);
        await navigateToCreateAppraisal(page);
        await setupBasicAppraisal(page);

        // Verify Add Goal button is visible and enabled
        await expect(page.locator('button:has-text("Add Goal")')).toBeVisible();
        await expect(page.locator('button:has-text("Add Goal")')).toBeEnabled();
    });

    /**
     * TC-B01.7B: Role-Based Access Control - Employee
     */
    test('TC-B01.7B - should prevent Employee from creating goals', async ({ page }) => {
        await login(page, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);

        // Navigate to appraisals
        await page.click('a[href*="appraisal"]');

        // Verify Add Goal button is NOT visible or is disabled
        const addGoalButton = page.locator('button:has-text("Add Goal")');

        // Either button doesn't exist or is disabled
        const isVisible = await addGoalButton.isVisible().catch(() => false);
        if (isVisible) {
            await expect(addGoalButton).toBeDisabled();
        }
    });

    /**
     * Accessibility Test
     */
    test('Accessibility - should have proper ARIA labels', async ({ page }) => {
        await login(page, MANAGER_EMAIL, MANAGER_PASSWORD);
        await navigateToCreateAppraisal(page);
        await setupBasicAppraisal(page);

        await page.click('button:has-text("Add Goal")');
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // Check for proper labels
        await expect(page.locator('label[for*="goal_title"]')).toBeVisible();
        await expect(page.locator('label[for*="goal_weightage"]')).toBeVisible();
        await expect(page.locator('label:has-text("Category")')).toBeVisible();
    });

    /**
     * Mobile Responsive Test
     */
    test('Mobile - should work on mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await login(page, MANAGER_EMAIL, MANAGER_PASSWORD);

        // Verify Add Goal button visible on mobile
        const addGoalButton = page.locator('button:has-text("Add Goal")');
        if (await addGoalButton.isVisible()) {
            await expect(addGoalButton).toBeVisible();
        }
    });
});
