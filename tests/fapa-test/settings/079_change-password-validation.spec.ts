import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * settings/029_change-password-page.spec.ts only verifies the disabled-by-
 * default button and navigating away without entering anything - no test
 * actually types a password that fails validation, to confirm the button
 * genuinely stays disabled (rather than being disabled only by coincidence
 * of being empty).
 *
 * Confirmed live 2026-07-24: a mismatched New/Re-type pair keeps the submit
 * button disabled with no inline "passwords don't match" text anywhere on
 * the page - the only feedback is the button staying disabled. Documented
 * as-is (silent disable, not a bug) rather than asserting an error message
 * that doesn't exist.
 */
test.describe('Settings - Change Password validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'KH' }).click();
    await page.getByRole('menuitem', { name: 'Setting & Privacy' }).click();
  });

  test('mismatched New/Re-type password keeps the submit button disabled', async ({ page }) => {
    const submit = page.getByRole('button', { name: 'Reset & Notify Client' });
    await expect(submit).toBeDisabled();

    await page.getByRole('textbox', { name: 'Enter new password' }).fill('ValidPass123!');
    await page.getByRole('textbox', { name: 'Enter confirm password' }).fill('DifferentPass456!');

    await expect(submit).toBeDisabled();

    // Do NOT submit - navigate away instead, same as 029.
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('a password failing the live requirements checklist keeps the submit button disabled', async ({ page }) => {
    const submit = page.getByRole('button', { name: 'Reset & Notify Client' });

    // Fails every rule except length: no uppercase, no number, no special char.
    await page.getByRole('textbox', { name: 'Enter new password' }).fill('alllowercase');
    await page.getByRole('textbox', { name: 'Enter confirm password' }).fill('alllowercase');

    await expect(submit).toBeDisabled();

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
