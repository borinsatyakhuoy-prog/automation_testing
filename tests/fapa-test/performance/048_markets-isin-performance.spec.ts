import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Markets ISIN', () => {
  test('ISIN tab loads and search filters within SLA', async ({ page }, testInfo) => {
    await login(page);

    const navStart = Date.now();
    await page.getByRole('button', { name: 'Markets' }).click();
    await expect(page.getByRole('tab', { name: 'ISIN', selected: true })).toBeVisible();
    const navMs = Date.now() - navStart;

    const isinDurations = await getResourceDurations(page, '/api/isin');

    const searchStart = Date.now();
    await page.getByPlaceholder('Find an ISIN').fill('EUR');
    await page.waitForLoadState('networkidle');
    const searchMs = Date.now() - searchStart;

    const summary = [
      assertSLA('SLA T2 - Markets click to ISIN tab visible', navMs, SLA.NAVIGATION),
      isinDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/isin... duration', isinDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/isin...: n/a',
      assertSLA('SLA T4 - "Find an ISIN" search to settled', searchMs, SLA.SEARCH_FILTER),
    ];
    console.log(`\n[PERF] Markets ISIN:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'markets-isin-performance-metrics', summary);
  });
});
