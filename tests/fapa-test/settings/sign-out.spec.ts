import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('User Menu, Settings, and Language', () => {
  test('Sign Out ends the session and protects routes afterward', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'KH' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
