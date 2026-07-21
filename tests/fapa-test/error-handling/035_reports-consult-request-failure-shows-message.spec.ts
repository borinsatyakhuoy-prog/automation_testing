import { test, expect } from '@playwright/test';
import { login, requireMailTestClientName } from '../helpers/auth';

/**
 * Discovered 2026-07-21: unlike Login, Clients list, Upload Import, and
 * Markets Export (all silent or misleading on failure - see this folder's
 * other specs), Reports Consult is the one flow that handles a genuine
 * server error well: both 500 and 502/503 show a clear, generic
 * "The server was unable to complete your request. Please try again later."
 * message, distinct from the business-logic "Invalid month to generate
 * report." message used for a real no-data month (see specs/planner.md
 * section 12.3). This test protects that good behavior from regressing.
 * See specs/planner.md section 16.3.
 */
const STATUS_CODES = [500, 503];

test.describe('Error Handling - Reports Consult request failures', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const status of STATUS_CODES) {
    test(`Consult shows a clear "try again later" message when the report request fails with ${status}`, async ({ page }, testInfo) => {
      const clientName = requireMailTestClientName();

      await page.route('**/api/report/**', (route) => {
        const url = route.request().url();
        if (url.includes('/months') || url.includes('/client?')) return route.continue();
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: `Simulated ${status}` }) });
      });

      await page.getByRole('button', { name: 'Reports' }).click();
      await page.getByRole('textbox', { name: 'Select a client' }).click();
      await page.getByRole('textbox', { name: 'Select a client' }).fill(clientName);
      await page.getByRole('menuitem', { name: clientName }).click();
      await page.getByRole('button', { name: 'Consult' }).click();

      await expect(
        page.getByText('The server was unable to complete your request. Please try again later.')
      ).toBeVisible({ timeout: 10_000 });

      await testInfo.attach(`evidence - status ${status}`, {
        body:
          `Endpoint: GET /api/report/${clientName}/\n` +
          `Mocked response status: ${status}\n` +
          `Visible UI: "The server was unable to complete your request. Please try again later."\n` +
          `Contrast: kept distinct from the "Invalid month to generate report." business-logic message (specs/planner.md 12.3) - the one flow in this project that gets error messaging right.`,
        contentType: 'text/plain',
      });
    });
  }
});
