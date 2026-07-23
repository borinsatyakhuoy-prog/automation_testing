import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * 057/058 (Clients Search / Admins Team Management Search) already gate the
 * user-facing "type to filtered rows settled" wall-clock time against SLA
 * T4. That number bundles debounce + API round trip + table re-render, so a
 * slow *backend* filter query can hide inside an otherwise-passing T4
 * result. This test isolates the actual filtered-query API call - the part
 * a backend regression would actually show up in - and gates it against
 * SLA T3 directly, independent of client-side debounce/render time.
 */
test.describe('Performance - Search Filter API Endpoints', () => {
  test('GET /api/client?search=... responds within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();

    const rowCountLabel = page.getByText(/\d+\s*[–-]\s*\d+ of \d+/);
    await expect(rowCountLabel).toBeVisible();

    await page.getByRole('textbox', { name: 'searchbar' }).fill('a');
    await page.waitForLoadState('networkidle');
    await expect(rowCountLabel).toBeVisible();

    const searchDurations = await getResourceDurations(page, '/api/client?');

    const summary = [
      searchDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/client?search=a duration', searchDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/client?search=a: n/a',
    ];
    console.log(`\n[PERF] Clients Search API:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'clients-search-api-performance-metrics', summary);
  });

  test('GET /api/user?search=... responds within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await expect(page.getByRole('columnheader', { name: 'First Name' })).toBeVisible();

    await page.getByRole('textbox', { name: 'searchbar' }).fill('a');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('table')).toBeVisible();

    const searchDurations = await getResourceDurations(page, '/api/user?');

    const summary = [
      searchDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/user?search=a duration', searchDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/user?search=a: n/a',
    ];
    console.log(`\n[PERF] Admins Search API:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-search-api-performance-metrics', summary);
  });
});
