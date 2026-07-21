import { Page, TestInfo } from '@playwright/test';

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
