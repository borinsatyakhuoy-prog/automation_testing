import { Page } from '@playwright/test';

/**
 * Navigates to Reports, selects the given client, and clicks Consult.
 *
 * Root cause of a real, reproducible failure (2026-07-20): the month
 * selector next to the client field sometimes stays completely empty after
 * selecting a client - confirmed live and reproducibly, not just an
 * automation-timing artifact - even though Consult is already enabled.
 * Clicking Consult while empty is a no-op that leaves every subsequent step
 * waiting on report UI (e.g. the "list" view toggle) hanging until timeout.
 * A passive wait for auto-populate isn't reliable enough (observed taking
 * longer than 10s with no value ever appearing), so this explicitly opens
 * the month dropdown and picks the current month every time - confirmed to
 * reopen the same way whether or not a value was already showing.
 *
 * The dropdown list marks every option with a trailing "*" EXCEPT the one
 * matching whatever the field already holds (confirmed live: when the field
 * had correctly auto-populated with the current month, that entry alone
 * appeared without the "*", while every other month kept it) - so the
 * asterisk has to be optional in the match, not assumed present.
 *
 * The dropdown's 31 month options are Angular Material menu items that
 * exist in the DOM at all times (just hidden via CSS until opened, not
 * added/removed) - confirmed live via a full-page text-node scan. Once
 * opened, the closed-state summary display (a completely separate element,
 * outside the menu) is *also* still visible with the same text whenever the
 * field already holds the current month, so a page-wide text match resolves
 * to two elements and fails strict mode. Scoping to `.mat-mdc-menu-item`
 * (confirmed via evaluate to match exactly one element) targets only the
 * actual dropdown option, never the summary display.
 */
export async function consultReport(page: Page, clientName: string) {
  await page.getByRole('button', { name: 'Reports' }).click();
  const clientField = page.getByRole('textbox', { name: 'Select a client' });
  await clientField.fill(clientName.split(' ')[0]);
  await clientField.click();
  await page.getByRole('menuitem', { name: clientName }).click();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthOption = new RegExp(`^${year}/${month}\\*?$`);
  await page.getByText('keyboard_arrow_down').click();
  await page.locator('.mat-mdc-menu-item').getByText(currentMonthOption).click();

  // Clicking Consult in the same instant the dropdown starts closing can
  // apparently still land on the closing overlay rather than the button
  // underneath (observed once: month correctly set, Consult click reported
  // no error, but the app never left the search screen). Waiting for the
  // dropdown panel to actually finish closing avoids that overlap.
  await page.locator('.mat-mdc-menu-item').first().waitFor({ state: 'hidden' }).catch(() => {});

  await page.getByRole('button', { name: 'Consult' }).click();
}
