import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('row kebab menu offers View detail / Edit / Reset password / Consult, and View detail navigates', async ({ page }) => {
    await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();

    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'View detail' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Reset password' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Consult' })).toBeVisible();

    await menu.getByRole('menuitem', { name: 'View detail' }).click();

    await expect(page.getByText('Client Information')).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/clients/);
  });
});
