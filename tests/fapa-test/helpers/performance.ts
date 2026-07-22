import { Page, TestInfo, expect } from '@playwright/test';

export interface NavigationMetrics {
  ttfb: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number | null;
  firstContentfulPaint: number | null;
}

/**
 * Reads the browser's own Navigation Timing Level 2 + Paint Timing entries
 * for the current document - real numbers from the actual page load, not an
 * external synthetic probe. Call right after the navigation that should be
 * measured (before further clicks), since these entries are per-document and
 * get reset on the next navigation.
 */
export async function getNavigationMetrics(page: Page): Promise<NavigationMetrics> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType('paint');
    const fp = paint.find((p) => p.name === 'first-paint')?.startTime ?? null;
    const fcp = paint.find((p) => p.name === 'first-contentful-paint')?.startTime ?? null;
    if (!nav) {
      return { ttfb: -1, domContentLoaded: -1, loadComplete: -1, firstPaint: fp, firstContentfulPaint: fcp };
    }
    return {
      ttfb: Math.round(nav.responseStart - nav.startTime),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      firstPaint: fp !== null ? Math.round(fp) : null,
      firstContentfulPaint: fcp !== null ? Math.round(fcp) : null,
    };
  });
}

/**
 * Reads Resource Timing entries for requests whose URL contains `urlSubstr`
 * (e.g. an API path like "/api/client") made since the last navigation.
 * Returns each match's duration in ms, most recent first.
 */
export async function getResourceDurations(page: Page, urlSubstr: string): Promise<number[]> {
  return page.evaluate((substr) => {
    return performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes(substr))
      .map((r) => Math.round(r.duration))
      .reverse();
  }, urlSubstr);
}

/** Attaches a human-readable metrics summary to the HTML/Allure report. */
export async function attachMetrics(testInfo: TestInfo, label: string, lines: string[]) {
  await testInfo.attach(label, { body: lines.join('\n'), contentType: 'text/plain' });
}

export type Rating = 'GOOD' | 'SLOW' | 'POOR';

/**
 * Rates a duration in ms against two thresholds: at or under `goodMax` is
 * GOOD, at or under `slowMax` is SLOW, anything above is POOR. Thresholds
 * are UX-heuristic (roughly aligned with Core Web Vitals-style tiers), not
 * a formal SLA - the point is a readable signal per flow, not a hard gate.
 */
export function rate(ms: number, goodMax: number, slowMax: number): Rating {
  if (ms <= goodMax) return 'GOOD';
  if (ms <= slowMax) return 'SLOW';
  return 'POOR';
}

/** Formats one metric line with its rating, e.g. "Login round trip: 812 ms  [GOOD]". */
export function ratedLine(label: string, ms: number, goodMax: number, slowMax: number): string {
  return `${label}: ${ms} ms  [${rate(ms, goodMax, slowMax)}]`;
}

/**
 * Formal performance SLA, per operation class. Unlike `rate()` above (a
 * readable heuristic signal only), every tier here has a hard `max` that a
 * test MUST fail against via `assertSLA()` - this is a real gate, not just a
 * label. `target` is the expected/healthy figure; a result between `target`
 * and `max` is a WARN (within SLA but degraded, worth watching), not a
 * failure. Values are calibrated from this project's own real baseline
 * measurements (specs/planner.md §17) with a deliberate margin so the SLA
 * catches genuine regressions without being flaky against this shared,
 * documented-as-variable live "develop" environment - see
 * specs/performance-sla.md for the full rationale per tier.
 */
export const SLA = {
  /** T1: full page load (goto -> load event) for an unauthenticated/initial page. */
  PAGE_LOAD: { target: 2_000, max: 8_000 },
  /** T2: in-app navigation - click a nav/tab control to its section's content visible. */
  NAVIGATION: { target: 2_000, max: 6_000 },
  /** T3: a single read (GET) API call - list, detail, or config fetch. */
  API_READ: { target: 800, max: 3_000 },
  /** T4: search/filter - typing/selecting a filter to the filtered result rendering. */
  SEARCH_FILTER: { target: 1_500, max: 5_000 },
  /** T5: opening a dialog/wizard (Add Client, Add Currency, Import File, etc.). */
  DIALOG_OPEN: { target: 1_000, max: 4_000 },
  /** T6: Reports Consult - click to the async "report is being generated" state. */
  REPORT_CONSULT: { target: 3_000, max: 10_000 },
  /** T7: PDF generation - the heaviest real operation in the app by a wide margin. */
  PDF_GENERATION: { target: 60_000, max: 120_000 },
  /** T8: a download-triggering action (Export, report Download) - click to the browser `download` event firing. */
  DOWNLOAD_ACTION: { target: 3_000, max: 10_000 },
} as const;

export type SlaTier = (typeof SLA)[keyof typeof SLA];

export type SlaVerdict = 'PASS' | 'WARN' | 'FAIL';

/** Rates a duration against a formal SLA tier: PASS (<= target), WARN (<= max), FAIL (> max). */
export function rateSla(ms: number, tier: SlaTier): SlaVerdict {
  if (ms <= tier.target) return 'PASS';
  if (ms <= tier.max) return 'WARN';
  return 'FAIL';
}

/**
 * Hard SLA gate: fails the test if `ms` exceeds `tier.max`. Returns a
 * formatted line (for attaching/logging) reporting PASS/WARN/FAIL against
 * both the target and the max, regardless of outcome.
 */
export function assertSLA(label: string, ms: number, tier: SlaTier): string {
  const verdict = rateSla(ms, tier);
  const line = `${label}: ${ms} ms  [SLA ${verdict} - target ${tier.target} ms / max ${tier.max} ms]`;
  expect(ms, `${label} exceeded the formal SLA max of ${tier.max} ms (measured ${ms} ms)`).toBeLessThanOrEqual(
    tier.max
  );
  return line;
}
