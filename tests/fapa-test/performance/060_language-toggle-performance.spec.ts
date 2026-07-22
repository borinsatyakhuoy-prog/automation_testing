import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Language Toggle', () => {
  test('FR/EN toggle switches labels within SLA', async ({ page }, testInfo) => {
    await login(page);

    const toFrStart = Date.now();
    await page.getByRole('radio', { name: 'FR' }).click();
    await expect(page.getByRole('button', { name: 'Tableau de bord' })).toBeVisible();
    const toFrMs = Date.now() - toFrStart;

    const toEnStart = Date.now();
    await page.getByRole('radio', { name: 'EN' }).click();
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    const toEnMs = Date.now() - toEnStart;

    const summary = [
      assertSLA('SLA T2 - EN to FR toggle', toFrMs, SLA.NAVIGATION),
      assertSLA('SLA T2 - FR to EN toggle', toEnMs, SLA.NAVIGATION),
    ];
    console.log(`\n[PERF] Language Toggle:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'language-toggle-performance-metrics', summary);
  });
});
