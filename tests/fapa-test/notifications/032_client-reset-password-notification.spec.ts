import { test, expect } from '@playwright/test';
import { login, requireMailTestClientName } from '../helpers/auth';

// Resets the password of a dedicated synthetic client (FAPA_MAIL_TEST_CLIENT_NAME),
// never a real production-like client. Idempotent - safe to repeat every run, unlike
// creating a brand-new client/admin, which would permanently accumulate real records
// (see specs/planner.md section 15 for why creation itself isn't automated here).
test.describe('Mail Service - Client Reset Password Notification', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Clients' }).click();
  });

  test('Reset password on an existing client shows the email/SMS notification confirmation', async ({ page }, testInfo) => {
    const clientName = requireMailTestClientName();
    const searchTerm = clientName.split(' ').slice(1).join(' ') || clientName;

    await test.step('Open Reset Password for the dedicated mail-test client', async () => {
      await page.getByRole('textbox', { name: 'searchbar' }).fill(searchTerm);

      // Retries the whole open-menu -> click-menuitem sequence, not just the
      // click: a real, reproducible flake (2026-07-21, seen repeatedly) is
      // the row re-rendering (a background list refresh) between opening the
      // kebab menu and clicking "Reset password", detaching the menuitem
      // mid-click. Re-opening the menu fresh on retry sidesteps that rather
      // than retrying a click on an already-stale element reference.
      let opened = false;
      for (let attempt = 0; attempt < 3 && !opened; attempt++) {
        try {
          await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();
          await page.getByRole('menuitem', { name: 'Reset password' }).click({ timeout: 10_000 });
          opened = true;
        } catch {
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(1_000);
        }
      }
      if (!opened) {
        await page.getByRole('button', { name: 'Example icon-button with a menu' }).first().click();
        await page.getByRole('menuitem', { name: 'Reset password' }).click();
      }

      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    });

    const newPassword = 'QaMailTest71kh@';
    await test.step('Fill a password satisfying all 5 rules and submit', async () => {
      await page.getByRole('textbox', { name: 'Enter new password' }).fill(newPassword);
      await page.getByRole('textbox', { name: 'Enter confirm password' }).fill(newPassword);
      const submit = page.getByRole('button', { name: 'Reset & Notify Client' });
      await expect(submit).toBeEnabled();
      await submit.click();
    });

    await test.step('Confirm dialog warns about the email + manual SMS relay', async () => {
      await expect(page.getByRole('heading', { name: 'Confirm Password Reset' })).toBeVisible();
      await expect(
        page.getByText(/system will automatically send an email notification/i)
      ).toBeVisible();
      await expect(page.getByText(/send the new password.*manually via SMS/i)).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByRole('heading', { name: 'Confirm Password Reset' })).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeHidden();
    });

    // Attached for traceability in the HTML/Allure report: this is the real
    // email captured live via temp-mail-mcp-server on 2026-07-21 when this
    // scenario was first verified (see specs/planner.md section 15.2 and
    // exploratory-findings.md Issue 14). The UI-only assertions above are
    // what actually re-runs every time; email delivery itself isn't
    // re-checked per run since it needs a live disposable inbox.
    await testInfo.attach('reset-password-notification-email (captured live, 2026-07-21)', {
      body:
        'Subject: Réinitialisation du mot de passe terminée\n' +
        'From: Family Partners <phumra.chan@allweb.com.kh>\n\n' +
        "Bonjour,\n\n" +
        "Nous avons le plaisir de vous informer qu'un compte a été créé pour vous sur notre outil reporting.\n" +
        '  ^ BUG (Issue 14): this opening paragraph is the account-creation template, reused verbatim,\n' +
        '    even though this email is for an existing client who only reset a password.\n\n' +
        'Accédez à votre compte : https://develop-fapa.allweb.cloud\n\n' +
        'Nous avons le plaisir de vous confirmer que votre nouveau mot de passe a été mis à jour avec succès.\n' +
        '  ^ This second paragraph is the correct, reset-specific copy.\n\n' +
        'Pour garantir la confidentialité de vos données, le nouveau mot de passe vous sera communiqué par SMS\n' +
        '(ou envoyé à votre adresse e-mail). No password appears anywhere in the email body.',
      contentType: 'text/plain',
    });
  });
});
