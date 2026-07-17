import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Markets - Currency', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();
    await page.getByRole('tab', { name: 'Currency' }).click();
  });

  test('currency table, search, and Add Currency dialog (cancel only)', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add Currency' })).toBeVisible();

    await page.getByPlaceholder('Search currency...').fill('EUR');

    await page.getByRole('button', { name: 'Add Currency' }).click();
    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();

    // Do NOT submit - this would create a real currency-rate record.
    await dialog.getByRole('button', { name: /cancel|close/i }).first().click();
    await expect(dialog).toBeHidden();
  });
});
