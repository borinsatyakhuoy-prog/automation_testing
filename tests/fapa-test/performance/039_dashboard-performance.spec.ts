import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getNavigationMetrics, getResourceDurations, attachMetrics, ratedLine, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Dashboard', () => {
  test('dashboard loads its charts and API calls within a generous budget', async ({ page }, testInfo) => {
    await login(page);
    await page.waitForLoadState('networkidle');

    const nav = await getNavigationMetrics(page);
    const meDurations = await getResourceDurations(page, '/api/me');
    const configDurations = await getResourceDurations(page, '/api/config');

    await expect(page.getByText('Allocation excluding liabilities')).toBeVisible();
    await expect(page.getByText('Recently Consulted Reports')).toBeVisible();

    const summary = [
      ratedLine('Dashboard full load', nav.loadComplete, 3000, 7000),
      assertSLA('SLA T2 - Dashboard full load', nav.loadComplete, SLA.NAVIGATION),
      `Navigation Timing - TTFB: ${nav.ttfb} ms, DOMContentLoaded: ${nav.domContentLoaded} ms`,
      `Paint Timing - First Paint: ${nav.firstPaint ?? 'n/a'} ms, First Contentful Paint: ${nav.firstContentfulPaint ?? 'n/a'} ms`,
      meDurations[0] !== undefined ? ratedLine('GET /api/me duration', meDurations[0], 500, 1500) : 'GET /api/me duration: n/a',
      meDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/me', meDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/me: n/a',
      configDurations[0] !== undefined
        ? ratedLine('GET /api/config duration', configDurations[0], 500, 1500)
        : 'GET /api/config duration: n/a',
      configDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/config', configDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/config: n/a',
    ];
    console.log(`\n[PERF] Dashboard:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'dashboard-performance-metrics', summary);
  });
});
