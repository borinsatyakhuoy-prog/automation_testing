import { test, expect } from '@playwright/test';
import { requireCredentials } from '../helpers/auth';
import { getNavigationMetrics, getResourceDurations, attachMetrics, ratedLine } from '../helpers/performance';

/**
 * Real, unmocked navigation/paint timing for the login page, plus the
 * actual duration of the real POST /api/entrance/login call. Thresholds
 * are deliberately generous (this is a live, shared "develop" environment
 * with its own documented flakiness - see exploratory-findings.md) - the
 * goal is to catch a real regression (e.g. login suddenly taking 10x
 * longer), not to enforce a strict performance budget.
 */
test.describe('Performance - Login', () => {
  test('login page loads and authenticates within a generous budget', async ({ page }, testInfo) => {
    const { email, password } = requireCredentials();

    const navStart = Date.now();
    await page.goto('/login', { waitUntil: 'load' });
    const pageLoadMs = Date.now() - navStart;
    const nav = await getNavigationMetrics(page);

    await page.getByRole('textbox', { name: 'Enter your email' }).fill(email);
    await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);

    const loginStart = Date.now();
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    const loginRoundTripMs = Date.now() - loginStart;
    const loginApiDurations = await getResourceDurations(page, '/api/entrance/login');

    const summary = [
      ratedLine('Login page load (goto to load event)', pageLoadMs, 2000, 5000),
      `Navigation Timing - TTFB: ${nav.ttfb} ms, DOMContentLoaded: ${nav.domContentLoaded} ms, full load: ${nav.loadComplete} ms`,
      `Paint Timing - First Paint: ${nav.firstPaint ?? 'n/a'} ms, First Contentful Paint: ${nav.firstContentfulPaint ?? 'n/a'} ms`,
      ratedLine('Login click-to-/dashboard round trip', loginRoundTripMs, 2000, 5000),
      loginApiDurations[0] !== undefined
        ? ratedLine('POST /api/entrance/login duration', loginApiDurations[0], 500, 1500)
        : 'POST /api/entrance/login duration: n/a',
    ];
    console.log(`\n[PERF] Login:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'login-performance-metrics', summary);

    expect(pageLoadMs).toBeLessThan(15_000);
    expect(loginRoundTripMs).toBeLessThan(15_000);
  });
});
