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

export async function login(page: Page) {
  const { email, password } = requireCredentials();
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Enter your email' }).fill(email);
  await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
