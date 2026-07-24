import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * admins/014_logs-table.spec.ts covers a valid date range plus Clear, but
 * not what happens when Start date is set after End date - an inverted
 * range a user could easily produce by mis-clicking either picker.
 *
 * Confirmed live 2026-07-24: the app doesn't show a validation error or an
 * empty-result state for an inverted range - "Apply" stays enabled and
 * clicking it leaves the table showing its normal default (unfiltered) set
 * of rows, the same as if no filter had been applied at all. Documented as
 * the app's current, non-crashing behavior (silently ignoring an
 * unsatisfiable range rather than erroring), not asserting a specific
 * "correct" behavior that isn't actually implemented.
 */
test.describe('Admins - Logs invalid date range', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await page.getByRole('button', { name: 'Logs' }).click();
  });

  test('Start date after End date does not error or crash - table falls back to its default unfiltered view', async ({ page }) => {
    // Wait for the table to actually populate before taking the baseline
    // count - reading it too early (mid-render) undercounts and produces a
    // false mismatch against the post-filter count.
    await expect(page.getByRole('cell', { name: 'Login' }).first()).toBeVisible();
    const rowsBefore = await page.getByRole('row').count();

    await page.getByRole('textbox', { name: 'Start date' }).fill('07/24/2026');
    await page.getByRole('textbox', { name: 'End date' }).fill('07/01/2026');

    const applyButton = page.getByRole('button', { name: 'Apply' });
    await expect(applyButton).toBeEnabled();
    await applyButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No data available')).toBeHidden();
    const rowsAfter = await page.getByRole('row').count();
    expect(rowsAfter).toBe(rowsBefore);

    await page.getByRole('button', { name: 'Clear' }).click();
  });
});
