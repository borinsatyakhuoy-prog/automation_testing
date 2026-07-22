import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Clients Search', () => {
  test('client search filters the table within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();

    const rowCountLabel = page.getByText(/\d+\s*[–-]\s*\d+ of \d+/);
    await expect(rowCountLabel).toBeVisible();

    const start = Date.now();
    await page.getByRole('textbox', { name: 'searchbar' }).fill('a');
    await page.waitForLoadState('networkidle');
    await expect(rowCountLabel).toBeVisible();
    const searchMs = Date.now() - start;

    const summary = [assertSLA('SLA T4 - Clients search to settled', searchMs, SLA.SEARCH_FILTER)];
    console.log(`\n[PERF] Clients Search:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'clients-search-performance-metrics', summary);
  });
});
