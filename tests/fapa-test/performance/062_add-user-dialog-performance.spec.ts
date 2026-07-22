import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

test.describe('Performance - Add User Dialog', () => {
  test('Add user dialog opens within SLA (cancel, do not submit)', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();

    const start = Date.now();
    await page.getByRole('button', { name: 'Add user' }).click();
    const dialog = page.getByRole('dialog').or(page.locator('.mat-mdc-dialog-container'));
    await expect(dialog).toBeVisible();
    const dialogMs = Date.now() - start;

    // Do NOT fill in or submit this form - the environment holds real production-like user data.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    const summary = [assertSLA('SLA T5 - Add user dialog open', dialogMs, SLA.DIALOG_OPEN)];
    console.log(`\n[PERF] Add User Dialog:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'add-user-dialog-performance-metrics', summary);
  });
});
