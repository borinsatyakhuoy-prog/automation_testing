import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Clients', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('client type filter narrows results and New clients reflects its count', async ({ page }) => {
    const rowCountLabel = page.getByText(/\d+\s*[–-]\s*\d+ of \d+/);
    const personCount = await rowCountLabel.textContent();

    await page.getByRole('option', { name: 'Companies' }).click();
    // Use a retrying assertion rather than a one-shot textContent() read, since
    // the table re-renders asynchronously after the filter click.
    await expect(rowCountLabel).not.toHaveText(personCount ?? '', { timeout: 10000 });

    const newClientsOption = page.getByRole('option', { name: /New clients \d+/ });
    const label = await newClientsOption.textContent();
    const expectedCount = label?.match(/\d+/)?.[0];

    await newClientsOption.click();
    // No trailing anchor: the paginator label has trailing whitespace after the count (e.g. " 1 – 10 of 27 ").
    await expect(page.getByText(new RegExp(`of ${expectedCount}\\b`))).toBeVisible();
  });
});
