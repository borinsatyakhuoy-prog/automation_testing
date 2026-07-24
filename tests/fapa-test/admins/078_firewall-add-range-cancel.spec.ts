import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * admins/013_firewall-configuration.spec.ts only checks the table/empty
 * state - the "Add Range" dialog itself (open / required-field validation /
 * cancel) was never exercised, unlike Add User/Add Client/Add Currency
 * which all have a dedicated cancel test.
 */
test.describe('Admins - Firewall Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await page.getByRole('button', { name: 'Firewall Configuration' }).click();
  });

  test('Add Range dialog requires Start/End IP and can be cancelled without submitting', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Range' }).click();

    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Label IP' })).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Start IP' })).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'End IP' })).toBeVisible();

    const addButton = dialog.getByRole('button', { name: 'Add', exact: true });
    await expect(addButton).toBeDisabled();

    // Do NOT submit - this would add a real firewall allow-list entry.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
