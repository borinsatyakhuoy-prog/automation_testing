import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * admins/010_team-management-row-menu.spec.ts only opens the row kebab menu
 * and dismisses it - the "Edit" option itself (unlike Markets/ISIN's and
 * Clients' own Edit-cancel precedents) was never actually opened.
 */
test.describe('Admins - Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
  });

  test('Edit user dialog opens pre-filled with the existing record and can be cancelled without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Edit User')).toBeVisible();

    // Pre-filled, not blank - confirms this is a real edit form, not a copy
    // of the Add User dialog with placeholders.
    const firstNameField = dialog.getByRole('textbox').first();
    await expect(firstNameField).not.toHaveValue('');

    // Do NOT save - the environment holds real production-like user data.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
