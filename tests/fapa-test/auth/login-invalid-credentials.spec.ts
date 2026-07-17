import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login fails with invalid credentials and shows an error', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: 'Enter your email' }).fill('not-a-real-account@example.com');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Stays on /login rather than reaching the dashboard.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/log in fail/i)).toBeVisible();
  });
});
