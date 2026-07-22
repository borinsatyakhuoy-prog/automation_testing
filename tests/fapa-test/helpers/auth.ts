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

export async function login(page: Page) {
  const { email, password } = requireCredentials();
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
