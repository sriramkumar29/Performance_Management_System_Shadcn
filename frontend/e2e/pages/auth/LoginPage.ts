import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('.text-destructive');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    
    // Wait for navigation or error
    await Promise.race([
      this.page.waitForURL('/'),
      this.errorMessage.waitFor({ state: 'visible' })
    ]);
  }

  async loginSuccessfully(email: string, password: string) {
    await this.login(email, password);
    
    // Verify successful login by checking root URL
    await expect(this.page).toHaveURL('/');
    
    // Verify user is logged in by checking for the main app content
    await expect(this.page.locator('[data-testid="performance-management-title"]')).toBeVisible();
  }

  async loginWithInvalidCredentials(email: string, password: string) {
    await this.login(email, password);
    
    // Verify error message is displayed
    await expect(this.errorMessage).toBeVisible();
    
    // Verify still on login page
    await expect(this.page).toHaveURL('/login');
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="performance-management-title"]').waitFor({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    // Click the user menu (DropdownMenuTrigger button)
    await this.page.locator('button').filter({ hasText: /user/i }).or(
      this.page.locator('button').filter({ has: this.page.locator('[role="img"]') })
    ).first().click();
    
    // Click logout option
    await this.page.locator('text=Sign out').click();
    
    // Verify redirected to login page
    await expect(this.page).toHaveURL('/login');
  }
}
