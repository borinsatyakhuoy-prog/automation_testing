import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Reports' }).click();
  });

  // Exploratory testing found TWO distinct real behaviors for a month marked
  // "*" (no/limited data): an "Invalid month to generate report." error for
  // one client/month, and a "Copy data" dialog (offering to copy asset-class
  // data from elsewhere) for another. See test-results/exploratory-findings.md,
  // New Issue #2. This test accepts either as a valid "handled" outcome and
  // exists to catch a THIRD, unhandled outcome (e.g. an unhandled exception).
  test('selecting a no-data month surfaces a handled error or a Copy data prompt', async ({ page }) => {
    const clientField = page.getByRole('textbox', { name: 'Select a client' });
    await clientField.fill('a');
    await clientField.click();
    await page.getByRole('menu').getByRole('menuitem').first().click();

    // The dropdown trigger's accessible text is the month plus the
    // "keyboard_arrow_down" icon ligature concatenated together, which
    // distinguishes it from the individual month options once the list is open.
    await page.getByText(/\d{4}\/\d{2}\*?keyboard_arrow_down/).click();
    const starredMonth = page.getByText(/^\d{4}\/\d{2}\*$/).first();
    if (await starredMonth.isVisible()) {
      await starredMonth.click();
    } else {
      // No starred month available in this data set right now; skip rather than false-fail.
      test.skip();
    }

    await page.getByRole('button', { name: 'Consult' }).click();

    const invalidMonthError = page.getByText('Invalid month to generate report.');
    const copyDataDialog = page.getByRole('heading', { name: 'Copy data' });

    await expect(invalidMonthError.or(copyDataDialog)).toBeVisible();

    // If the Copy data dialog appeared, close it without submitting - it would
    // otherwise copy real asset-class data into this client's report.
    if (await copyDataDialog.isVisible()) {
      await page.getByRole('button', { name: 'Cancel' }).click();
    }
  });
});
