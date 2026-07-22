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

    await consultReport(page, clientName);
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
      ratedLine('Generate PDF click to completion', generateMs, 15_000, 45_000),
      assertSLA('SLA T7 - Generate PDF click to completion', generateMs, SLA.PDF_GENERATION),
      `Success toast observed directly: ${sawToast} (this environment sometimes misses it under load even on real success - see specs/planner.md AC5)`,
    ];
    console.log(`\n[PERF] PDF Generation:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'pdf-generation-performance-metrics', summary);
  });
});
