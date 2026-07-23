import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Admins Firewall Configuration', () => {
  test('Firewall Configuration sub-tab loads within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Firewall Configuration' }).click();
    await expect(page.getByRole('button', { name: 'Add Range' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    const ipWhiteListDurations = await getResourceDurations(page, '/api/ip-white-list');

    const summary = [
      assertSLA('SLA T2 - Firewall Configuration click to visible', clickToVisibleMs, SLA.NAVIGATION),
      ipWhiteListDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/ip-white-list duration', ipWhiteListDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/ip-white-list: n/a',
    ];
    console.log(`\n[PERF] Admins Firewall Configuration:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-firewall-performance-metrics', summary);
  });
});
