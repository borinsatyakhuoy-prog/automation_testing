import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { attachMetrics, assertSLA, SLA } from '../helpers/performance';

/**
 * Real, unmocked ISIN export - read-only against the live account (Export
 * downloads existing reference data, never mutates it - see specs/planner.md
 * §9.4). Gated against SLA T8 (Download Action). Complements
 * error-handling/037_markets-export-request-failure-silent.spec.ts, which
 * covers the mocked-failure path rather than real timing.
 */
test.describe('Performance - Markets Export', () => {
  test('ISIN export completes within SLA', async ({ page }, testInfo) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();

    const exportStart = Date.now();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.getByRole('button', { name: 'Export' }).first().click(),
    ]);
    const exportMs = Date.now() - exportStart;

    expect(download.suggestedFilename()).toMatch(/isin.*\.xlsx$/i);

    const summary = [assertSLA('SLA T8 - ISIN Export click to download', exportMs, SLA.DOWNLOAD_ACTION)];
    console.log(`\n[PERF] Markets Export:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'markets-export-performance-metrics', summary);
  });
});
