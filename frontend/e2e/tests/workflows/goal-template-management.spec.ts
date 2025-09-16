import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/LoginPage';
import { GoalTemplatesPage } from '../../pages/goals/GoalTemplatesPage';
import { AppraisalCreatePage } from '../../pages/appraisals/AppraisalCreatePage';
import { APIHelper } from '../../utils/api-helpers';
import { testUsers, appraisalTemplates } from '../../fixtures/test-data';

test.beforeEach(async ({ page }) => {
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

test.describe('Goal Template Management Workflow', () => {
  let apiHelper: APIHelper;
  let loginPage: LoginPage;
  let templatesPage: GoalTemplatesPage;
  let appraisalPage: AppraisalCreatePage;

  test.beforeEach(async ({ page }) => {
    apiHelper = new APIHelper();
    loginPage = new LoginPage(page);
    templatesPage = new GoalTemplatesPage(page);
    appraisalPage = new AppraisalCreatePage(page);

    // Setup test environment
    await apiHelper.cleanupTestData();
    await apiHelper.createTestUsers();

    // Login as manager (who can create templates)
    await loginPage.goto();
    await loginPage.loginSuccessfully(
      testUsers.manager.email,
      testUsers.manager.password
    );
  });

  test.afterEach(async () => {
    await apiHelper.cleanupTestData();
  });

  test('Manager creates goal template with 100% weightage', async ({ page }) => {
    // Navigate to goal templates
    await templatesPage.goto();

    // Create template with valid weightage
    const template = {
      name: 'Q4 Performance Template',
      goals: [
        {
          temp_title: 'Performance Excellence',
          temp_description: 'Deliver exceptional performance in key areas',
          temp_weightage: 50,
          temp_category: 'performance'
        },
        {
          temp_title: 'Team Leadership',
          temp_description: 'Demonstrate leadership and mentoring capabilities',
          temp_weightage: 30,
          temp_category: 'leadership'
        },
        {
          temp_title: 'Innovation',
          temp_description: 'Drive innovation and process improvements',
          temp_weightage: 20,
          temp_category: 'innovation'
        }
      ]
    };

    await templatesPage.createGoalTemplate(template);

    // Verify template was created successfully
    await templatesPage.validateTemplateWeightage('Q4 Performance Template');
    
    const templateCount = await templatesPage.getTemplateCount();
    expect(templateCount).toBeGreaterThanOrEqual(1);
  });

  test('Employee uses template to create appraisal', async ({ page }) => {
    // First, create a template as manager
    await templatesPage.goto();
    
    const template = {
      name: 'Standard Review Template',
      goals: [
        {
          temp_title: 'Project Delivery',
          temp_description: 'Complete assigned projects successfully',
          temp_weightage: 60,
          temp_category: 'performance'
        },
        {
          temp_title: 'Professional Development',
          temp_description: 'Pursue learning and growth opportunities',
          temp_weightage: 40,
          temp_category: 'development'
        }
      ]
    };

    await templatesPage.createGoalTemplate(template);

    // Switch to employee account
    await loginPage.logout();
    await loginPage.loginSuccessfully(
      testUsers.employee.email,
      testUsers.employee.password
    );

    // Navigate to templates and use the template
    await templatesPage.goto();
    await templatesPage.useTemplate('Standard Review Template');

    // Verify we're on appraisal creation page with template applied
    await expect(page).toHaveURL(/.*appraisals\/create.*/);
    
    // Verify goals from template are loaded
    await expect(page.locator('[data-testid="goal-item"]:has-text("Project Delivery")')).toBeVisible();
    await expect(page.locator('[data-testid="goal-item"]:has-text("Professional Development")')).toBeVisible();
    
    // Verify total weightage is 100%
    const totalWeightage = await appraisalPage.getTotalWeightage();
    expect(totalWeightage).toBe(100);

    // Complete appraisal creation
    await appraisalPage.fillBasicInfo('Appraisal from Template');
    await appraisalPage.submitAppraisal();

    // Verify successful submission
    const status = await appraisalPage.getCurrentStatus();
    expect(status).toBe('submitted');
  });

  test('Template validation prevents invalid weightage', async ({ page }) => {
    await templatesPage.goto();

    // Attempt to create template with invalid weightage (< 100%)
    const invalidTemplate = {
      name: 'Invalid Template',
      goals: [
        {
          temp_title: 'Goal 1',
          temp_description: 'First goal',
          temp_weightage: 30,
          temp_category: 'performance'
        },
        {
          temp_title: 'Goal 2',
          temp_description: 'Second goal',
          temp_weightage: 40,
          temp_category: 'behavior'
        }
      ]
    };

    // Start creating template
    await templatesPage.createTemplateButton.click();
    await templatesPage.templateNameInput.fill(invalidTemplate.name);

    // Add goals
    for (const goal of invalidTemplate.goals) {
      await templatesPage.addGoalToTemplateButton.click();
      await templatesPage.goalTitleInput.fill(goal.temp_title);
      await templatesPage.goalDescriptionInput.fill(goal.temp_description);
      await templatesPage.goalWeightageInput.fill(goal.temp_weightage.toString());
      await templatesPage.goalCategorySelect.selectOption(goal.temp_category);
      await templatesPage.saveGoalToTemplateButton.click();
    }

    // Attempt to save template - should fail validation
    await templatesPage.saveTemplateButton.click();

    // Verify validation error
    await expect(page.locator('[data-testid="template-weightage-error"]')).toContainText(
      'Template goals must total 100%. Current total: 70%'
    );

    // Verify template was not saved
    await expect(templatesPage.templateList.locator('text=Invalid Template')).not.toBeVisible();
  });

  test('Template modification and version control', async ({ page }) => {
    // Create initial template
    await templatesPage.goto();
    
    const originalTemplate = {
      name: 'Evolving Template',
      goals: [
        {
          temp_title: 'Core Performance',
          temp_description: 'Basic performance metrics',
          temp_weightage: 100,
          temp_category: 'performance'
        }
      ]
    };

    await templatesPage.createGoalTemplate(originalTemplate);

    // Edit template to add more goals
    const templateItem = templatesPage.templateList.locator('[data-testid="template-item"]:has-text("Evolving Template")');
    await templateItem.locator('[data-testid="edit-template"]').click();

    // Modify existing goal weightage and add new goal
    await page.locator('[data-testid="template-goal-0-weightage"]').fill('60');
    
    await templatesPage.addGoalToTemplateButton.click();
    await templatesPage.goalTitleInput.fill('Collaboration Skills');
    await templatesPage.goalDescriptionInput.fill('Work effectively with team members');
    await templatesPage.goalWeightageInput.fill('40');
    await templatesPage.goalCategorySelect.selectOption('behavior');
    await templatesPage.saveGoalToTemplateButton.click();

    // Save updated template
    await templatesPage.saveTemplateButton.click();

    // Verify template still validates to 100%
    await templatesPage.validateTemplateWeightage('Evolving Template');

    // Verify updated template can be used
    await templatesPage.useTemplate('Evolving Template');
    await expect(page).toHaveURL(/.*appraisals\/create.*/);
    
    const goalCount = await appraisalPage.getGoalCount();
    expect(goalCount).toBe(2);
  });

  test('Performance: Template management operations under 2s', async ({ page }) => {
    await templatesPage.goto();

    // Test template creation performance
    const createStartTime = Date.now();
    
    const quickTemplate = {
      name: 'Performance Test Template',
      goals: [
        {
          temp_title: 'Quick Goal',
          temp_description: 'Performance testing goal',
          temp_weightage: 100,
          temp_category: 'performance'
        }
      ]
    };

    await templatesPage.createGoalTemplate(quickTemplate);
    
    const createTime = Date.now() - createStartTime;
    expect(createTime).toBeLessThan(2000); // <2s target

    // Test template usage performance
    const useStartTime = Date.now();
    await templatesPage.useTemplate('Performance Test Template');
    
    const useTime = Date.now() - useStartTime;
    expect(useTime).toBeLessThan(2000); // <2s target
  });
});
