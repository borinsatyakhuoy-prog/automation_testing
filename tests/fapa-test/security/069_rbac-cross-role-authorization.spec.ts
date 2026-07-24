import { test, expect } from '@playwright/test';
import { loginAsEmployee, loginAsClientPortal } from '../helpers/auth';

/**
 * All requests below are real, authenticated GETs against the live backend
 * (no mocking) - safe because every one is read-only and none of these
 * endpoints has a side effect. `frontend-name: SPA` is a required header on
 * every API call (confirmed live - its absence alone causes a 401
 * regardless of session validity); it is not a security boundary since its
 * value is static and visible in every browser request, only included here
 * because the backend requires it to route the request at all.
 *
 * Discovered 2026-07-24 by request ("explore more api endpoint and try to
 * find is any endpoint can be exposed or unsafe"): every admin-only endpoint
 * tested correctly rejects EMPLOYE/CLIENT with 403, *except*
 * `GET /api/group-dataclass` (Admins > Unsupervised Asset Classes), which
 * both non-admin roles can call successfully even though neither has any UI
 * path to it at all. Impact is limited - the endpoint only returns internal
 * asset-classification labels, no client PII/financial data - but it's a
 * real, reproducible gap in server-side authorization the UI happens to
 * mask. Documented here as a regression *characterization* test (asserts
 * the current, buggy 200) rather than a red/failing assertion, matching how
 * this project documents other known product-behavior gaps (e.g. the
 * /markets direct-nav quirk in navigation tests) - by explicit choice, so
 * the gap stays visible in the report without turning the suite red. See
 * `specs/planner.md`'s API-Exposure Security Review section and
 * `test-results/Report.md` Defects Log for the full write-up and severity.
 */
const BASE = process.env.FAPA_BASE_URL ?? 'https://develop-fapa.allweb.cloud';

async function getStatus(page: import('@playwright/test').Page, path: string) {
  const res = await page.request.get(`${BASE}${path}`, { headers: { 'frontend-name': 'SPA' } });
  return res.status();
}

test.describe('Security - RBAC cross-role authorization', () => {
  test('EMPLOYE is correctly blocked from admin-only endpoints (403)', async ({ page }) => {
    await loginAsEmployee(page);

    expect(await getStatus(page, '/api/user')).toBe(403);
    expect(await getStatus(page, '/api/ip-white-list')).toBe(403);
    expect(await getStatus(page, '/api/entrance/list-logs')).toBe(403);
  });

  test('EMPLOYE can reach /api/group-dataclass directly despite no UI access - known gap, documented not fixed', async ({ page }) => {
    await loginAsEmployee(page);

    // Current (buggy) behavior: 200, not 403. See file header - by request,
    // this documents the gap rather than asserting the secure behavior.
    expect(await getStatus(page, '/api/group-dataclass')).toBe(200);
  });

  test('CLIENT is correctly blocked from every admin/employee-only endpoint (403)', async ({ page }) => {
    await loginAsClientPortal(page);

    expect(await getStatus(page, '/api/user')).toBe(403);
    expect(await getStatus(page, '/api/ip-white-list')).toBe(403);
    expect(await getStatus(page, '/api/entrance/list-logs')).toBe(403);
    expect(await getStatus(page, '/api/client')).toBe(403);
    expect(await getStatus(page, '/api/isin?month=2026-07')).toBe(403);
    expect(await getStatus(page, '/api/report?page=0&itemsPerPage=20&sortDir=asc')).toBe(403);
  });

  test('CLIENT can reach /api/group-dataclass directly despite no UI access - same known gap as EMPLOYE', async ({ page }) => {
    await loginAsClientPortal(page);

    // Current (buggy) behavior: 200, not 403 - confirms the gap has no
    // role-based enforcement at all, not just an EMPLOYE-specific miss.
    expect(await getStatus(page, '/api/group-dataclass')).toBe(200);
  });
});
