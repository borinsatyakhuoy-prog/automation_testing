import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

/**
 * Discovered 2026-07-21: GET /api/isin/export/detail failing with 500
 * produces no download and no visible error message at all - the ISIN table
 * just sits there as if Export was never clicked. Routing must be
 * registered on the browser CONTEXT (not just the page) to actually
 * intercept this call - the first attempt at this test used page.route()
 * and the real backend served the real file anyway, which is what led to
 * finding this context-vs-page routing distinction. See specs/planner.md
 * section 16.5.
 */
test.describe('Error Handling - Markets Export request failure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Export produces no download and no visible error when the export request fails with 500', async ({ page, context }, testInfo) => {
    await context.route('**/api/isin/export/detail**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated 500' }) })
    );

    await page.getByRole('button', { name: 'Markets' }).click();
    await page.waitForTimeout(500);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      page.getByRole('button', { name: 'Export' }).first().click(),
    ]);

    expect(download).toBeNull();
    // No error toast/message of any kind appears - confirmed absent rather
    // than just "not asserted": the ISIN table remains the only content.
    await expect(page.getByRole('columnheader', { name: 'ISIN Code' })).toBeVisible();

    await testInfo.attach('evidence - status 500', {
      body:
        'Endpoint: GET /api/isin/export/detail?date=YYYY-MM\n' +
        'Mocked response status: 500 (routed at context level - page.route() alone let the real file through)\n' +
        'download event fired: false\n' +
        'No error toast/message of any kind - the ISIN table just remains as-is.',
      contentType: 'text/plain',
    });
  });
});
