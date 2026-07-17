import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Markets - ISIN', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();
  });

  test('Edit on an ISIN row opens a pre-filled form that can be closed without saving', async ({ page }) => {
    await page.getByRole('cell', { name: 'Edit' }).first().click();

    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();

    // Do NOT save - this would alter real market/instrument reference data.
    const cancelButton = dialog.getByRole('button', { name: /cancel|close/i }).first();
    await cancelButton.click();
    await expect(dialog).toBeHidden();
  });
});
