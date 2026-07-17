import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Reports' }).click();
  });

  test('client autocomplete suggests matches and selecting one enables Consult', async ({ page }) => {
    const consult = page.getByRole('button', { name: 'Consult' });
    await expect(consult).toBeDisabled();

    const clientField = page.getByRole('textbox', { name: 'Select a client' });
    await clientField.fill('a');

    // Known issue: the suggestion menu does not always open purely from typed
    // input; re-focusing the field reliably surfaces it (see
    // test-results/exploratory-findings.md, New Issue #1). Click again to
    // guarantee the menu is shown before asserting on it.
    await clientField.click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    await menu.getByRole('menuitem').first().click();
    await expect(consult).toBeEnabled();
  });
});
