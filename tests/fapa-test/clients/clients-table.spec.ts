import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('clients table supports sorting and pagination', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();

    await page.getByRole('button', { name: 'Last Name' }).click();

    const nextPage = page.getByRole('button', { name: 'Next page' });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(page.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    }
  });
});
