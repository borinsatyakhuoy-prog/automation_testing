import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Top Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('all top navigation buttons route to their respective sections', async ({ page }) => {
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: 'Admins' }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('button', { name: 'Team Management' })).toBeVisible();

    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);

    await page.getByRole('button', { name: 'Markets' }).click();
    await expect(page).toHaveURL(/\/isin/);
    await expect(page.getByRole('tab', { name: 'ISIN' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Currency' })).toBeVisible();

    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page).toHaveURL(/\/datas/);

    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports/);
  });
});
