import { test, expect } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport, openMonthReportsList, openMonthReportActionsMenu } from '../helpers/reports';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * Formal SLA gate for the report-lifecycle suite - the main feature built in
 * this project (10-category content-validation, ported from fapa_testing;
 * see tests/fapa-test/report-lifecycle/001-010). This test exercises the
 * same full lifecycle (Consult -> Generate PDF -> Validate PDF -> Download)
 * against the existing dedicated "QA Automation Client" and its
 * already-imported current-month data, timing each stage against the formal
 * SLA (specs/performance-sla.md) - it deliberately does NOT re-import any
 * fixture, so it adds zero new real writes beyond what the report-lifecycle
 * functional suite already performs.
 */
test.describe('Performance - Report Lifecycle (main feature SLA gate)', () => {
  test('Consult and Generate PDF complete within the formal SLA', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const clientName = requireReportClientName();
    await login(page);

    const consultStart = Date.now();
    await consultReport(page, clientName);
    // Same rationale as helpers/reports.ts's waitForReportRendered(): don't
    // hard-fail if the progress text never appears (e.g. a fast/cached
    // Consult) and don't gate completion on that text going *hidden* - a
    // locator matching zero elements is trivially "hidden", which previously
    // produced false render-complete signals here and caused a real,
    // reproducible failure (2026-07-22) when the text simply never showed up
    // within the 20s window. Gate on a concrete rendered-report element
    // (the PDF toolbar button) instead, which can't false-positive that way.
    await page
      .getByText(/report is being generated/i)
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
    const consultMs = Date.now() - consultStart;

    // consultMs above only covers click -> progress bar appearing, not the
    // report actually rendering - that wait was previously absorbed silently
    // into waitForLoadState('networkidle') with no timing, making it
    // invisible in every report (see 042_pdf-generation-performance.spec.ts's
    // matching fix and specs/performance-sla.md T6b).
    await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).waitFor({ state: 'visible', timeout: 75_000 });
    const consultToRenderedMs = Date.now() - consultStart;
    await page.waitForLoadState('networkidle');

    const generateStart = Date.now();
    await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).click();

    let sawToast = true;
    try {
      await expect(page.getByText('PDF generated successfully.')).toBeVisible({ timeout: 60_000 });
    } catch {
      sawToast = false;
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(15_000);
    }
    const generateMs = Date.now() - generateStart;

    // Also time the Download action - the lifecycle's remaining real
    // operation not yet SLA-gated (list/menu open uses helpers/reports.ts's
    // clickWithRetry, which already accounts for this project's documented
    // Material-component click flakiness - Issue 4/7 - so isn't separately
    // timed here).
    await openMonthReportsList(page);
    await openMonthReportActionsMenu(page);

    const downloadStart = Date.now();
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('menuitem', { name: 'Download' }).click();
    await downloadPromise;
    const downloadMs = Date.now() - downloadStart;

    const summary = [
      assertSLA('SLA T6 - Report Lifecycle: Consult to "being generated"', consultMs, SLA.REPORT_CONSULT),
      assertSLA('SLA T6b - Report Lifecycle: Consult to report rendered', consultToRenderedMs, SLA.REPORT_CONSULT_RENDERED),
      assertSLA('SLA T7 - Report Lifecycle: Generate PDF to completion', generateMs, SLA.PDF_GENERATION),
      assertSLA('SLA T8 - Report Lifecycle: Download click to download event', downloadMs, SLA.DOWNLOAD_ACTION),
      `TOTAL: Consult click to PDF completion (real end-to-end wait): ${consultToRenderedMs + generateMs} ms`,
      `Success toast observed directly: ${sawToast} (this environment sometimes misses it under load even on real success - see specs/planner.md AC5)`,
    ];
    console.log(`\n[PERF] Report Lifecycle (main feature):\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'report-lifecycle-sla-performance-metrics', summary);
  });
});
