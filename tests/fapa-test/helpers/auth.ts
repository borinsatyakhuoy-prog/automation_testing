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
  await expect(page).toHaveURL(/\/dashboard/);
}
