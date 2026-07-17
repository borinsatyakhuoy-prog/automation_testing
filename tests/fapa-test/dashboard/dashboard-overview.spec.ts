import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard shows allocation charts and recently consulted reports', async ({ page }) => {
    await expect(page.getByText('Allocation excluding liabilities')).toBeVisible();
    await expect(page.getByText('Allocation by depository bank excluding liabilities')).toBeVisible();

    const firstReport = page.getByRole('listitem').first();
    await expect(firstReport).toBeVisible();
    await firstReport.click();

    // Clicking a recent report navigates toward the Reports view without an error page.
    await expect(page).toHaveURL(/\/reports/);
  });
});
