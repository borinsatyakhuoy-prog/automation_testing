import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Client Detail View', () => {
  test('client detail view opens and returns within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();

    const openStart = Date.now();
    await page.getByRole('menu').getByRole('menuitem', { name: 'View detail' }).click();
    await expect(page.getByText('Client Information')).toBeVisible();
    const openMs = Date.now() - openStart;

    const backStart = Date.now();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/clients/);
    const backMs = Date.now() - backStart;

    const summary = [
      assertSLA('SLA T2 - View detail click to Client Information visible', openMs, SLA.NAVIGATION),
      assertSLA('SLA T2 - Back click to Clients list', backMs, SLA.NAVIGATION),
    ];
    console.log(`\n[PERF] Client Detail View:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-detail-view-performance-metrics', summary);
  });
});
