import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * Discovered 2026-07-21: GET /api/client failing with ANY status (400-504)
 * or even a hard connection failure produces no visible error at all - the
 * table just silently renders its normal empty state ("Search not found",
 * "0 of 0"), identical to a legitimate zero-result search. See
 * specs/planner.md section 16.2.
 */
const STATUS_CODES = [401, 500, 503];

test.describe('Error Handling - Clients list request failures', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const status of STATUS_CODES) {
    test(`Clients list silently shows an empty state when the server responds ${status}, with no visible error`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

      await page.route('**/api/client?**', (route) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: `Simulated ${status}` }) })
      );

      await page.getByRole('button', { name: 'Clients' }).click();
      await page.waitForTimeout(1500);

      await expect(page.getByText('Search not found')).toBeVisible();
      await expect(page.getByText('0 of 0')).toBeVisible();

      await testInfo.attach(`evidence - status ${status}`, {
        body:
          `Endpoint: GET /api/client?page=0&size=10...\n` +
          `Mocked response status: ${status}\n` +
          `Visible UI: "Search not found" / "0 of 0" (identical to a genuine empty search)\n` +
          `Console errors captured (dev-tools only, invisible to a real user):\n` +
          consoleErrors.map((e) => `  - ${e}`).join('\n'),
        contentType: 'text/plain',
      });
    });
  }

  test('a hard connection failure produces the same silent empty state as an HTTP error', async ({ page }, testInfo) => {
    await page.route('**/api/client?**', (route) => route.abort('connectionrefused'));

    await page.getByRole('button', { name: 'Clients' }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Search not found')).toBeVisible();
    await expect(page.getByText('0 of 0')).toBeVisible();

    await testInfo.attach('evidence - connectionrefused', {
      body:
        'Endpoint: GET /api/client?page=0&size=10...\n' +
        "Simulated failure: route.abort('connectionrefused') - a total connection failure, not an HTTP status\n" +
        'Visible UI: "Search not found" / "0 of 0" - identical to every mocked HTTP error above',
      contentType: 'text/plain',
    });
  });
});
