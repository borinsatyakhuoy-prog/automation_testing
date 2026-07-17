import { test, expect } from '@playwright/test';
import { requireCredentials } from '../helpers/auth';

test.describe('Authentication', () => {
  test('successful login with valid credentials redirects to dashboard', async ({ page }) => {
    const { email, password } = requireCredentials();

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Connection' }).or(page.getByText('Connection'))).toBeVisible();

    await page.getByRole('textbox', { name: 'Enter your email' }).fill(email);
    await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Recently Consulted Reports')).toBeVisible();
  });
});
