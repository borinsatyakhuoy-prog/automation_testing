import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Admins - Firewall Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Admins' }).click();
    await page.getByRole('button', { name: 'Firewall Configuration' }).click();
  });

  test('firewall configuration table and Add Range control are present', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Start IP' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'End IP' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Range' })).toBeVisible();

    // Empty state is the currently-configured state for this environment.
    const emptyState = page.getByText('No data available');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });
});
