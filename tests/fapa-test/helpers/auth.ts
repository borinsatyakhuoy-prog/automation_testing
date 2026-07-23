import { Page, expect } from '@playwright/test';

export function requireCredentials() {
  const email = process.env.FAPA_EMAIL;
  const password = process.env.FAPA_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'FAPA_EMAIL and FAPA_PASSWORD must be set in a local .env file (see .env.example). Never hardcode real credentials in test source.'
    );
  }
  return { email, password };
}

export function requireReportClientName() {
  const clientName = process.env.FAPA_REPORT_CLIENT_NAME;
  if (!clientName) {
    throw new Error(
      'FAPA_REPORT_CLIENT_NAME must be set in a local .env file (see .env.example) to run report generation/validation tests.'
    );
  }
  return clientName;
}

export function requireMailTestClientName() {
  const clientName = process.env.FAPA_MAIL_TEST_CLIENT_NAME;
  if (!clientName) {
    throw new Error(
      'FAPA_MAIL_TEST_CLIENT_NAME must be set in a local .env file (see .env.example) to run the mail-service notification test.'
    );
  }
  return clientName;
}

export function requireEmployeeCredentials() {
  const email = process.env.FAPA_EMPLOYEE_EMAIL;
  const password = process.env.FAPA_EMPLOYEE_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'FAPA_EMPLOYEE_EMAIL and FAPA_EMPLOYEE_PASSWORD must be set in a local .env file (see .env.example) - a dedicated EMPLOYE-role test account, set via Admins > Team Management > Add user then row menu > Reset password.'
    );
  }
  return { email, password };
}

export function requireClientPortalCredentials() {
  const email = process.env.FAPA_CLIENT_PORTAL_EMAIL;
  const password = process.env.FAPA_CLIENT_PORTAL_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'FAPA_CLIENT_PORTAL_EMAIL and FAPA_CLIENT_PORTAL_PASSWORD must be set in a local .env file (see .env.example) - set via Clients > row menu > Reset password on an existing client record.'
    );
  }
  return { email, password };
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Enter your email' }).fill(email);
  await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  // This environment has documented tail-latency variance under load (see
  // Issue 19 / test-results/exploratory-findings.md) - the default 5s expect
  // timeout has been observed to fire while login is still genuinely
  // in-flight (no error shown, button still disabled), not actually failed.
  // A generous explicit timeout avoids a false failure on a slow-but-real login.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

export async function login(page: Page) {
  const { email, password } = requireCredentials();
  await loginAs(page, email, password);
}

/**
 * Logs in as a dedicated EMPLOYE-role test account (see
 * requireEmployeeCredentials). Unlike the ADMIN account every other test in
 * this suite uses, EMPLOYE has no "Admins" nav item at all and is
 * server-side blocked from /admin (confirmed live: direct navigation
 * redirects away, not just a hidden UI link) - used to verify role-scoped
 * performance parity rather than assuming EMPLOYE behaves identically.
 */
export async function loginAsEmployee(page: Page) {
  const { email, password } = requireEmployeeCredentials();
  await loginAs(page, email, password);
}

/**
 * Logs in as a client-portal account (see requireClientPortalCredentials) -
 * a genuinely distinct, restricted role from ADMIN/EMPLOYE: only
 * "Dashboard" and "Reports" in the nav, no access to Admins/Clients/Markets
 * /Upload. Confirmed live that this account only shows real data once an
 * advisor has Consulted, Generated, and *Validated* a PDF for it - Validate
 * is the actual publish step (its own confirmation dialog literally says
 * "Once validated, this PDF will be visible on the client's dashboard"),
 * not Consult or Generate PDF alone.
 */
export async function loginAsClientPortal(page: Page) {
  const { email, password } = requireClientPortalCredentials();
  await loginAs(page, email, password);
}
