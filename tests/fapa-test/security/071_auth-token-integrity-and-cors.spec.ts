import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * Two checks that don't fit the RBAC/IDOR shape of 069/070:
 *
 * 1) JWT signature integrity - the app embeds role/permission claims
 *    directly in a PS256 (RSA-PSS)-signed token (confirmed live by decoding
 *    the login response), stored as an HttpOnly cookie (not readable via
 *    document.cookie/localStorage - good practice). If the backend didn't
 *    actually verify the signature, an attacker could hand-craft a token
 *    claiming ADMIN. Confirmed 2026-07-24 that it does: flipping one
 *    character in the signature segment produces an immediate 401 on the
 *    next authenticated call.
 *
 * 2) CORS - Access-Control-Allow-Origin is pinned to the app's own origin
 *    (confirmed via response headers on the login call), not wildcarded or
 *    reflected. Confirmed here that sending an arbitrary attacker Origin
 *    gets a flat 403 rather than a reflected allow.
 *
 * Both are positive findings (no fix needed) - kept as regression tests so
 * a future change can't silently weaken either without a test noticing.
 */
const BASE = process.env.FAPA_BASE_URL ?? 'https://develop-fapa.allweb.cloud';

test.describe('Security - Auth token integrity and CORS', () => {
  test('a tampered JWT signature is rejected, and the original token still works after restoring it', async ({ page }) => {
    await login(page);

    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'token');
    expect(tokenCookie, 'expected an httpOnly "token" cookie to be set after login').toBeTruthy();
    expect(tokenCookie!.httpOnly).toBe(true);

    const parts = tokenCookie!.value.split('.');
    const sig = parts[2];
    const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    const tamperedToken = `${parts[0]}.${parts[1]}.${flipped}`;

    await page.context().addCookies([{ ...tokenCookie!, value: tamperedToken }]);
    const tamperedRes = await page.request.get(`${BASE}/api/me`, { headers: { 'frontend-name': 'SPA' } });
    expect(tamperedRes.status()).toBe(401);

    // Restore the real token so later tests in the same worker aren't left signed out.
    await page.context().addCookies([tokenCookie!]);
    const restoredRes = await page.request.get(`${BASE}/api/me`, { headers: { 'frontend-name': 'SPA' } });
    expect(restoredRes.status()).toBe(200);
  });

  test('an arbitrary attacker Origin is not reflected in Access-Control-Allow-Origin', async ({ page }) => {
    await login(page);

    const res = await page.request.get(`${BASE}/api/me`, {
      headers: { 'frontend-name': 'SPA', origin: 'https://evil-attacker.example.com' },
    });

    expect(res.status()).toBe(403);
    expect(res.headers()['access-control-allow-origin']).not.toBe('https://evil-attacker.example.com');
  });
});
