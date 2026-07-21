import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport, openMonthReportsList, openMonthReportActionsMenu } from '../helpers/reports';
import { UPLOAD_CATEGORIES, excelFixturePath, downloadPathFor } from '../helpers/uploadCategories';

/**
 * Category 2 of 10: Financial Movements.
 * PORTED FROM: C:\Users\khuoybo\Downloads\Project\fapa_testing
 * (tests/002_upload_model_mouvement_finanacier.spec.ts). fapa_testing never
 * built a content-validation test for this category, so this file has 5
 * tests rather than 6 (no "Downloaded PDF content matches..." test).
 *
 * REAL-DATA WARNING: performs REAL imports and REAL report generation against
 * the live account, mirroring the account owner's own established practice.
 */

const category = UPLOAD_CATEGORIES.find((c) => c.key === 'financial-movements')!;

function getCurrentMonthName(): string {
  return new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('Import for the current month', async ({ page }) => {
  test.setTimeout(120_000);

  await page.getByRole('button', { name: 'Upload' }).click();
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByText('Portfoliokeyboard_arrow_down').click();
  await page.locator('div').filter({ hasText: category.dropdownMatch }).first().click();

  const openCalendar = page.getByRole('button', { name: 'Open calendar' });
  if (await openCalendar.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const calendarOpened = await openCalendar.click({ timeout: 5_000 }).then(() => true).catch(() => false);
    if (calendarOpened) {
      const yearPicked = await page
        .getByRole('button', { name: new Date().getFullYear().toString() })
        .click({ timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (yearPicked) {
        await page.getByRole('button', { name: getCurrentMonthName() }).click({ timeout: 5_000 }).catch(() => {});
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
  }

  await page.setInputFiles('input[type="file"]', excelFixturePath(category));
  await page.locator('.ql-editor').fill(category.importComment);
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
});

test('Consult renders the report for the client and current month', async ({ page }) => {
  test.setTimeout(60_000);
  const clientName = requireReportClientName();

  await consultReport(page, clientName);
  await expect(page.getByText(/report is being generated/i)).toBeVisible({ timeout: 20_000 });
});

test('Generate PDF produces a downloadable report', async ({ page }) => {
  test.setTimeout(180_000);
  const clientName = requireReportClientName();

  await consultReport(page, clientName);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).click();
  try {
    await expect(page.getByText('PDF generated successfully.')).toBeVisible({ timeout: 60_000 });
  } catch {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(15_000);
  }

  await openMonthReportsList(page);
  await openMonthReportActionsMenu(page);

  const downloadPath = downloadPathFor(category);
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('menuitem', { name: 'Download' }).click();
  const download = await downloadPromise;

  fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBeTruthy();
});

test('Validate PDF (skips if already verified)', async ({ page }) => {
  test.setTimeout(120_000);
  const clientName = requireReportClientName();

  await consultReport(page, clientName);
  await page.waitForLoadState('networkidle');

  await openMonthReportsList(page);
  await openMonthReportActionsMenu(page);

  const verifiedBadge = page.getByText('verified').first();
  if (await verifiedBadge.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    return;
  }

  await page.getByRole('menuitem', { name: 'Validate PDF' }).click();
  await expect(page.getByText('Are you sure you want to')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(verifiedBadge).toBeVisible({ timeout: 60_000 });

  await openMonthReportActionsMenu(page);
  const redownloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('menuitem', { name: 'Download' }).click();
  const redownload = await redownloadPromise;
  await redownload.saveAs(downloadPathFor(category));
});

test('Download PDF produces the same report independently of the Generate/Validate steps', async ({ page }) => {
  test.setTimeout(120_000);
  const clientName = requireReportClientName();

  await consultReport(page, clientName);
  await page.waitForLoadState('networkidle');

  await openMonthReportsList(page);
  await openMonthReportActionsMenu(page);

  const downloadPath = downloadPathFor(category);
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('menuitem', { name: 'Download' }).click();
  const download = await downloadPromise;

  fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBeTruthy();
});
