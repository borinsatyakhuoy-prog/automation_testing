import { test, expect } from '@playwright/test';
import { loginAsClientPortal } from '../helpers/auth';

/**
 * IDOR (Insecure Direct Object Reference) check: does the client-portal role
 * - the most restricted, single-tenant role in the app - get its own
 * account data scoped correctly, or can it reach *other* clients' account
 * records by guessing/incrementing an id? Account ids are small,
 * sequential-ish 3-digit integers (confirmed live via /api/client - e.g.
 * 340, 366, 395), unlike report ids which are opaque UUIDs, so this
 * endpoint would be the realistic IDOR target if authorization regressed.
 *
 * Discovered 2026-07-24: no IDOR found - every id below (including the
 * client's *own* account id) returns 403, because /api/account/{id} is an
 * advisor/admin-facing client-management endpoint the client-portal
 * frontend never calls for its own profile (it uses /api/dashboard and
 * /api/me instead). Documented as a regression test for the secure
 * behavior, since this one already matches what's expected - unlike 069's
 * group-dataclass gap, there is nothing to characterize-as-known-bug here.
 */
const BASE = process.env.FAPA_BASE_URL ?? 'https://develop-fapa.allweb.cloud';
const OTHER_CLIENT_ACCOUNT_IDS = [340, 366, 395];
const OWN_CLIENT_ACCOUNT_ID = 421; // QA Mail Test Client - the account behind FAPA_CLIENT_PORTAL_EMAIL

async function getStatus(page: import('@playwright/test').Page, path: string) {
  const res = await page.request.get(`${BASE}${path}`, { headers: { 'frontend-name': 'SPA' } });
  return res.status();
}

test.describe('Security - Cross-tenant IDOR checks', () => {
  test('CLIENT cannot fetch other clients\' account records by id', async ({ page }) => {
    await loginAsClientPortal(page);

    for (const id of OTHER_CLIENT_ACCOUNT_IDS) {
      expect(await getStatus(page, `/api/account/${id}`)).toBe(403);
    }
  });

  test('CLIENT cannot fetch its own account record via the advisor-facing endpoint either (correctly scoped elsewhere)', async ({ page }) => {
    await loginAsClientPortal(page);

    expect(await getStatus(page, `/api/account/${OWN_CLIENT_ACCOUNT_ID}`)).toBe(403);
  });

  test('CLIENT cannot list all reports across clients', async ({ page }) => {
    await loginAsClientPortal(page);

    expect(await getStatus(page, '/api/report?page=0&itemsPerPage=20&sortDir=asc')).toBe(403);
  });
});
