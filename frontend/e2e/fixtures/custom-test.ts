import { test as base, expect } from '@playwright/test';

// Custom test fixture that ensures all requests in tests target the TEST backend (port 7001)
// and prevents accidental calls to port 7000 that would trigger CORS.
// Normal development (manual usage) remains on 7000 via Vite proxy.

export const test = base.extend({
  page: async ({ page }, use) => {
    // Force the frontend to talk to the test backend directly
    await page.addInitScript((value) => {
      // @ts-ignore
      (window as any).__API_BASE_URL__ = value;
    }, 'http://localhost:7001');

    // Safety net: redirect any accidental 7000 calls to 7001
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const redirectedUrl = url.replace('localhost:7000', 'localhost:7001');
      if (url !== redirectedUrl) {
        console.log(`🔀 API ROUTE (fixture): ${url} → ${redirectedUrl}`);
      }
      await route.continue({ url: redirectedUrl });
    });

    await use(page);
  }
});

export { expect };
