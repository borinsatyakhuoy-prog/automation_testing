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

    const logDurations = await getResourceDurations(page, '/api/log');

    const summary = [
      assertSLA('SLA T2 - Logs click to table visible', clickToVisibleMs, SLA.NAVIGATION),
      logDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/log... duration', logDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/log...: n/a',
    ];
    console.log(`\n[PERF] Admins Logs:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-logs-performance-metrics', summary);
  });
});
