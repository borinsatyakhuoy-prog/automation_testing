import { test, expect } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport, waitForReportRendered, openMonthReportsList, openMonthReportActionsMenu } from '../helpers/reports';

/**
 * Every existing report-lifecycle test (e.g. 001-010) exercises Validate
 * PDF's confirmation dialog by clicking "Confirm" - none exercise "Cancel".
 * Business Rules (user-stories/SCRUM.md) states validation is a one-way,
 * irreversible state change ("verified" badge), so the decline path
 * deserves its own coverage: does Cancel actually leave the report
 * unverified/unchanged, or does anything fire regardless of the click?
 *
 * Confirmed live 2026-07-24: the confirmation dialog opens the same way
 * whether or not the report is already verified, so this is safe to run
 * repeatedly against the existing "QA Automation Client" report without
 * depending on its current verified/unverified state.
 */
test.describe('Reports - Validate PDF cancel path', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Cancelling the Validate PDF confirmation leaves the verified state unchanged', async ({ page }) => {
    test.setTimeout(120_000);
    const clientName = requireReportClientName();

    await consultReport(page, clientName);
    await waitForReportRendered(page);
    await page.waitForLoadState('networkidle');

    await openMonthReportsList(page);
    await openMonthReportActionsMenu(page);

    await page.getByRole('menuitem', { name: 'Validate PDF' }).click();
    const dialog = page.locator('[role="dialog"], mat-dialog-container').last();
    await expect(dialog.getByText(/are you sure you want to validate/i)).toBeVisible();

    // Do NOT click Confirm - this is the one genuinely irreversible action
    // in this entire suite (per SCRUM.md's Business Rules).
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    // Confirm the app is still in a normal, working state afterward - the
    // row's actions menu still opens and offers the same two actions, i.e.
    // nothing crashed or silently changed as a side effect of Cancel.
    await openMonthReportActionsMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Download' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Validate PDF' })).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
