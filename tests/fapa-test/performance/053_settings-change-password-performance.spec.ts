import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Settings Change Password', () => {
  test('Setting & Privacy page loads within SLA (do not submit)', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'KH' }).click();

    const start = Date.now();
    await page.getByRole('menuitem', { name: 'Setting & Privacy' }).click();
    await expect(page.getByText('New password', { exact: true })).toBeVisible();
    const navMs = Date.now() - start;

    // Do NOT submit - this would change the credentials this whole suite depends on.
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const summary = [assertSLA('SLA T2 - Setting & Privacy page load', navMs, SLA.NAVIGATION)];
    console.log(`\n[PERF] Settings Change Password:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'settings-change-password-performance-metrics', summary);
  });
});
