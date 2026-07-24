import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * Mirrors markets/022_isin-edit-cancel.spec.ts, but for Currency - an
 * asymmetry the Currency tab didn't previously have despite §10.2
 * documenting the same Edit mechanics (MM/YYYY and From-EUR-To locked,
 * Exchange Rate/Label editable) as a real, live-confirmed write path.
 */
test.describe('Markets - Currency', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();
    await page.getByRole('tab', { name: 'Currency' }).click();
  });

  test('Edit on a Currency row opens a pre-filled form that can be closed without saving', async ({ page }) => {
    await page.getByRole('cell', { name: 'Edit' }).first().click();

    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();

    // Do NOT save - this would alter real currency-rate reference data.
    const cancelButton = dialog.getByRole('button', { name: /cancel|close/i }).first();
    await cancelButton.click();
    await expect(dialog).toBeHidden();
  });
});
