import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('forgot password link navigates to the forgot-password route', async ({ page }) => {
    await page.goto('/login');

    // App copy changed from "Forgot password ?" to "Forgot password?" (space
    // before the "?" removed) between v1.7.1-rc13 and v1.7.1-rc14, confirmed
    // live via the footer version string - a real app content change, not a
    // test bug. See specs/planner.md's Cycle 8 note for detail.
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
