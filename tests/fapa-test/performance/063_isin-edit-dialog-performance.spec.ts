import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, assertP99SLA, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - ISIN Edit Dialog', () => {
  test('ISIN row Edit dialog opens within SLA (cancel, do not save)', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();

    const start = Date.now();
    await page.getByRole('cell', { name: 'Edit' }).first().click();
    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();
    const dialogMs = Date.now() - start;

    // Do NOT save - this would alter real market/instrument reference data.
    await dialog.getByRole('button', { name: /cancel|close/i }).first().click();
    await expect(dialog).toBeHidden();

    const summary = [assertSLA('SLA T5 - ISIN Edit dialog open', dialogMs, SLA.DIALOG_OPEN)];
    console.log(`\n[PERF] ISIN Edit Dialog:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'isin-edit-dialog-performance-metrics', summary);
  });

  test('Currency-code autocomplete P99 - 15 samples (open/cancel, never save)', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();

    // Opening the Edit dialog fires GET /api/currency-detail/distinct?search=
    // (confirmed live) to populate the currency-code autocomplete - repeated
    // open/cancel cycles are safe since nothing is ever saved.
    for (let i = 0; i < 15; i++) {
      await page.getByRole('cell', { name: 'Edit' }).first().click();
      const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
      await expect(dialog).toBeVisible();
      await page.waitForLoadState('networkidle');
      await dialog.getByRole('button', { name: /cancel|close/i }).first().click();
      await expect(dialog).toBeHidden();
    }

    const currencyAutocompleteDurations = await getResourceDurations(page, '/api/currency-detail/distinct?search=');

    const summary = [
      assertP99SLA(
        'SLA T3 (P99) - GET /api/currency-detail/distinct?search=',
        currencyAutocompleteDurations.slice(0, 15),
        SLA.API_READ
      ),
    ];
    console.log(`\n[PERF] Currency Autocomplete P99:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'currency-autocomplete-p99-performance-metrics', summary);
  });
});
