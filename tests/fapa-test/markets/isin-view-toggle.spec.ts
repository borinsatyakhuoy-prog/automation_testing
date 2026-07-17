import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Markets - ISIN', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Markets' }).click();
  });

  test('calendar/list view toggle swaps the underlying dataset, not just the display', async ({ page }) => {
    // Both the calendar-view and list-view tabpanels' paginators exist in the DOM
    // at once (one hidden); scope to the currently-visible one to avoid ambiguity.
    const rowCountLabel = page.locator('.mat-mdc-paginator-range-label:visible');
    const calendarCount = await rowCountLabel.textContent();

    // The page has two radiogroups: the FR/EN language toggle (first) and this
    // calendar/list view-mode toggle (second) - scope to the second explicitly
    // so this doesn't accidentally click the language switch.
    const viewToggle = page.getByRole('radiogroup').nth(1);
    await viewToggle.getByRole('radio').nth(1).click();

    // Retry rather than reading immediately: the paginator briefly shows "0 of 0"
    // while the list-view dataset loads. A different total from the calendar
    // view confirms this is a different dataset, not merely a re-layout.
    await expect(rowCountLabel).not.toHaveText(calendarCount ?? '', { timeout: 10000 });
    await expect(rowCountLabel).not.toHaveText(/0 of 0/, { timeout: 10000 });
  });
});
