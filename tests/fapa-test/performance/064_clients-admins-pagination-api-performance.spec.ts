import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * Every other list-endpoint performance test (Clients list, Admins Team
 * Management, etc.) only ever measures page 0 - the page that's already
 * loaded on first render. Offset-based pagination (page=1, page=2, ...) is
 * a common place for a list query to get slower as the offset grows, and
 * that path is never exercised anywhere else in this suite. This test
 * clicks "Next page" and measures the resulting page=1 API call directly,
 * on both list endpoints that expose the same MUI paginator.
 *
 * The extra `waitForTimeout` after the row-visible assertion is deliberately
 * excluded from the `nextPageMs` measurement (it's read before the wait) -
 * it exists only to give the browser's Resource Timing buffer a moment to
 * register the just-completed XHR entry before `getResourceDurations` reads
 * it, since reading immediately after the rows render has been observed to
 * race the entry being appended.
 */
test.describe('Performance - Clients/Admins Pagination (API)', () => {
  test('GET /api/client page=1 responds within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();

    const nextPageStart = Date.now();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/11\s*[–-]\s*20 of \d+/)).toBeVisible();
    const nextPageMs = Date.now() - nextPageStart;
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const page1Durations = await getResourceDurations(page, '/api/client?page=1');

    const summary = [
      assertSLA('SLA T2 - Next page click to page 2 rows visible', nextPageMs, SLA.NAVIGATION),
      page1Durations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/client?page=1... duration', page1Durations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/client?page=1...: n/a',
    ];
    console.log(`\n[PERF] Clients Pagination (API):\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'clients-pagination-api-performance-metrics', summary);
  });

  test('GET /api/user page=1 responds within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await expect(page.getByRole('columnheader', { name: 'First Name' })).toBeVisible();

    const nextPageStart = Date.now();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/11\s*[–-]\s*20 of \d+/)).toBeVisible();
    const nextPageMs = Date.now() - nextPageStart;
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const page1Durations = await getResourceDurations(page, '/api/user?page=1');

    const summary = [
      assertSLA('SLA T2 - Next page click to page 2 rows visible', nextPageMs, SLA.NAVIGATION),
      page1Durations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/user?page=1... duration', page1Durations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/user?page=1...: n/a',
    ];
    console.log(`\n[PERF] Admins Pagination (API):\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'admins-pagination-api-performance-metrics', summary);
  });
});
