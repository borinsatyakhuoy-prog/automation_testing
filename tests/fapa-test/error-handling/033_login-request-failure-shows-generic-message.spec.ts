import { test, expect } from '@playwright/test';
import { requireCredentials } from '../helpers/auth';

/**
 * All requests below are mocked via page.route - no real backend call ever
 * fires, so this is safe to run against the live account with correct
 * credentials on every CI run.
 *
 * Discovered 2026-07-21: POST /api/entrance/login failing with ANY of these
 * statuses (a real server outage) produces the exact same "Log in fail"
 * message as genuinely wrong credentials - a user with the correct password
 * has no way to tell a server outage apart from having mistyped their own
 * password. See specs/planner.md section 16.1.
 */
const STATUS_CODES = [401, 500, 502, 503, 504];

test.describe('Error Handling - Login request failures', () => {
  for (const status of STATUS_CODES) {
    test(`login shows the same "Log in fail" message when the server responds ${status}, even with correct credentials`, async ({ page }, testInfo) => {
      const { email, password } = requireCredentials();

      await page.route('**/api/entrance/login', (route) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: `Simulated ${status}` }) })
      );

      await page.goto('/login');
      await page.getByRole('textbox', { name: 'Enter your email' }).fill(email);
      await page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
      await page.getByRole('button', { name: 'Log in' }).click();

      await expect(page.getByText('Log in fail')).toBeVisible();
      await expect(page).toHaveURL(/\/login/);

      await testInfo.attach(`evidence - status ${status}`, {
        body:
          `Endpoint: POST /api/entrance/login\n` +
          `Mocked response status: ${status}\n` +
          `Credentials used: genuinely correct (FAPA_EMAIL/FAPA_PASSWORD)\n` +
          `Visible UI text: "Log in fail" (identical to what a wrong password produces)\n` +
          `URL after attempt: /login`,
        contentType: 'text/plain',
      });
    });
  }
});
