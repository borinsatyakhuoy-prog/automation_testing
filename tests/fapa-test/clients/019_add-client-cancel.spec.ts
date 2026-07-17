import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('Add Client dialog validates required fields and can be cancelled', async ({ page }) => {
    const rowCountLabel = page.getByText(/\d+\s*[–-]\s*\d+ of \d+/);
    const before = await rowCountLabel.textContent();

    await page.getByRole('button', { name: 'Add client' }).click();

    await expect(page.getByRole('heading', { name: 'Add Client' })).toBeVisible();
    const submit = page.getByRole('button', { name: 'Add & Notify' });
    await expect(submit).toBeDisabled();

    // Do NOT fill in or submit this form - the environment holds real production-like client data.
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Add Client' })).toBeHidden();
    await expect(rowCountLabel).toHaveText(before ?? '');
  });
});
