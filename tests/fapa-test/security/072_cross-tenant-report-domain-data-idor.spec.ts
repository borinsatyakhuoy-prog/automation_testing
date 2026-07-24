import { test, expect } from '@playwright/test';
import { loginAsClientPortal } from '../helpers/auth';

/**
 * HIGH severity, distinct from 069's group-dataclass gap: that one exposed
 * only internal classification labels. This one exposes real per-client
 * financial data across tenants.
 *
 * Discovered 2026-07-24: the report-by-UUID/PDF endpoints (see 070) are
 * correctly tenant-scoped - a CLIENT session gets 403 on another client's
 * report id. But the *underlying per-domain* endpoints that power each
 * section of the same report (confirmed live in
 * `specs/performance-sla.md`'s "Report generation architecture" table) take
 * a plain `client` NAME query parameter instead of deriving the client from
 * the authenticated session, and the backend does not check that name
 * against the caller's own tenant. Confirmed live with real, non-empty
 * response bodies (not just a 200 with an empty result) for
 * `/api/consolidation-global` (real portfolio totals) and `/api/passif`
 * (real liability rows: bank name, amounts, dates) using a second real
 * client ("QA Automation Client") while authenticated as a different one
 * ("QA Mail Test Client"). Any authenticated client-portal user who knows
 * or guesses another client's exact name string can pull that client's
 * portfolio, liabilities, real estate, rental income, art holdings, to-do
 * notes, and report-months data.
 *
 * Documented here as a regression *characterization* test (asserts the
 * current, leaking 200s) rather than a red/failing assertion - by explicit
 * request, matching how 069 handles the lower-severity group-dataclass gap,
 * so the suite stays green while this stays visible in the report. See
 * `specs/planner.md` §18 and `test-results/Report.md`'s Defects Log for the
 * full write-up, real response evidence, and urgent-priority recommendation
 * (this is the single most severe finding in this project's test history).
 */
const BASE = process.env.FAPA_BASE_URL ?? 'https://develop-fapa.allweb.cloud';
const OTHER_CLIENT_NAME = encodeURIComponent('QA Automation Client');
const OTHER_REPORT_ID = '4403cd88-0d96-4be4-a3ac-a964c78e9917'; // QA Automation Client's report
const OWN_REPORT_ID = '9fb26b9f-f6a1-4966-a464-18ef4d9e2a9e'; // QA Mail Test Client's own report

async function getStatus(page: import('@playwright/test').Page, path: string) {
  const res = await page.request.get(`${BASE}${path}`, { headers: { 'frontend-name': 'SPA' } });
  return res.status();
}

test.describe('Security - Cross-tenant report-domain data (HIGH severity known gap)', () => {
  test('report-by-id and its PDF are correctly tenant-scoped (positive baseline, not a gap)', async ({ page }) => {
    await loginAsClientPortal(page);

    expect(await getStatus(page, `/api/report/${OWN_REPORT_ID}`)).toBe(200);
    expect(await getStatus(page, `/api/report/${OTHER_REPORT_ID}`)).toBe(403);
    expect(await getStatus(page, `/api/report/${OTHER_REPORT_ID}/pdf`)).toBe(403);
    expect(await getStatus(page, `/api/report/check-validated/${OTHER_REPORT_ID}`)).toBe(403);
    expect(await getStatus(page, '/api/report/client?search=QA')).toBe(403);
  });

  test('KNOWN GAP: another client\'s portfolio/liabilities/real-estate/rental/art/todo data is reachable by name, not tenant-scoped', async ({ page }) => {
    await loginAsClientPortal(page);

    // Current (leaking) behavior: 200 with real data, not 403. See file
    // header - by request, this documents the gap rather than asserting
    // the secure behavior.
    expect(await getStatus(page, `/api/report/client/${OTHER_CLIENT_NAME}/months`)).toBe(200);
    expect(await getStatus(page, `/api/consolidation-global?date=2026-07-23&client=${OTHER_CLIENT_NAME}`)).toBe(200);
    expect(await getStatus(page, `/api/passif?client=${OTHER_CLIENT_NAME}&date=2026-07-23`)).toBe(200);
    expect(await getStatus(page, `/api/real-estate?client=${OTHER_CLIENT_NAME}&date=2026-07-23`)).toBe(200);
    expect(await getStatus(page, `/api/gestion-locative?client=${OTHER_CLIENT_NAME}&date=2026-07-23`)).toBe(200);
    expect(await getStatus(page, `/api/arts/clients/${OTHER_CLIENT_NAME}?reportDate=2026-07-23`)).toBe(200);
    expect(await getStatus(page, `/api/report-todos/clients/${OTHER_CLIENT_NAME}?reportDate=2026-07-23`)).toBe(200);
  });

  test('two of the nine per-domain endpoints are correctly blocked - inconsistent, not a blanket gap', async ({ page }) => {
    await loginAsClientPortal(page);

    expect(await getStatus(page, `/api/direct-private-equity/clients/related?client=${OTHER_CLIENT_NAME}`)).toBe(403);
    expect(await getStatus(page, `/api/unsupervised/stock/clientName/${OTHER_CLIENT_NAME}`)).toBe(403);
  });

  test('write endpoints correctly reject CLIENT before any processing (positive baseline)', async ({ page }) => {
    await loginAsClientPortal(page);

    const bogusReportId = '00000000-0000-4000-8000-000000000000';
    const res = await page.request.put(`${BASE}/api/report/validate/${bogusReportId}`, {
      headers: { 'frontend-name': 'SPA' },
    });
    expect(res.status()).toBe(403);
  });
});
