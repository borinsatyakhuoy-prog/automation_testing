import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Upload Import Wizard', () => {
  test('Import File dialog opens within SLA (cancel, do not submit)', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Upload' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByRole('heading', { name: 'Import File' })).toBeVisible();
    const dialogMs = Date.now() - start;

    // Do NOT upload a real file - this would create a real data-import record.
    await page.getByRole('button').filter({ hasText: 'close' }).click();

    const summary = [assertSLA('SLA T5 - Import File dialog open', dialogMs, SLA.DIALOG_OPEN)];
    console.log(`\n[PERF] Upload Import Wizard:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'upload-import-wizard-performance-metrics', summary);
  });
});
