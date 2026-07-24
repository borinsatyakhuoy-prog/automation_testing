import { test, expect } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport, waitForReportRendered } from '../helpers/reports';

/**
 * Discovered 2026-07-21 (specs/planner.md §12.4), never automated until now:
 * the report toolbar's unlabeled "sync" icon (tooltip "Synchronize") opens a
 * "Data synchronisation" dialog that can completely REPLACE the current
 * month's data for a client with an older month's data - a genuinely
 * destructive, one-way action explicitly never confirmed-through in the
 * original investigation for exactly that reason.
 *
 * This test exercises the full flow up to (not including) the destructive
 * confirm: open Sync, select a source month, open the "Confirmation of
 * synchronization" dialog, then Cancel at that final step. Never clicks
 * "Confirm" - doing so would overwrite "QA Automation Client"'s current
 * month, the same client/month the entire report-lifecycle suite depends on
 * being populated.
 */
test.describe('Reports - Sync (Data synchronisation) cancel path', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Sync dialog requires a source month, and its confirmation step can be cancelled without replacing data', async ({ page }) => {
    test.setTimeout(120_000);
    const clientName = requireReportClientName();

    await consultReport(page, clientName);
    await waitForReportRendered(page);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button').filter({ hasText: /^sync$/ }).click();
    // Scoped by each dialog's own title text, not position - both dialogs
    // stack (the confirmation opens on top of this one), so a positional
    // `.last()`/unscoped locator re-resolves to whichever is topmost at
    // query time rather than tracking a specific dialog through the flow.
    const syncDialog = page.locator('[role="dialog"], mat-dialog-container').filter({ hasText: 'Data synchronisation' });
    await expect(syncDialog).toBeVisible();

    const synchronizeButton = syncDialog.getByRole('button', { name: 'Synchronize' });
    await expect(synchronizeButton).toBeDisabled();

    await syncDialog.getByRole('combobox', { name: 'Choose asset class' }).click();
    const firstOption = page.getByRole('option').first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();
    await expect(synchronizeButton).toBeEnabled();

    await synchronizeButton.click();
    const confirmDialog = page.locator('[role="dialog"], mat-dialog-container').filter({ hasText: 'Confirmation of synchronization' });
    await expect(confirmDialog.getByText(/completely replaced/i)).toBeVisible();

    // Do NOT click Confirm - this would overwrite real client data.
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmDialog).toBeHidden();

    // Cancelling the confirmation returns to the Sync dialog, not straight
    // to the report - close that too, so no dialog is left open.
    await expect(syncDialog).toBeVisible();
    await syncDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(syncDialog).toBeHidden();
  });
});
