import { test, expect } from '@playwright/test';
import { loginAsClientPortal, requireClientPortalCredentials } from '../helpers/auth';
import { getResourceDurations, assertP99SLA, attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * Every other performance test in this suite logs in as ADMIN. The client
 * portal is a genuinely distinct, restricted role (only Dashboard/Reports
 * nav, different underlying endpoints - see specs/performance-sla.md's
 * "Client portal" section) that had zero performance coverage until now.
 *
 * Uses a dedicated client-portal test account (FAPA_CLIENT_PORTAL_EMAIL/
 * PASSWORD) that has real data: a portfolio Excel import (retargeted from
 * the existing `1. JDD_model_portefeuille.xlsx` fixture), Consulted,
 * Generated, and Validated for the current month - Validate is the actual
 * publish step that makes data visible here (confirmed live), so an
 * un-validated client account would only ever measure the cheap, mostly-
 * empty placeholder state, not a realistic render.
 */
test.describe('Performance - Client Portal', () => {
  test('Login lands on the restricted client dashboard within SLA', async ({ page }, testInfo) => {
    const { email, password } = requireClientPortalCredentials();

    const start = Date.now();
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Enter your email' }).fill(email);
    await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    const loginMs = Date.now() - start;

    const meDurations = await getResourceDurations(page, '/api/me');

    const summary = [
      assertSLA('SLA T2 - Client login click to dashboard', loginMs, SLA.NAVIGATION),
      meDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/me', meDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/me: n/a',
    ];
    console.log(`\n[PERF] Client Portal Login:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-portal-login-performance-metrics', summary);
  });

  test('Dashboard (with a real validated PDF) loads within SLA', async ({ page }, testInfo) => {
    await loginAsClientPortal(page);

    // loginAsClientPortal already lands here, but this test wants a clean
    // click-to-visible measurement of the widgets specifically, so navigate
    // there again as a deliberate, isolated action.
    const start = Date.now();
    await page.goto('/dashboard');
    await expect(page.getByText('PDFs available for download')).toBeVisible();
    const dashboardMs = Date.now() - start;

    const dashboardApiDurations = await getResourceDurations(page, '/api/dashboard');

    const summary = [
      assertSLA('SLA T2 - Client Dashboard load', dashboardMs, SLA.NAVIGATION),
      dashboardApiDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/dashboard', dashboardApiDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/dashboard: n/a',
    ];
    console.log(`\n[PERF] Client Portal Dashboard:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-portal-dashboard-performance-metrics', summary);
  });

  test('Reports section (real validated report content) loads within SLA', async ({ page }, testInfo) => {
    await loginAsClientPortal(page);

    const start = Date.now();
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page.getByText('Table of contents')).toBeVisible();
    const reportsMs = Date.now() - start;

    // /api/report/doc is the client-portal-specific report list endpoint -
    // distinct from /api/report used by the advisor Reports search page
    // (confirmed live via network inspection).
    const reportDocDurations = await getResourceDurations(page, '/api/report/doc');

    const summary = [
      assertSLA('SLA T2 - Client Reports section load', reportsMs, SLA.NAVIGATION),
      reportDocDurations[0] !== undefined
        ? assertSLA('SLA T3 - GET /api/report/doc', reportDocDurations[0], SLA.API_READ)
        : 'SLA T3 - GET /api/report/doc: n/a',
    ];
    console.log(`\n[PERF] Client Portal Reports:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-portal-reports-performance-metrics', summary);
  });

  test('Dashboard/Reports P99 - 15 samples each', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await loginAsClientPortal(page);

    // Each cycle waits for networkidle before the next fires - required
    // after the pacing bug found and fixed in 066's ISIN P99 test (see
    // specs/performance-sla.md): without it, "X visible" resolves as soon
    // as the tab UI switches, well before the underlying fetch completes,
    // letting requests pile up and produce misleadingly inflated numbers.
    const dashboardSamples: number[] = [];
    const reportsSamples: number[] = [];
    for (let i = 0; i < 15; i++) {
      const dStart = Date.now();
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page.getByText('PDFs available for download')).toBeVisible();
      await page.waitForLoadState('networkidle');
      dashboardSamples.push(Date.now() - dStart);

      const rStart = Date.now();
      await page.getByRole('button', { name: 'Reports' }).click();
      await expect(page.getByText('Table of contents')).toBeVisible();
      await page.waitForLoadState('networkidle');
      reportsSamples.push(Date.now() - rStart);
    }

    const dashboardApiDurations = await getResourceDurations(page, '/api/dashboard');
    const reportDocDurations = await getResourceDurations(page, '/api/report/doc');

    const summary = [
      assertP99SLA('SLA T2 (P99) - Client Dashboard click to visible', dashboardSamples, SLA.NAVIGATION),
      assertP99SLA('SLA T2 (P99) - Client Reports click to visible', reportsSamples, SLA.NAVIGATION),
      assertP99SLA('SLA T3 (P99) - GET /api/dashboard', dashboardApiDurations.slice(0, 15), SLA.API_READ),
      assertP99SLA('SLA T3 (P99) - GET /api/report/doc', reportDocDurations.slice(0, 15), SLA.API_READ),
    ];
    console.log(`\n[PERF] Client Portal Dashboard/Reports P99:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-portal-p99-performance-metrics', summary);
  });

  test('Sign Out ends the client session within SLA', async ({ page }, testInfo) => {
    await loginAsClientPortal(page);
    await page.getByRole('button', { name: 'QA' }).click();

    const start = Date.now();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    const signOutMs = Date.now() - start;

    const summary = [assertSLA('SLA T2 - Client Sign Out click to /login', signOutMs, SLA.NAVIGATION)];
    console.log(`\n[PERF] Client Portal Sign Out:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'client-portal-sign-out-performance-metrics', summary);
  });
});
