import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('submitting the login form empty shows required-field validation', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
