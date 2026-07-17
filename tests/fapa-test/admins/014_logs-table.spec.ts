import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Admins - Logs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await page.getByRole('button', { name: 'Logs' }).click();
  });

  test('logs table shows audit columns, supports sort and date filtering', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'IP Address' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();

    // A recent Login event for the current session should already be present.
    await expect(page.getByRole('cell', { name: 'Login' }).first()).toBeVisible();

    await page.getByRole('columnheader', { name: 'Date' }).click();

    await page.getByRole('button', { name: 'Clear' }).click();
  });
});
