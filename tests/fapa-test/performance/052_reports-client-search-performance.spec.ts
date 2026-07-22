import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Reports Client Search', () => {
  test('client autocomplete responds within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Reports' }).click();

    const clientField = page.getByRole('textbox', { name: 'Select a client' });

    const start = Date.now();
    await clientField.fill('a');
    // Known issue (see reports/026_reports-client-search.spec.ts): the
    // suggestion menu doesn't always open purely from typed input - a
    // re-focus click reliably surfaces it.
    await clientField.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const autocompleteMs = Date.now() - start;

    const summary = [assertSLA('SLA T4 - Client autocomplete suggestions visible', autocompleteMs, SLA.SEARCH_FILTER)];
    console.log(`\n[PERF] Reports Client Search:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'reports-client-search-performance-metrics', summary);
  });
});
