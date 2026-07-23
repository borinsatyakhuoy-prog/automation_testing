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

    // The column header rendering doesn't guarantee the Resource Timing
    // entry for the underlying fetch has been appended yet - the same race
    // found and fixed in 064's pagination test. Settling here (after the T2
    // measurement, so it doesn't pollute it) makes the capture reliable.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // The real endpoint is GET /api/audit, not /api/stock - confirmed live
    // via network inspection. The old filter never matched anything, which
    // is why this always read "n/a" regardless of timing.
    const auditDurations = await getResourceDurations(page, '/api/audit');

    const summary = [
      assertSLA('SLA T2 - Upload click to history table visible', clickToVisibleMs, SLA.NAVIGATION),
      auditDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/audit... duration', auditDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/audit...: n/a',
    ];
    console.log(`\n[PERF] Upload History:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'upload-history-performance-metrics', summary);
  });
});
