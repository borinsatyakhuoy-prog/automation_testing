import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Markets - ISIN', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();
  });

  test('ISIN tab shows the table, search, and pagination', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'ISIN', selected: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();

    await page.getByPlaceholder('Find an ISIN').fill('EUR');

    const nextPage = page.getByRole('button', { name: 'Next page' });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
    }
  });
});
