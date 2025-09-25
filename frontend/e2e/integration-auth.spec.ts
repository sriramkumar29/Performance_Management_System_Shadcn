import { test, expect } from "@playwright/test";

// This test performs a real login against the FastAPI backend and verifies the app loads.
// Prerequisites:
// - Backend running on http://localhost:7001 (test backend)
// - DB seeded with seed_test_data.py (credentials below)
// - Frontend uses VITE_API_BASE_URL=http://localhost:7000

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
  
  // Add console logging for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Browser Error: ${msg.text()}`);
    }
  });
  
  // Add network logging for failed requests (ignore CORS issues on secondary endpoints)
  page.on('response', response => {
    if (!response.ok() && !response.url().includes('/appraisal-types') && !response.url().includes('/appraisals')) {
      console.log(`❌ Failed Request: ${response.status()} ${response.url()}`);
    }
  });
});

const EMAIL = "john.ceo@example.com";
const PASSWORD = "password123";

test.describe("Integration: Auth -> App load", () => {
  test("logs in using backend and shows dashboard", async ({ page }) => {
    console.log("🔍 Starting authentication integration test...");
    
    // Start from login page
    console.log("📱 Navigating to login page...");
    await page.goto("/login");
    
    // Wait for login form to be ready
    await expect(page.getByLabel("Work Email Address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    console.log("✅ Login form is visible");

    // Fill and submit form
    console.log("🔐 Filling login credentials...");
    await page.getByLabel("Work Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);

    console.log("🚀 Submitting login form...");
    await Promise.all([
      page.waitForURL("**/"),
      page.getByRole("button", { name: "Sign In" }).click(),
    ]);

    console.log("✅ Login successful, checking dashboard...");
    // Verify redirected to root and main heading visible
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByTestId("performance-management-title")
    ).toBeVisible();
    console.log("✅ Dashboard loaded successfully");

    // Verify tokens are stored (sessionStorage)
    console.log("🔍 Checking authentication tokens...");
    const hasTokens = await page.evaluate(() => {
      const authToken = sessionStorage.getItem("auth_token");
      const refreshToken = sessionStorage.getItem("refresh_token");
      console.log(`Auth token exists: ${Boolean(authToken)}`);
      console.log(`Refresh token exists: ${Boolean(refreshToken)}`);
      return Boolean(authToken && refreshToken);
    });
    expect(hasTokens).toBeTruthy();
    console.log("✅ Authentication tokens verified");
    
    // Additional verification: Check if user data is available (optional)
    console.log("🔍 Verifying user session data...");
    const userData = await page.evaluate(() => {
      return sessionStorage.getItem("user_data");
    });
    
    // User data might not be stored in sessionStorage, so we'll make this optional
    if (userData) {
      console.log("✅ User session data found in sessionStorage");
    } else {
      console.log("ℹ️ User session data not stored in sessionStorage (tokens are sufficient)");
    }
    
    console.log("🎯 Authentication integration test completed successfully");
  });

  test("handles login with invalid credentials gracefully", async ({ page }) => {
    console.log("🔍 Testing invalid credentials handling...");
    
    await page.goto("/login");
    
    // Fill invalid credentials
    await page.getByLabel("Work Email Address").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    
    // Submit and expect to stay on login page
    await page.getByRole("button", { name: "Sign In" }).click();
    
    // Should stay on login page and show error
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check that no tokens are stored
    const hasTokens = await page.evaluate(() => {
      return Boolean(
        sessionStorage.getItem("auth_token") &&
        sessionStorage.getItem("refresh_token")
      );
    });
    expect(hasTokens).toBeFalsy();
    console.log("✅ Invalid credentials handled correctly");
  });

  test("maintains authentication state after page refresh", async ({ page }) => {
    console.log("🔍 Testing authentication persistence...");
    
    // First login
    await page.goto("/login");
    await page.getByLabel("Work Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    
    await Promise.all([
      page.waitForURL("**/"),
      page.getByRole("button", { name: "Sign In" }).click(),
    ]);
    
    // Verify initial login
    await expect(page.getByTestId("performance-management-title")).toBeVisible();
    
    // Refresh the page
    console.log("🔄 Refreshing page to test persistence...");
    await page.reload();
    
    // Should still be authenticated and on dashboard
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("performance-management-title")).toBeVisible();
    
    // Tokens should still exist
    const hasTokens = await page.evaluate(() => {
      return Boolean(
        sessionStorage.getItem("auth_token") &&
        sessionStorage.getItem("refresh_token")
      );
    });
    expect(hasTokens).toBeTruthy();
    console.log("✅ Authentication state maintained after refresh");
  });
});
