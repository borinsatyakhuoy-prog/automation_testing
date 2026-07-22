import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Add Client Dialog', () => {
  test('Add Client dialog opens within SLA (cancel, do not submit)', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Add client' }).click();
    await expect(page.getByRole('heading', { name: 'Add Client' })).toBeVisible();
    const dialogMs = Date.now() - start;

    // Do NOT fill in or submit this form - the environment holds real production-like client data.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add Client' })).toBeHidden();

    const summary = [assertSLA('SLA T5 - Add Client dialog open', dialogMs, SLA.DIALOG_OPEN)];
    console.log(`\n[PERF] Add Client Dialog:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'add-client-dialog-performance-metrics', summary);
  });
});
