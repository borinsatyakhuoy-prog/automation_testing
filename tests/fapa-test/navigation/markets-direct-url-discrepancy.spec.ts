import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Top Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('direct URL to /markets does not resolve, but the nav button reaches /isin', async ({ page }) => {
    // Known discrepancy: /markets is not the real route for the Markets section.
    await page.goto('/markets');
    await expect(page).not.toHaveURL(/\/isin/);

    await page.getByRole('button', { name: 'Markets' }).click();
    await expect(page).toHaveURL(/\/isin/);
    await expect(page.getByRole('tab', { name: 'ISIN' })).toBeVisible();
  });
});
