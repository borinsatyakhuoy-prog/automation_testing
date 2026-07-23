import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Markets Currency', () => {
  test('Currency tab and Add Currency dialog open within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();

    const tabStart = Date.now();
    await page.getByRole('tab', { name: 'Currency' }).click();
    await expect(page.getByRole('button', { name: 'Add Currency' })).toBeVisible();
    const tabMs = Date.now() - tabStart;

    // Settling before reading Resource Timing avoids the race found in
    // 064's pagination test (fetch not yet appended when "Add Currency" renders).
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const currencyDetailDurations = await getResourceDurations(page, '/api/currency-detail');

    const dialogStart = Date.now();
    await page.getByRole('button', { name: 'Add Currency' }).click();
    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();
    const dialogMs = Date.now() - dialogStart;

    // Do NOT submit - this would create a real currency-rate record.
    await dialog.getByRole('button', { name: /cancel|close/i }).first().click();
    await expect(dialog).toBeHidden();

    const summary = [
      assertSLA('SLA T2 - Currency tab click to visible', tabMs, SLA.NAVIGATION),
      currencyDetailDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/currency-detail duration', currencyDetailDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/currency-detail: n/a',
      assertSLA('SLA T5 - Add Currency dialog open', dialogMs, SLA.DIALOG_OPEN),
    ];
    console.log(`\n[PERF] Markets Currency:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'markets-currency-performance-metrics', summary);
  });
});
