import { Page, Locator } from '@playwright/test';

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

  // exact: true matters once a report has already rendered on this page (e.g.
  // repeated Consult calls in the same test, as in the P99 sampling loops in
  // 066_p99-sla-performance.spec.ts) - the rendered report tree's per-bank
  // toggle buttons are named "Toggle Consultation des portefeuilles ...",
  // which a non-exact "Consult" match also matches, hitting a Playwright
  // strict-mode multi-element error. Confirmed live: reproduced exactly this
  // way on the 2nd of 5 repeated Consult cycles.
  await page.getByRole('button', { name: 'Consult', exact: true }).click();
}

/**
 * Clicks `locator` with a bounded per-attempt timeout, retrying a few times
 * (Escape + a short pause between attempts) instead of one long wait.
 *
 * Root cause of a real, reproducible flake (2026-07-21, multiple sessions):
 * the report toolbar's "list" view-toggle button and the generated-report
 * row's "more_vert" menu button occasionally became unclickable for well
 * over 60s in a single continuous test run (same family as this project's
 * already-documented Issue 4/New Issue 7 - Material component click
 * reliability), even though the exact same click on the exact same button,
 * re-run moments later in a fresh isolated test, always succeeded within
 * seconds. That pattern - fine in isolation, occasionally stuck mid-run -
 * pointed at a transient UI-thread/animation hang rather than a genuinely
 * broken locator, so a single long wait doesn't help as much as several
 * short, independent attempts: each attempt gets its own fresh actionability
 * check, and Escape clears any lingering overlay/ripple between tries.
 */
async function clickWithRetry(locator: Locator, attempts = 3, perAttemptTimeoutMs = 15_000) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await locator.click({ timeout: perAttemptTimeoutMs });
      return;
    } catch (err) {
      lastError = err;
      await locator.page().keyboard.press('Escape').catch(() => {});
      await locator.page().waitForTimeout(1_000);
    }
  }
  throw lastError;
}

/**
 * Waits for Consult's async "report is being generated" state to appear and
 * then disappear - i.e. for the report to have actually finished rendering.
 *
 * Root cause of a real, reproducible failure (2026-07-22): every
 * report-lifecycle test called `consultReport()` then only
 * `page.waitForLoadState('networkidle')` before interacting with report-view
 * elements (the "list" toggle, the PDF icon). `networkidle` is not a
 * reliable proxy for "the report has visually finished rendering" - it can
 * settle before the report tree is done painting, so `openMonthReportsList`
 * would occasionally try to click a "list" button that didn't exist yet.
 * Failure screenshots confirmed this directly: the page was still on the
 * Consult search form (Consult button in its `[active]` state, no report
 * tree), not stuck on an unclickable-but-present button. This was previously
 * misdiagnosed as Material-component click flakiness (Issue 4/7 in
 * exploratory-findings.md) - it was actually a missing wait. See
 * specs/performance-sla.md T6b for the ~20-25s baseline this wait covers.
 *
 * Deliberately does NOT gate on the progress text going hidden: a locator
 * matching zero elements is trivially "hidden" in Playwright, so on the
 * (real, observed) runs where the progress text never appears at all - e.g.
 * a fast/cached Consult, or some other edge case - `waitFor({state:
 * 'hidden'})` on that same locator would resolve immediately with no real
 * wait, giving a false render-complete signal while the report toolbar still
 * hadn't rendered (confirmed live: exactly this happened, racing ahead to a
 * still-blank search screen). Waiting for a concrete, always-present
 * rendered-report element instead (the PDF toolbar's `picture_as_pdf`
 * button) can't produce a false positive that way.
 */
export async function waitForReportRendered(page: Page) {
  await page
    .getByText(/report is being generated/i)
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => {});
  await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).waitFor({ state: 'visible', timeout: 75_000 });
}

/** Opens the "This month" / "Other Months" generated-reports list view. */
export async function openMonthReportsList(page: Page) {
  await clickWithRetry(page.getByRole('button').filter({ hasText: 'list' }));
}

/**
 * Opens the row-level actions menu (Download / Validate PDF) for a generated
 * report entry. Index 1, not 0: index 0 resolves to a hidden more_vert
 * element elsewhere on the page - index 1 is "This month"'s entry, confirmed
 * both via live exploration and the equivalent locator in the ported
 * fapa_testing suite.
 */
export async function openMonthReportActionsMenu(page: Page, index = 1) {
  await clickWithRetry(page.locator('button').filter({ hasText: 'more_vert' }).nth(index));
}
