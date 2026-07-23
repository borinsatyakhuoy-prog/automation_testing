import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Client Detail View', () => {
  test('client detail view opens and returns within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();

    const openStart = Date.now();
    await page.getByRole('menu').getByRole('menuitem', { name: 'View detail' }).click();
    await expect(page.getByText('Client Information')).toBeVisible();
    const openMs = Date.now() - openStart;

    // "Client Information" rendering doesn't guarantee the Resource Timing
    // entry for the underlying /api/account/{id} fetch has been appended
    // yet - the same race found and fixed in 064's pagination test.
    // Settling here (after the T2 measurement) makes the capture reliable.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const accountDurations = await getResourceDurations(page, '/api/account/');

    const backStart = Date.now();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/clients/);
    const backMs = Date.now() - backStart;

    const summary = [
      assertSLA('SLA T2 - View detail click to Client Information visible', openMs, SLA.NAVIGATION),
      accountDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/account/{id} duration', accountDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/account/{id}: n/a',
      assertSLA('SLA T2 - Back click to Clients list', backMs, SLA.NAVIGATION),
    ];
    console.log(`\n[PERF] Client Detail View:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-detail-view-performance-metrics', summary);
  });
});
