import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('password visibility toggle reveals and masks the typed password', async ({ page }) => {
    await page.goto('/login');

    const passwordField = page.getByRole('textbox', { name: 'Enter your password' });
    await passwordField.fill('SomeSampleValue1!');
    await expect(passwordField).toHaveAttribute('type', 'password');

    // The toggle is a button containing the "visibility_off" Material icon ligature text.
    const toggle = page.locator('button:has-text("visibility_off")');
    await toggle.click();

    await expect(passwordField).toHaveAttribute('type', 'text');
  });
});
