import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Admins Team Management Search', () => {
  test('Team Management search filters the table within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await expect(page.getByRole('columnheader', { name: 'First Name' })).toBeVisible();

    const start = Date.now();
    await page.getByRole('textbox', { name: 'searchbar' }).fill('a');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('table')).toBeVisible();
    const searchMs = Date.now() - start;

    const summary = [assertSLA('SLA T4 - Team Management search to settled', searchMs, SLA.SEARCH_FILTER)];
    console.log(`\n[PERF] Admins Team Management Search:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-search-performance-metrics', summary);
  });
});
