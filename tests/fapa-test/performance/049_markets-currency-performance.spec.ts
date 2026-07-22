import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Markets Currency', () => {
  test('Currency tab and Add Currency dialog open within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();

    const tabStart = Date.now();
    await page.getByRole('tab', { name: 'Currency' }).click();
    await expect(page.getByRole('button', { name: 'Add Currency' })).toBeVisible();
    const tabMs = Date.now() - tabStart;

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
      assertSLA('SLA T5 - Add Currency dialog open', dialogMs, SLA.DIALOG_OPEN),
    ];
    console.log(`\n[PERF] Markets Currency:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'markets-currency-performance-metrics', summary);
  });
});
