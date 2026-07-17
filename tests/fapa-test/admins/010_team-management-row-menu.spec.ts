import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Admins - Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
  });

  test('row action menu opens and can be dismissed without changing data', async ({ page }) => {
    await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();

    await expect(page.getByRole('menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
  });
});
