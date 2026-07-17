import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Upload', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Upload' }).click();
  });

  test('upload history table supports sorting', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'File Type' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();

    await page.getByRole('columnheader', { name: 'Date & Time' }).click();
  });

  // Known issue: searching the visibly-displayed File Type label (e.g. an exact
  // category name shown in the first column) returns 0 results; only the
  // filename column is actually matched. See test-results/exploratory-findings.md,
  // New Issue #3. This test documents the CURRENT (buggy) behavior so a fix
  // will be caught by this test flipping to failing.
  test('search currently only matches filename, not the File Type column (known issue)', async ({ page }) => {
    const searchBox = page.getByRole('textbox', { name: 'searchbar' });

    await searchBox.fill('Passive');
    await expect(page.getByText('0 of 0')).toBeVisible();

    await searchBox.fill('');
    await searchBox.fill('JDD_passif');
    await expect(page.getByText(/\d+\s*[–-]\s*\d+ of \d+/)).toBeVisible();
  });
});
