import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, ratedLine, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Clients list', () => {
  test('Clients list API responds within a generous budget', async ({ page }, testInfo) => {
    await login(page);

    const clickStart = Date.now();
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();
    const clickToVisibleMs = Date.now() - clickStart;

    const clientListDurations = await getResourceDurations(page, '/api/client?');

    const summary = [
      ratedLine('Clicking "Clients" to controls visible', clickToVisibleMs, 1500, 4000),
      assertSLA('SLA T2 - Clicking "Clients" to controls visible', clickToVisibleMs, SLA.NAVIGATION),
      clientListDurations[0] !== undefined
        ? ratedLine('GET /api/client?... duration', clientListDurations[0], 500, 1500)
        : 'GET /api/client?... duration: n/a',
      clientListDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/client?...', clientListDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/client?...: n/a',
      `Total /api/client calls captured this navigation: ${clientListDurations.length}`,
    ];
    console.log(`\n[PERF] Clients list:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'clients-list-performance-metrics', summary);
  });
});
