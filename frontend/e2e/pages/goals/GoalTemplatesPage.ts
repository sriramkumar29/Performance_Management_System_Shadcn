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
  openCreateTemplate() {
    throw new Error('Method not implemented.');
  }
  saveTemplateAndReturnToList() {
    throw new Error('Method not implemented.');
  }
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
    // Click create template button which navigates to /goal-templates/new
    await this.createTemplateButton.click();
    
    // Wait for navigation to the create template page
    await this.page.waitForURL('**/goal-templates/new');
    
    // Fill in template name
    await this.templateNameInput.fill(template.name);

    // For now, since we don't have individual goal creation UI elements on the edit page,
    // we'll just fill the basic template info and save
    // The tests will need to be updated to match the actual workflow
    
    // Save the template
    await this.saveTemplateButton.click();
    
    // Wait for navigation back to templates list
    await this.page.waitForURL('**/goal-templates');
    
    // Verify template was created by checking if it appears in the list
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
