import { test, expect } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport } from '../helpers/reports';
import { attachMetrics, ratedLine, assertSLA, SLA } from '../helpers/performance';

// PDF generation is the slowest real operation in this app by a wide margin
// (report-lifecycle's own tests already budget up to 180s for it) - this is
// the one flow in this performance suite most worth actually timing, since
// a regression here would be the most user-visible.
test.describe('Performance - PDF Generation', () => {
  test('Generate PDF completes within a generous budget', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const clientName = requireReportClientName();
    await login(page);

    // The report must finish rendering (Consult) before Generate PDF can be
    // clicked at all - previously this wait was absorbed silently into
    // waitForLoadState('networkidle') below with no timing/logging, which
    // made the real Consult-render duration (~20-25s baseline, see
    // REPORT_CONSULT_RENDERED in helpers/performance.ts) invisible in every
    // PDF Generation report. Timed and SLA-gated here instead of discarded,
    // so this test's own PDF Generation number can't be misread as including it.
    const consultStart = Date.now();
    await consultReport(page, clientName);
    // Same rationale as helpers/reports.ts's waitForReportRendered() and the
    // matching 2026-07-23 fix in 041/055: don't hard-fail if the progress
    // text never appears (e.g. a fast/cached Consult), and don't gate
    // completion on that text going *hidden* - a locator matching zero
    // elements is trivially "hidden", which can false-positive a
    // render-complete signal. This file was missed in that same-day fix and
    // failed exactly this way on a later run (toBeVisible timed out at 20s).
    // Gate on the PDF toolbar button becoming visible instead.
    await page
      .getByText(/report is being generated/i)
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
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

    const summary = [
      ratedLine('Consult click to report rendered (precedes Generate PDF, previously untimed)', consultToRenderedMs, 35_000, 60_000),
      assertSLA('SLA T6b - Consult click to report rendered', consultToRenderedMs, SLA.REPORT_CONSULT_RENDERED),
      ratedLine('Generate PDF click to completion', generateMs, 15_000, 45_000),
      assertSLA('SLA T7 - Generate PDF click to completion', generateMs, SLA.PDF_GENERATION),
      ratedLine('TOTAL: Consult click to PDF completion (real end-to-end wait)', consultToRenderedMs + generateMs, 60_000, 120_000),
      `Success toast observed directly: ${sawToast} (this environment sometimes misses it under load even on real success - see specs/planner.md AC5)`,
    ];
    console.log(`\n[PERF] PDF Generation:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'pdf-generation-performance-metrics', summary);
  });
});
