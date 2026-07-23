import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getResourceDurations, assertP99SLA, attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Sign Out', () => {
  test('Sign Out ends the session within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'KH' }).click();

    const start = Date.now();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    const signOutMs = Date.now() - start;

    const summary = [assertSLA('SLA T2 - Sign Out click to /login', signOutMs, SLA.NAVIGATION)];
    console.log(`\n[PERF] Sign Out:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'sign-out-performance-metrics', summary);
  });

  test('Sign Out P99 - 10 login/logout cycles', async ({ page }, testInfo) => {
    test.setTimeout(90_000);

    // DELETE /api/logout is the real sign-out endpoint (confirmed live) -
    // each sample needs a fresh login first, so N is smaller than the
    // cheap dialog-repeat tests (10, not 15-30) to keep this test's real
    // cost reasonable.
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      await login(page);
      await page.getByRole('button', { name: 'KH' }).click();
      const start = Date.now();
      await page.getByRole('menuitem', { name: 'Sign Out' }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      samples.push(Date.now() - start);
    }

    // n for this endpoint is structurally capped at 1, not 10: every cycle's
    // login() does a full page navigation, and Resource Timing's buffer is
    // per-document - it resets on navigation. Each earlier cycle's
    // DELETE /api/logout entry is wiped by the *next* cycle's login()
    // navigation before we ever get here to read it; only the final cycle's
    // entry survives. This is expected for any endpoint measured across
    // real page-navigation cycles (unlike SPA-internal clicks, which don't
    // reload the document) - not a capture bug like the ISIN gap.
    const logoutDurations = await getResourceDurations(page, '/api/logout');

    const summary = [
      assertP99SLA('SLA T2 (P99) - Sign Out click to /login', samples, SLA.NAVIGATION),
      assertP99SLA('SLA T3 (P99, n<=1 - see comment) - DELETE /api/logout', logoutDurations.slice(0, 10), SLA.API_READ),
    ];
    console.log(`\n[PERF] Sign Out P99:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'sign-out-p99-performance-metrics', summary);
  });
});
