import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

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
});
