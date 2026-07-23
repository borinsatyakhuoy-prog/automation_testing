import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Admins Unsupervised Asset Classes', () => {
  test('Unsupervised Asset Classes sub-tab loads within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Unsupervised Asset Classes' }).click();
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    // Settling before reading Resource Timing avoids the race found in
    // 064's pagination test (fetch not yet appended when "Add" renders).
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const groupDataclassDurations = await getResourceDurations(page, '/api/group-dataclass');

    const summary = [
      assertSLA('SLA T2 - Unsupervised Asset Classes click to visible', clickToVisibleMs, SLA.NAVIGATION),
      groupDataclassDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/group-dataclass duration', groupDataclassDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/group-dataclass: n/a',
    ];
    console.log(`\n[PERF] Admins Unsupervised Asset Classes:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-asset-classes-performance-metrics', summary);
  });
});
