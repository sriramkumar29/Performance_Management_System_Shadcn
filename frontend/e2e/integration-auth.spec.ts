import { test, expect } from "@playwright/test";

// This test performs a real login against the FastAPI backend and verifies the app loads.
// Prerequisites:
// - Backend running on http://localhost:7000
// - DB seeded with seed_data.py (credentials below)
// - Frontend uses VITE_API_BASE_URL=http://localhost:7000

const EMAIL = "john.ceo@example.com";
const PASSWORD = "password123";

test.describe("Integration: Auth -> App load", () => {
  test("logs in using backend and shows dashboard", async ({ page }) => {
    // Start from login page
    await page.goto("/login");

    // Fill and submit form
    await page.getByLabel("Work Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);

    await Promise.all([
      page.waitForURL("**/"),
      page.getByRole("button", { name: "Sign In" }).click(),
    ]);

    // Verify redirected to root and main heading visible
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByTestId("performance-management-title")
    ).toBeVisible();

    // Verify tokens are stored (sessionStorage)
    const hasTokens = await page.evaluate(() => {
      return Boolean(
        sessionStorage.getItem("auth_token") &&
          sessionStorage.getItem("refresh_token")
      );
    });
    expect(hasTokens).toBeTruthy();
  });
});
