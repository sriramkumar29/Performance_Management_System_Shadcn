import { Page, Locator, expect } from '@playwright/test';

interface GoalData {
  title: string;
  description: string;
  weightage: number;
  category: string;
}

interface AppraisalData {
  title: string;
  description?: string;
  goals: GoalData[];
}

export class AppraisalCreatePage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly addGoalButton: Locator;
  readonly submitButton: Locator;
  readonly saveDraftButton: Locator;
  readonly weightageError: Locator;
  readonly statusIndicator: Locator;

  // Goal form elements
  readonly goalTitleInput: Locator;
  readonly goalDescriptionInput: Locator;
  readonly goalWeightageInput: Locator;
  readonly goalCategorySelect: Locator;
  readonly saveGoalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('[data-testid="appraisal-title"]');
    this.descriptionInput = page.locator('[data-testid="appraisal-description"]');
    this.addGoalButton = page.locator('[data-testid="add-goal-button"]');
    this.submitButton = page.locator('[data-testid="submit-appraisal"]');
    this.saveDraftButton = page.locator('[data-testid="save-draft"]');
    this.weightageError = page.locator('[data-testid="weightage-error"]');
    this.statusIndicator = page.locator('[data-testid="appraisal-status"]');

    // Goal form elements
    this.goalTitleInput = page.locator('[data-testid="goal-title"]');
    this.goalDescriptionInput = page.locator('[data-testid="goal-description"]');
    this.goalWeightageInput = page.locator('[data-testid="goal-weightage"]');
    this.goalCategorySelect = page.locator('[data-testid="goal-category"]');
    this.saveGoalButton = page.locator('[data-testid="save-goal"]');
  }

  async goto() {
    await this.page.goto('/appraisals/create');
    await this.page.waitForLoadState('networkidle');
  }

  async fillBasicInfo(title: string, description?: string) {
    await this.titleInput.fill(title);
    if (description) {
      await this.descriptionInput.fill(description);
    }
  }

  async addGoal(goal: GoalData) {
    await this.addGoalButton.click();
    
    // Fill goal form
    await this.goalTitleInput.fill(goal.title);
    await this.goalDescriptionInput.fill(goal.description);
    await this.goalWeightageInput.fill(goal.weightage.toString());
    await this.goalCategorySelect.selectOption(goal.category);
    
    await this.saveGoalButton.click();
    
    // Wait for goal to be added to the list
    await this.page.locator(`[data-testid="goal-item"]:has-text("${goal.title}")`).waitFor();
  }

  /**
   * Create appraisal with goals ensuring 100% weightage validation
   * Based on Phase 2 business rule discovery
   */
  async createAppraisalWithGoals(appraisalData: AppraisalData) {
    // Validate total weightage = 100% (Phase 2 discovery)
    const totalWeightage = appraisalData.goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if (totalWeightage !== 100) {
      throw new Error(`Goal weightage must total 100%, got ${totalWeightage}%`);
    }

    await this.fillBasicInfo(appraisalData.title, appraisalData.description);
    
    for (const goal of appraisalData.goals) {
      await this.addGoal(goal);
    }

    // Verify weightage total shows 100%
    await expect(this.page.locator('[data-testid="total-weightage"]')).toContainText('100%');
  }

  async submitAppraisal() {
    await this.submitButton.click();
    
    // Wait for status transition to 'submitted'
    await expect(this.statusIndicator).toContainText('submitted');
  }

  async saveDraft() {
    await this.saveDraftButton.click();
    
    // Wait for status to show 'draft'
    await expect(this.statusIndicator).toContainText('draft');
  }

  /**
   * Attempt submission with invalid weightage to test validation
   */
  async attemptSubmissionWithInvalidWeightage() {
    await this.submitButton.click();
    
    // Should show validation error
    await expect(this.weightageError).toBeVisible();
    await expect(this.weightageError).toContainText('Goal weightage must total 100%');
    
    // Should remain in draft status
    await expect(this.statusIndicator).toContainText('draft');
  }

  /**
   * Transition appraisal status using validated workflow sequence
   * Based on Phase 2 discovery: draft → submitted → appraisee_self_assessment → appraiser_evaluation → reviewer_evaluation → complete
   */
  async transitionStatus(fromStatus: string, toStatus: string) {
    const validTransitions = {
      'draft': ['submitted'],
      'submitted': ['appraisee_self_assessment'],
      'appraisee_self_assessment': ['appraiser_evaluation'],
      'appraiser_evaluation': ['reviewer_evaluation'],
      'reviewer_evaluation': ['complete']
    };
    
    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      throw new Error(`Invalid status transition: ${fromStatus} → ${toStatus}`);
    }
    
    await this.page.locator(`[data-testid="status-transition-${toStatus}"]`).click();
    
    // Wait for status to update
    await expect(this.statusIndicator).toContainText(toStatus);
  }

  async getCurrentStatus(): Promise<string> {
    return await this.statusIndicator.textContent() || '';
  }

  async getTotalWeightage(): Promise<number> {
    const weightageText = await this.page.locator('[data-testid="total-weightage"]').textContent();
    return parseInt(weightageText?.replace('%', '') || '0');
  }

  async getGoalCount(): Promise<number> {
    const goalItems = this.page.locator('[data-testid="goal-item"]');
    return await goalItems.count();
  }

  async deleteGoal(goalTitle: string) {
    const goalItem = this.page.locator(`[data-testid="goal-item"]:has-text("${goalTitle}")`);
    await goalItem.locator('[data-testid="delete-goal"]').click();
    
    // Confirm deletion
    await this.page.locator('[data-testid="confirm-delete"]').click();
    
    // Wait for goal to be removed
    await expect(goalItem).not.toBeVisible();
  }

  async editGoal(oldTitle: string, newGoalData: GoalData) {
    const goalItem = this.page.locator(`[data-testid="goal-item"]:has-text("${oldTitle}")`);
    await goalItem.locator('[data-testid="edit-goal"]').click();
    
    // Update goal form
    await this.goalTitleInput.fill(newGoalData.title);
    await this.goalDescriptionInput.fill(newGoalData.description);
    await this.goalWeightageInput.fill(newGoalData.weightage.toString());
    await this.goalCategorySelect.selectOption(newGoalData.category);
    
    await this.saveGoalButton.click();
    
    // Wait for updated goal to appear
    await this.page.locator(`[data-testid="goal-item"]:has-text("${newGoalData.title}")`).waitFor();
  }
}

export { type GoalData, type AppraisalData };
