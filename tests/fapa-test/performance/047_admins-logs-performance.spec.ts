import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Admins Logs', () => {
  test('Logs sub-tab loads within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Logs' }).click();
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    // The column header rendering doesn't guarantee the Resource Timing
    // entry for the underlying fetch has been appended yet - the same race
    // found and fixed in 064's pagination test. Settling here (after the T2
    // measurement, so it doesn't pollute it) makes the capture reliable.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // The real endpoint is GET /api/entrance/list-logs, not /api/log -
    // confirmed live via network inspection. The old filter never matched
    // anything, which is why this always read "n/a" regardless of timing.
    const logDurations = await getResourceDurations(page, '/api/entrance/list-logs');

    const summary = [
      assertSLA('SLA T2 - Logs click to table visible', clickToVisibleMs, SLA.NAVIGATION),
      logDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/entrance/list-logs duration', logDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/entrance/list-logs: n/a',
    ];
    console.log(`\n[PERF] Admins Logs:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-logs-performance-metrics', summary);
  });
});
