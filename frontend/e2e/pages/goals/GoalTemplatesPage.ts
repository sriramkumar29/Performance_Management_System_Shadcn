import { Page, Locator, expect } from '@playwright/test';

interface GoalTemplate {
  name: string;
  goals: Array<{
    temp_title: string;
    temp_description: string;
    temp_weightage: number;
    temp_category: string;
  }>;
}

export class GoalTemplatesPage {
  readonly page: Page;
  readonly createTemplateButton: Locator;
  readonly templateNameInput: Locator;
  readonly addGoalToTemplateButton: Locator;
  readonly saveTemplateButton: Locator;
  readonly useTemplateButton: Locator;
  readonly templateList: Locator;

  // Goal template form elements
  readonly goalTitleInput: Locator;
  readonly goalDescriptionInput: Locator;
  readonly goalWeightageInput: Locator;
  readonly goalCategorySelect: Locator;
  readonly saveGoalToTemplateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createTemplateButton = page.locator('[data-testid="create-template"]');
    this.templateNameInput = page.locator('[data-testid="template-name"]');
    this.addGoalToTemplateButton = page.locator('[data-testid="add-goal-to-template"]');
    this.saveTemplateButton = page.locator('[data-testid="save-template"]');
    this.useTemplateButton = page.locator('[data-testid="use-template"]');
    this.templateList = page.locator('[data-testid="template-list"]');

    // Goal template form elements
    this.goalTitleInput = page.locator('[data-testid="template-goal-title"]');
    this.goalDescriptionInput = page.locator('[data-testid="template-goal-description"]');
    this.goalWeightageInput = page.locator('[data-testid="template-goal-weightage"]');
    this.goalCategorySelect = page.locator('[data-testid="template-goal-category"]');
    this.saveGoalToTemplateButton = page.locator('[data-testid="save-goal-to-template"]');
  }

  async goto() {
    await this.page.goto('/goal-templates');
    await this.page.waitForLoadState('networkidle');
  }

  async createGoalTemplate(template: GoalTemplate) {
    await this.createTemplateButton.click();
    await this.templateNameInput.fill(template.name);

    // Add goals to template - using temp_ prefixed fields from Phase 2 discovery
    for (const goal of template.goals) {
      await this.addGoalToTemplateButton.click();
      
      await this.goalTitleInput.fill(goal.temp_title);
      await this.goalDescriptionInput.fill(goal.temp_description);
      await this.goalWeightageInput.fill(goal.temp_weightage.toString());
      await this.goalCategorySelect.selectOption(goal.temp_category);
      
      await this.saveGoalToTemplateButton.click();
    }

    await this.saveTemplateButton.click();
    
    // Verify template was created
    await expect(this.templateList.locator(`text=${template.name}`)).toBeVisible();
  }

  async useTemplate(templateName: string) {
    const templateItem = this.templateList.locator(`[data-testid="template-item"]:has-text("${templateName}")`);
    await templateItem.locator('[data-testid="use-template"]').click();
    
    // Wait for navigation to appraisal creation with template applied
    await this.page.waitForURL('**/appraisals/create**');
  }

  async validateTemplateWeightage(templateName: string) {
    const templateItem = this.templateList.locator(`[data-testid="template-item"]:has-text("${templateName}")`);
    
    // Verify template shows 100% weightage indicator
    await expect(templateItem.locator('[data-testid="template-weightage"]')).toContainText('100%');
  }

  async deleteTemplate(templateName: string) {
    const templateItem = this.templateList.locator(`[data-testid="template-item"]:has-text("${templateName}")`);
    await templateItem.locator('[data-testid="delete-template"]').click();
    
    // Confirm deletion
    await this.page.locator('[data-testid="confirm-delete-template"]').click();
    
    // Verify template is removed
    await expect(templateItem).not.toBeVisible();
  }

  async getTemplateCount(): Promise<number> {
    const templates = this.templateList.locator('[data-testid="template-item"]');
    return await templates.count();
  }
}

export { type GoalTemplate };
