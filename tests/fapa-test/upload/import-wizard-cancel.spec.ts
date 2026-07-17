import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Upload', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Upload' }).click();
  });

  test('Import File wizard requires a file and can be closed without submitting', async ({ page }) => {
    await page.getByRole('button', { name: 'Import' }).click();

    await expect(page.getByRole('heading', { name: 'Import File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' }).last()).toBeDisabled();

    // Do NOT upload a real file - this would create a real data-import record.
    // The dialog's close icon is a Material "close" icon ligature, matched here by its text content.
    await page.getByRole('button').filter({ hasText: 'close' }).click();
  });
});
