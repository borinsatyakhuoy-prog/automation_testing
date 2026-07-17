import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Admins - Unsupervised Asset Classes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await page.getByRole('button', { name: 'Unsupervised Asset Classes' }).click();
  });

  test('Add control is disabled until text is entered', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Unsupervised Asset Classes' })).toBeVisible();

    const addButton = page.getByRole('button', { name: 'Add' });
    await expect(addButton).toBeDisabled();

    await page.getByRole('textbox').last().fill('Automated-test-placeholder-class');
    await expect(addButton).toBeEnabled();

    // Intentionally not clicking Add - this would mutate a shared configuration list.
  });
});
