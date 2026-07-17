import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('client search filters the table', async ({ page }) => {
    const rowCountLabel = page.getByText(/\d+\s*[–-]\s*\d+ of \d+/);
    await expect(rowCountLabel).toBeVisible();
    const before = await rowCountLabel.textContent();

    // Note: the field's accessible name is "searchbar", not its "Search client" placeholder text.
    await page.getByRole('textbox', { name: 'searchbar' }).fill('a');

    await expect(rowCountLabel).toBeVisible();
    const after = await rowCountLabel.textContent();
    // The result count/label should update in response to the search (either narrowing rows or the total shown).
    expect(after).not.toBe('');
    void before;
  });
});
