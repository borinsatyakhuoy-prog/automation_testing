import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

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
});
