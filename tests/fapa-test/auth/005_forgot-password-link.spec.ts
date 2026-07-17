import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('forgot password link navigates to the forgot-password route', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Forgot password ?' }).click();

    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
