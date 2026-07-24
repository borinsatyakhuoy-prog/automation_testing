import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * AC1 covers explicit Sign Out (031_sign-out.spec.ts); this covers the
 * distinct, never-tested scenario of the session simply becoming invalid
 * while the app is open, functionally rather than via the JWT-signature
 * tamper test in security/071 (which is about token integrity, not this
 * dual-cookie expiry behavior).
 *
 * Confirmed live 2026-07-24: this app uses two cookies - a short-lived
 * `token` and a longer-lived `refresh_token`. Losing only `token` is
 * silently and transparently recovered via `refresh_token` (the user stays
 * on the protected page, no re-login needed) - a real, useful UX behavior
 * worth a regression test of its own. Only losing *both* (a fully expired/
 * cleared session) actually redirects to /login.
 */
test.describe('Auth - Session/token expiry', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('losing only the short-lived access token is silently recovered via the refresh token', async ({ page }) => {
    await page.context().clearCookies({ name: 'token' });

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    // Stays on the protected page - refresh_token silently re-authenticated,
    // no redirect to /login and no visible interruption to the user.
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.getByRole('button', { name: 'Add client' })).toBeVisible();
  });

  test('losing the entire session (no token, no refresh token) redirects to /login on the next protected navigation', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
  });
});
