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
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
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
      this.page.waitForURL('/dashboard'),
      this.errorMessage.waitFor({ state: 'visible' })
    ]);
  }

  async loginSuccessfully(email: string, password: string) {
    await this.login(email, password);
    
    // Verify successful login by checking dashboard URL
    await expect(this.page).toHaveURL('/dashboard');
    
    // Verify user is logged in by checking for logout button or user menu
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
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
      await this.page.locator('[data-testid="user-menu"]').waitFor({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    // Click user menu
    await this.page.locator('[data-testid="user-menu"]').click();
    
    // Click logout option
    await this.page.locator('[data-testid="logout-button"]').click();
    
    // Verify redirected to login page
    await expect(this.page).toHaveURL('/login');
  }
}
