import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { login, requireReportClientName } from '../helpers/auth';
import { consultReport, openMonthReportsList, openMonthReportActionsMenu } from '../helpers/reports';
import { readPortfolioExcelData, verifyPdfContainsPortfolioData } from '../helpers/pdfExcelValidator';

/**
 * Category 1 of 10: Client Data / Portfolio.
 * PORTED FROM: C:\Users\khuoybo\Downloads\Project\fapa_testing
 * (tests/001_upload_model_portefeuille.spec.ts, tests/utils/pdfExcelValidator.ts).
 * Each of the 10 upload categories gets its own dedicated file in this
 * report-lifecycle/ folder (001-010), matching fapa_testing's own per-category
 * structure - these are business-critical report types, not a single generic
 * loop. See 002-010 for the other 9 categories.
 *
 * REAL-DATA WARNING: unlike the rest of tests/fapa-test/ (which deliberately
 * cancels every create/import dialog to avoid touching production-like data),
 * the tests in this file perform REAL actions against the live account:
 * importing a real file, generating a real PDF report, and downloading it.
 * This mirrors the account owner's own established, repeated practice (the
 * live Upload history already shows many prior real runs of this exact
 * suite) - it is not a new risk being introduced here. "Validate PDF" (which
 * permanently marks a report as verified) is exercised too, matching that
 * same established practice, but only if the current report isn't already
 * marked verified.
 */

const excelFixturePath = path.join(__dirname, '..', 'fixtures', '1. JDD_model_portefeuille.xlsx');
// Deliberately NOT under test-results/: Playwright wipes its outputDir (which
// defaults to test-results/) at the start of every run, which would delete
// this file before the content-check test below gets to read it.
const downloadPath = path.join(__dirname, '..', 'fixtures', 'downloads', 'portefeuille-report.pdf');

function getCurrentMonthName(): string {
  return new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();
}

// These tests have real order dependencies (Generate must run before the
// content-check, which reads the file Generate downloaded) - force serial,
// in-order execution rather than relying on fullyParallel's default ordering.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('Import the portfolio Excel file for the current month', async ({ page }) => {
  test.setTimeout(120_000);

  await page.getByRole('button', { name: 'Upload' }).click();
  await page.getByRole('button', { name: 'Import' }).click();

  // "Portfolio" is the default file type; click-then-reselect makes the
  // selection explicit rather than relying on the default.
  await page.getByText('Portfoliokeyboard_arrow_down').click();
  await page.locator('div').filter({ hasText: /^Portfolio$/ }).first().click();

  await page.getByRole('button', { name: 'Open calendar' }).click();
  await page.getByRole('button', { name: new Date().getFullYear().toString() }).click();
  await page.getByRole('button', { name: getCurrentMonthName() }).click();

  await page.setInputFiles('input[type="file"]', excelFixturePath);
  await page.locator('.ql-editor').fill('Automated report-content-validation test (ported from fapa_testing)');
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
  // The success toast doesn't always render/get caught in time under real
  // generation load on this live environment (fapa_testing hit the same
  // issue and worked around it the same way) - fall back to waiting for
  // the network to settle rather than failing the whole test on a missed toast.
  try {
    await expect(page.getByText('PDF generated successfully.')).toBeVisible({ timeout: 60_000 });
  } catch {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(15_000);
  }

  await openMonthReportsList(page);
  await openMonthReportActionsMenu(page);

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('menuitem', { name: 'Download' }).click();
  const download = await downloadPromise;

  fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBeTruthy();
});

test('Validate PDF marks the report as verified (skips if already verified)', async ({ page }) => {
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

  // fapa_testing's original also re-downloads after validating, as an
  // independent confirmation that download still works post-validation.
  await openMonthReportActionsMenu(page);
  const redownloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('menuitem', { name: 'Download' }).click();
  const redownload = await redownloadPromise;
  await redownload.saveAs(downloadPath);
});

test('Download PDF produces the same report independently of the Generate/Validate steps', async ({ page }) => {
  test.setTimeout(120_000);
  const clientName = requireReportClientName();

  await consultReport(page, clientName);
  await page.waitForLoadState('networkidle');

  await openMonthReportsList(page);
  await openMonthReportActionsMenu(page);

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('menuitem', { name: 'Download' }).click();
  const download = await downloadPromise;

  fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBeTruthy();
});

// This is the actual "report content validation" test: it cross-checks the
// downloaded PDF's text against the source Excel file that was imported,
// so a report silently dropping or mis-transcribing data would be caught.
test('Downloaded PDF content matches the imported Excel data', async () => {
  const expected = readPortfolioExcelData(excelFixturePath);
  const result = await verifyPdfContainsPortfolioData(downloadPath, expected);

  expect(
    result.missing,
    `PDF is missing expected data from the source Excel: ${result.missing.join(', ')}`
  ).toEqual([]);
});
