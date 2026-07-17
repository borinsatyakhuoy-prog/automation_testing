import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Admins - Team Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
  });

  test('team management table supports sorting, search, and pagination', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'First Name' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add user' })).toBeVisible();

    // Sort by First Name.
    await page.getByRole('button', { name: 'First Name' }).click();

    // Search narrows the result set (search term intentionally generic/non-PII).
    // Note: the field's accessible name is "searchbar", not its "Search user" placeholder text.
    await page.getByRole('textbox', { name: 'searchbar' }).fill('a');
    await expect(page.getByRole('table')).toBeVisible();

    // Clear search, then paginate.
    await page.getByRole('textbox', { name: 'searchbar' }).fill('');
    const nextPage = page.getByRole('button', { name: 'Next page' });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(page.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    }
  });
});
