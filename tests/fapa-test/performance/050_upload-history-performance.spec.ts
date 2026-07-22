import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Upload History', () => {
  test('Upload history table loads within SLA', async ({ page }, testInfo) => {
    await login(page);

    const start = Date.now();
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('columnheader', { name: 'File Type' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    const stockDurations = await getResourceDurations(page, '/api/stock');

    const summary = [
      assertSLA('SLA T2 - Upload click to history table visible', clickToVisibleMs, SLA.NAVIGATION),
      stockDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/stock... duration', stockDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/stock...: n/a',
    ];
    console.log(`\n[PERF] Upload History:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'upload-history-performance-metrics', summary);
  });
});
