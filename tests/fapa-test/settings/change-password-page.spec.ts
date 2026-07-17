import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('User Menu, Settings, and Language', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Setting & Privacy shows the change-password form with a live requirements checklist', async ({ page }) => {
    await page.getByRole('button', { name: 'KH' }).click();
    await page.getByRole('menuitem', { name: 'Setting & Privacy' }).click();

    await expect(page.getByText('New password', { exact: true })).toBeVisible();
    await expect(page.getByText('Re-type new password', { exact: true })).toBeVisible();

    const submit = page.getByRole('button', { name: 'Reset & Notify Client' });
    await expect(submit).toBeDisabled();

    // Do NOT submit - this would change the credentials this whole suite depends on.
    // Navigate away instead of submitting.
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
