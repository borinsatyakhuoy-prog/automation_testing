import { test } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport } from '../helpers/reports';
import { getResourceDurations, attachMetrics, ratedLine, assertSLA, SLA } from '../helpers/performance';

// Uses the existing dedicated report-lifecycle client (already has real
// portfolio data imported) rather than a fresh/empty client, so Consult
// exercises the real report-fetch path instead of the no-data path.
test.describe('Performance - Reports Consult', () => {
  test('Consult renders the report within a generous budget', async ({ page }, testInfo) => {
    // Consult alone can legitimately take up to the SLA's 75s max (see
    // REPORT_CONSULT_RENDERED), and this test still has metrics/attachment
    // work to do after that wait - the previous default 30s test timeout
    // could fire mid-test even when every SLA assertion below would have
    // passed (observed live: consult finished in 29.2s, well under the 75s
    // SLA max, but the test itself still timed out at 30s).
    test.setTimeout(120_000);
    await login(page);
    const clientName = requireReportClientName();

    const consultStart = Date.now();
    await consultReport(page, clientName);
    // Same rationale as helpers/reports.ts's waitForReportRendered(): don't
    // hard-fail if the progress text never appears (e.g. a fast/cached
    // Consult), and don't gate completion on that text going *hidden* - a
    // locator matching zero elements is trivially "hidden", which can
    // false-positive a render-complete signal. Gate on a concrete
    // rendered-report element (the PDF toolbar button) instead.
    await page
      .getByText(/report is being generated/i)
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
    const consultToProgressMs = Date.now() - consultStart;

    // The progress state appearing is not the same as Consult being done -
    // the report only actually renders once the PDF toolbar shows up.
    // Measure through to that point too, since that's the real user-facing
    // completion of "Consult" (see REPORT_CONSULT_RENDERED in helpers/performance.ts).
    await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).waitFor({ state: 'visible', timeout: 75_000 });
    const consultToRenderedMs = Date.now() - consultStart;

    const reportDurations = await getResourceDurations(page, '/api/report/');

    const summary = [
      ratedLine('Consult click to "report is being generated" progress state', consultToProgressMs, 2000, 6000),
      assertSLA('SLA T6 - Consult click to "report is being generated"', consultToProgressMs, SLA.REPORT_CONSULT),
      ratedLine('Consult click to report actually rendered (the real "Consult" completion)', consultToRenderedMs, 35000, 60000),
      assertSLA('SLA T6b - Consult click to report rendered', consultToRenderedMs, SLA.REPORT_CONSULT_RENDERED),
      reportDurations[0] !== undefined
        ? ratedLine(`GET /api/report/${clientName}/ duration`, reportDurations[0], 800, 2500)
        : `GET /api/report/${clientName}/ duration: n/a`,
      reportDurations[0] !== undefined
        ? assertSLA(`SLA T3 - GET /api/report/${clientName}/`, reportDurations[0], SLA.API_READ)
        : `SLA T3 - GET /api/report/${clientName}/: n/a`,
    ];
    console.log(`\n[PERF] Reports Consult:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'reports-consult-performance-metrics', summary);
  });
});
