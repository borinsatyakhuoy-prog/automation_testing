import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Admins Unsupervised Asset Classes', () => {
  test('Unsupervised Asset Classes sub-tab loads within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Unsupervised Asset Classes' }).click();
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    const summary = [
      assertSLA('SLA T2 - Unsupervised Asset Classes click to visible', clickToVisibleMs, SLA.NAVIGATION),
    ];
    console.log(`\n[PERF] Admins Unsupervised Asset Classes:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-asset-classes-performance-metrics', summary);
  });
});
