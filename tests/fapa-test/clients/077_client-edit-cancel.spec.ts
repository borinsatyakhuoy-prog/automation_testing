import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * clients/018_client-view-detail.spec.ts covers View detail only; AC3 lists
 * Edit as one of the four row-menu actions (View detail / Edit / Reset
 * password / Consult), and Markets/Admins both have an Edit-cancel
 * precedent this area was missing.
 */
test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('Edit client dialog opens pre-filled with the existing record and can be cancelled without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Edit Client')).toBeVisible();

    const firstNameField = dialog.getByRole('textbox').first();
    await expect(firstNameField).not.toHaveValue('');

    // Do NOT save - the environment holds real production-like client data.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
