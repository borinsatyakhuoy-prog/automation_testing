import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Admins - Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
  });

  test('Add user dialog opens and can be cancelled without submitting', async ({ page }) => {
    await page.getByRole('button', { name: 'Add user' }).click();

    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();

    // Do NOT fill in or submit this form - the environment holds real production-like user data.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });
});
