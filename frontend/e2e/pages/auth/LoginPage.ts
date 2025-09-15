import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/Work Email Address/i);
    this.passwordInput = page.getByLabel(/Password/i);
    this.loginButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.locator('.text-destructive');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
  }

  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
    // Ensure login form is ready
    // If already authenticated, the app may redirect to '/'; in that case, skip form checks
    const onDashboard = await this.isLoggedIn();
    if (!onDashboard) {
      await expect(this.emailInput).toBeVisible();
      await expect(this.passwordInput).toBeVisible();
      await expect(this.loginButton).toBeVisible();
    }
  }

  async login(email: string, password: string) {
    // Ensure form is ready in case login() is called directly
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // Click the login button and wait for either success or error
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/employees/login") && resp.status() !== 404,
        { timeout: 30000 }
      ),
      this.loginButton.click(),
    ]);

    if (response.ok()) {
      // Login was successful, wait for navigation
      await this.page.waitForURL("/", { timeout: 15000 });
    } else {
      // Login failed, wait for error message
      await this.errorMessage.waitFor({ state: "visible", timeout: 10000 });
    }
  }

  async loginSuccessfully(email: string, password: string) {
    // If already logged in (e.g., sessionStorage persisted), skip entering credentials
    if (!(await this.isLoggedIn())) {
      await this.login(email, password);
    }

    // Wait for the page to fully load
    await this.page.waitForLoadState("networkidle", { timeout: 10000 });

    // Verify we're on the root URL
    await expect(this.page).toHaveURL("/", { timeout: 5000 });

    // Verify user is logged in by checking for the main app content
    await expect(
      this.page.locator('[data-testid="performance-management-title"]')
    ).toBeVisible({ timeout: 10000 });
  }

  async loginWithInvalidCredentials(email: string, password: string) {
    await this.login(email, password);

    // Verify error message is displayed
    await expect(this.errorMessage).toBeVisible();

    // Verify still on login page
    await expect(this.page).toHaveURL("/login");
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page
        .locator('[data-testid="performance-management-title"]')
        .waitFor({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    // Click the user menu (DropdownMenuTrigger button)
    await this.page
      .locator("button")
      .filter({ hasText: /user/i })
      .or(
        this.page
          .locator("button")
          .filter({ has: this.page.locator('[role="img"]') })
      )
      .first()
      .click();

    // Click logout option
    await this.page.locator("text=Sign out").click();

    // Verify redirected to login page
    await expect(this.page).toHaveURL("/login");
  }
}
