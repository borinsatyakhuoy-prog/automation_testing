import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Admins Team Management', () => {
  test('Team Management table loads within SLA', async ({ page }, testInfo) => {
    await login(page);

    const start = Date.now();
    await page.getByRole('button', { name: 'Admins' }).click();
    await expect(page.getByRole('columnheader', { name: 'First Name' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    const userListDurations = await getResourceDurations(page, '/api/user');

    const summary = [
      assertSLA('SLA T2 - Admins click to Team Management table visible', clickToVisibleMs, SLA.NAVIGATION),
      userListDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/user... duration', userListDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/user...: n/a',
    ];
    console.log(`\n[PERF] Admins Team Management:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-team-management-performance-metrics', summary);
  });
});
