import { test, expect } from '@playwright/test';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport, openMonthReportsList, openMonthReportActionsMenu } from '../helpers/reports';
import { getResourceDurations, assertP99SLA, attachMetrics, SLA } from '../helpers/performance';

/**
 * P99 SLA gate, applied across every tier rather than just T3 (API Read).
 * Every other performance spec in this suite gates a *single* measured
 * sample per run - a real but limited signal, since one lucky/unlucky
 * sample can't show tail behavior. This file instead repeats each flow N
 * times per run and gates the 99th-percentile duration (see
 * `assertP99SLA`/`percentile` in helpers/performance.ts), which is what
 * "P99 SLA" means in the industry-standard sense.
 *
 * Sample size is deliberately NOT uniform across tiers. This project runs
 * single-worker against one shared *live* dev account and explicitly avoids
 * generating repeated/concurrent load against it (see playwright.config.ts's
 * note on why, and specs/performance-sla.md's tail-latency findings). For
 * cheap tiers (nav clicks, API reads - tens to hundreds of ms each) 15-30
 * repeats costs seconds. For Consult (~15-30s each) and PDF Generation (up
 * to ~90s each, and each sample requires its own full Consult+Generate
 * cycle), 30 repeats would mean tens of minutes of continuous real report
 * generation against the same shared account - which risks *creating* the
 * exact sustained-load tail-latency conditions this suite has otherwise
 * been careful not to trigger. Those two tiers use a much smaller N (5 and
 * 3 respectively) and this is stated plainly in each test's own summary
 * output rather than presented as equivalent statistical rigor to the
 * cheap tiers' N=30 - with n=3-5, "P99" converges toward the observed max,
 * which is an honest, still-useful signal (worst case seen this run), just
 * not a true tail-percentile estimate.
 */

test.describe('Performance - P99 SLA (fast tiers)', () => {
  test('T2 Navigation P99 - Dashboard <-> Clients, 30 samples', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await login(page);

    const samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      const start = Date.now();
      await page.getByRole('button', { name: 'Clients' }).click();
      await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();
      samples.push(Date.now() - start);
    }

    const summary = [assertP99SLA('SLA T2 (P99) - Dashboard click to Clients visible', samples, SLA.NAVIGATION)];
    console.log(`\n[PERF] P99 Navigation:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'p99-navigation-performance-metrics', summary);
  });

  test('T3 API Read P99 - GET /api/client and /api/user, 30 samples each', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await login(page);

    for (let i = 0; i < 30; i++) {
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await page.getByRole('button', { name: 'Clients' }).click();
      await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const clientSamples = getResourceDurationsSlice(await getResourceDurations(page, '/api/client?page=0'), 30);

    for (let i = 0; i < 30; i++) {
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await page.getByRole('button', { name: 'Admins' }).click();
      await expect(page.getByRole('columnheader', { name: 'First Name' })).toBeVisible();
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const userSamples = getResourceDurationsSlice(await getResourceDurations(page, '/api/user?page=0'), 30);

    const summary = [
      assertP99SLA('SLA T3 (P99) - GET /api/client?...', clientSamples, SLA.API_READ),
      assertP99SLA('SLA T3 (P99) - GET /api/user?...', userSamples, SLA.API_READ),
    ];
    console.log(`\n[PERF] P99 API Read:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'p99-api-read-performance-metrics', summary);
  });

  test('T3 API Read P99 - GET /api/isin (2,438-row payload), 15 samples', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await login(page);

    // Unlike /api/client or /api/user, switching Markets tabs does NOT
    // refetch /api/isin - Angular keeps the ISIN tab component alive, so
    // ISIN<->Currency tab clicks fire zero new requests (confirmed live via
    // network inspection). A full nav-away-and-back (Dashboard -> Markets)
    // does trigger a fresh fetch each time, so that's the cycle used here.
    // N=15 rather than 30: each response is a real ~614 KB / 2,438-row JSON
    // payload (confirmed live, not paginated), so 15 repeats already moves
    // ~9 MB through the shared dev server - a reasonable middle ground
    // between a meaningful sample and needless repeated heavy transfer.
    //
    // Each cycle MUST wait for networkidle before the next one fires.
    // Root cause of a real, reproducible bug (2026-07-23): without this
    // wait, the loop fired all 15 nav cycles back-to-back - "ISIN tab
    // selected" resolves as soon as the tab UI switches, well before the
    // underlying data fetch completes, so cycle N+1 could fire while
    // cycle N's request (and its Dashboard-revisit siblings) were still
    // in flight. That self-inflicted request pile-up made each
    // subsequent /api/isin call queue behind a growing backlog, producing
    // a near-perfectly linear climb across the 15 samples (confirmed live:
    // 1,701 / 2,864 / 4,303 / ... / 21,006 ms) that had nothing to do with
    // the endpoint's real latency - a single, properly-paced call
    // consistently measured a flat ~1.6-1.8s TTFB. Pacing each cycle here
    // eliminates that artifact.
    for (let i = 0; i < 15; i++) {
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      await page.getByRole('button', { name: 'Markets' }).click();
      await expect(page.getByRole('tab', { name: 'ISIN', selected: true })).toBeVisible();
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(500);

    const isinDurations = getResourceDurationsSlice(await getResourceDurations(page, '/api/isin?month='), 15);

    const summary = [
      `Note: n=15 (not 30) because each sample is a real ~614 KB / 2,438-row payload - with n=15, P99 converges toward the observed max, same honesty caveat as the slow tiers below, but driven by payload size rather than duration cost.`,
      assertP99SLA('SLA T3 (P99) - GET /api/isin?month=2026-07 (2,438 rows)', isinDurations, SLA.API_READ),
    ];
    console.log(`\n[PERF] P99 ISIN (2,438-row payload):\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'p99-isin-performance-metrics', summary);
  });

  test('T3 API Read P99 - Markets Currency ("Devise") across a month/year range, 5 samples', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();
    await page.getByRole('tab', { name: 'Currency' }).click();
    await expect(page.getByRole('button', { name: 'Add Currency' })).toBeVisible();

    // Sweeps the month parameter across a wide historical range (current
    // month back to the earliest year this app's date picker allows, 2003)
    // rather than repeating the same month, since the "a lot of data"
    // concern here is about the data set varying by period, not the row
    // count within a single month (which stays ~10-14 rows regardless).
    // Types directly into the date field (a real, non-readonly text input)
    // rather than clicking through the calendar widget - confirmed live
    // that a plain `fill()` produces exactly one clean request per period,
    // where clicking through the year/month grid is fragile across repeat
    // cycles and character-by-character typing fires noisy intermediate
    // requests (including a literal `?month=Invalid%20date` 400) as the
    // partially-typed value gets live-reparsed on every keystroke.
    const periods = ['07/2026', '07/2024', '07/2020', '07/2010', '07/2003'];
    const dateField = page.getByRole('tabpanel', { name: 'Currency' }).locator('input').first();

    const perPeriod: string[] = [];
    const samples: number[] = [];
    for (const period of periods) {
      const start = Date.now();
      await dateField.fill(period);
      await dateField.press('Tab');
      await page.waitForLoadState('networkidle');
      const ms = Date.now() - start;
      samples.push(ms);
      perPeriod.push(`  ${period}: ${ms} ms`);
    }

    const currencyDurations = await getResourceDurations(page, '/api/currency-detail?month=');

    const summary = [
      `Per-period click-to-settled range (min ${Math.min(...samples)} ms / max ${Math.max(...samples)} ms):`,
      ...perPeriod,
      assertP99SLA(
        'SLA T3 (P99) - GET /api/currency-detail?month=... across 5 historical periods',
        currencyDurations.slice(0, periods.length),
        SLA.API_READ
      ),
    ];
    console.log(`\n[PERF] P99 Currency (Devise) month range:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'p99-currency-devise-range-performance-metrics', summary);
  });
});

test.describe('Performance - P99 SLA (slow tiers, reduced sample size)', () => {
  test('T6b Report Consult P99 - 5 samples (cost-scaled, see file header)', async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await login(page);
    const clientName = requireReportClientName();

    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await consultReport(page, clientName);
      await page
        .getByText(/report is being generated/i)
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => {});
      await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).waitFor({ state: 'visible', timeout: 75_000 });
      await page.waitForLoadState('networkidle');
      samples.push(Date.now() - start);
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    // Each Consult also fires ~11 independent per-domain "report section"
    // endpoints (see specs/performance-sla.md's "Report generation
    // architecture" section) - these 5 real Consult cycles are already
    // triggering them, so capture and gate them here too rather than
    // leaving them permanently undocumented ("discovered via network
    // inspection" but never actually measured).
    const sectionEndpoints: Array<[string, string]> = [
      ['GET /api/consolidation-global?', '/api/consolidation-global?'],
      ['GET /api/consolidation-global-filtered?', '/api/consolidation-global-filtered?'],
      ['GET /api/consolidation-global-bank?', '/api/consolidation-global-bank?'],
      ['GET /api/passif?', '/api/passif?'],
      ['GET /api/real-estate?', '/api/real-estate?'],
      ['GET /api/gestion-locative?', '/api/gestion-locative?'],
      ['GET /api/movements-bancaire?', '/api/movements-bancaire?'],
      ['GET /api/arts/clients/', '/api/arts/clients/'],
      ['GET /api/direct-private-equity/clients/related?', '/api/direct-private-equity/clients/related?'],
      ['GET /api/unsupervised/stock/clientName/', '/api/unsupervised/stock/clientName/'],
      ['GET /api/report-todos/clients/', '/api/report-todos/clients/'],
    ];
    const sectionSummary: string[] = [];
    for (const [label, substr] of sectionEndpoints) {
      const durations = await getResourceDurations(page, substr);
      sectionSummary.push(assertP99SLA(`SLA T3 (P99, n<=5) - ${label}`, durations.slice(0, 5), SLA.API_READ));
    }

    const summary = [
      assertP99SLA('SLA T6b (P99, n=5) - Consult click to report rendered', samples, SLA.REPORT_CONSULT_RENDERED),
      ...sectionSummary,
    ];
    console.log(`\n[PERF] P99 Report Consult:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'p99-report-consult-performance-metrics', summary);
  });

  test('T7 PDF Generation P99 - 3 samples (cost-scaled, see file header)', async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await login(page);
    const clientName = requireReportClientName();

    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      await consultReport(page, clientName);
      await page
        .getByText(/report is being generated/i)
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => {});
      await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).waitFor({ state: 'visible', timeout: 75_000 });

      const start = Date.now();
      await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).click();
      try {
        await expect(page.getByText('PDF generated successfully.')).toBeVisible({ timeout: 60_000 });
      } catch {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(15_000);
      }
      samples.push(Date.now() - start);

      // Opening the report's row actions menu is what triggers
      // GET /api/report/check-validated/{id} and GET /api/report/{id}/pdf
      // (confirmed live via network inspection) - already a real, expected
      // step in this project's report lifecycle (see 055), not a new
      // action added just to capture these two endpoints.
      await openMonthReportsList(page);
      await openMonthReportActionsMenu(page);
      await page.waitForLoadState('networkidle');
      // Close the still-open row actions menu - its overlay backdrop
      // otherwise intercepts the next click and hangs indefinitely.
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    const checkValidatedDurations = await getResourceDurations(page, '/api/report/check-validated/');
    // GET /api/report/{uuid}/pdf is easy to conflate with the similarly-
    // named GET /api/report/pdf?client=... (a different endpoint fired
    // during Consult) - getResourceDurations' plain substring match can't
    // tell them apart, so this one reads full URLs directly and matches
    // the UUID-then-/pdf shape specifically.
    const reportPdfDurations: number[] = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((r) => /\/api\/report\/[a-f0-9-]{20,}\/pdf(\?|$)/.test(r.name))
        .map((r) => Math.round(r.duration))
        .reverse();
    });

    const summary = [
      assertP99SLA('SLA T7 (P99, n=3) - Generate PDF click to completion', samples, SLA.PDF_GENERATION),
      assertP99SLA(
        'SLA T3 (P99, n<=3) - GET /api/report/check-validated/{id}',
        checkValidatedDurations.slice(0, 3),
        SLA.API_READ
      ),
      assertP99SLA('SLA T3 (P99, n<=3) - GET /api/report/{id}/pdf', reportPdfDurations.slice(0, 3), SLA.API_READ),
    ];
    console.log(`\n[PERF] P99 PDF Generation:\n  ${summary.join('\n  ')}`);
    await attachMetrics(testInfo, 'p99-pdf-generation-performance-metrics', summary);
  });
});

/** Resource Timing accumulates for the whole test; take only the most recent `n` (one per loop iteration). */
function getResourceDurationsSlice(durations: number[], n: number): number[] {
  return durations.slice(0, n);
}
