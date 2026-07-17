import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('User Menu, Settings, and Language', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('FR/EN toggle switches visible labels and reverts cleanly', async ({ page }) => {
    await page.getByRole('radio', { name: 'FR' }).click();
    await expect(page.getByRole('button', { name: 'Tableau de bord' })).toBeVisible();

    await page.getByRole('radio', { name: 'EN' }).click();
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
  });
});
