import { test, expect } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport } from '../helpers/reports';
import { getResourceDurations, attachMetrics, ratedLine, assertSLA, SLA } from '../helpers/performance';

// Uses the existing dedicated report-lifecycle client (already has real
// portfolio data imported) rather than a fresh/empty client, so Consult
// exercises the real report-fetch path instead of the no-data path.
test.describe('Performance - Reports Consult', () => {
  test('Consult renders the report within a generous budget', async ({ page }, testInfo) => {
    await login(page);
    const clientName = requireReportClientName();

    const consultStart = Date.now();
    await consultReport(page, clientName);
    await expect(page.getByText(/report is being generated/i)).toBeVisible({ timeout: 20_000 });
    const consultToProgressMs = Date.now() - consultStart;

    // The progress state appearing is not the same as Consult being done -
    // the report only actually renders once this message goes away. Measure
    // through to that point too, since that's the real user-facing
    // completion of "Consult" (see REPORT_CONSULT_RENDERED in helpers/performance.ts).
    await expect(page.getByText(/report is being generated/i)).toBeHidden({ timeout: 75_000 });
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
