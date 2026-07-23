import { test, expect } from '@playwright/test';
import { loginAsEmployee } from '../helpers/auth';
import { getResourceDurations, assertP99SLA, attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * Parity check, not new exploration: every other performance test in this
 * suite logs in as ADMIN. EMPLOYE hits the identical underlying endpoints
 * for day-to-day operational screens (confirmed live via network
 * inspection - /api/client, /api/isin, /api/currency-detail etc. are
 * unchanged) and has no Admins nav item at all (server-side blocked, not
 * just hidden - confirmed live that a direct /admin navigation redirects
 * away). This exists to confirm role-based permission checks don't add a
 * measurable performance cost on the screens EMPLOYE can actually reach,
 * not to re-discover endpoints already covered under the ADMIN account.
 */
test.describe('Performance - Employee Role', () => {
  test('Login lands on dashboard within SLA (no Admins nav item)', async ({ page }, testInfo) => {
    const start = Date.now();
    await loginAsEmployee(page);
    const loginMs = Date.now() - start;

    await expect(page.getByRole('button', { name: 'Admins' })).toHaveCount(0);

    const summary = [assertSLA('SLA T2 - Employee login click to dashboard', loginMs, SLA.NAVIGATION)];
    console.log(`\n[PERF] Employee Login:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'employee-login-performance-metrics', summary);
  });

  test('Clients list performs at parity with the Admin baseline', async ({ page }, testInfo) => {
    await loginAsEmployee(page);

    const start = Date.now();
    await page.getByRole('button', { name: 'Clients' }).click();
    await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    const clientListDurations = await getResourceDurations(page, '/api/client?');

    const summary = [
      assertSLA('SLA T2 - Employee Clients click to visible', clickToVisibleMs, SLA.NAVIGATION),
      clientListDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/client?... (employee)', clientListDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/client?... (employee): n/a',
    ];
    console.log(`\n[PERF] Employee Clients List:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'employee-clients-list-performance-metrics', summary);
  });

  test('Markets Currency performs at parity with the Admin baseline', async ({ page }, testInfo) => {
    await loginAsEmployee(page);

    const start = Date.now();
    await page.getByRole('button', { name: 'Markets' }).click();
    await page.getByRole('tab', { name: 'Currency' }).click();
    await expect(page.getByRole('button', { name: 'Add Currency' })).toBeVisible();
    const clickToVisibleMs = Date.now() - start;

    const currencyDurations = await getResourceDurations(page, '/api/currency-detail');

    const summary = [
      assertSLA('SLA T2 - Employee Currency tab click to visible', clickToVisibleMs, SLA.NAVIGATION),
      currencyDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/currency-detail (employee)', currencyDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/currency-detail (employee): n/a',
    ];
    console.log(`\n[PERF] Employee Markets Currency:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'employee-markets-currency-performance-metrics', summary);
  });

  test('Clients list P99 - 30 samples (employee)', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await loginAsEmployee(page);

    // Each cycle waits for networkidle before the next fires - the same
    // pacing fix required in 066's ISIN P99 test after a self-inflicted
    // request pile-up produced misleadingly inflated numbers there.
    const samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      const start = Date.now();
      await page.getByRole('button', { name: 'Clients' }).click();
      await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      samples.push(Date.now() - start);
    }

    const clientListDurations = await getResourceDurations(page, '/api/client?');

    const summary = [
      assertP99SLA('SLA T2 (P99) - Employee Dashboard click to Clients visible', samples, SLA.NAVIGATION),
      assertP99SLA('SLA T3 (P99) - GET /api/client?... (employee)', clientListDurations.slice(0, 30), SLA.API_READ),
    ];
    console.log(`\n[PERF] Employee Clients P99:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'employee-clients-p99-performance-metrics', summary);
  });
});
