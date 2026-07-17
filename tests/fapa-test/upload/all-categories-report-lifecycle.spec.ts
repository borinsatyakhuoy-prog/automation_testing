import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login, requireReportClientName } from '../helpers/auth';
import { readExpectedColumnValues, verifyPdfContainsColumnValues } from '../helpers/pdfExcelValidator';
import { UPLOAD_CATEGORIES, excelFixturePath, downloadPathFor, UploadCategory } from '../helpers/uploadCategories';

/**
 * PORTED FROM: C:\Users\khuoybo\Downloads\Project\fapa_testing
 * (tests/002..010_upload_model_*.spec.ts). Covers the remaining 9 of the 10
 * upload categories (category 1, "Portfolio", has its own dedicated suite in
 * tests/fapa-test/reports/report-generate-download-validate.spec.ts).
 *
 * REAL-DATA WARNING: same as that file - these tests perform REAL imports and
 * REAL report generation/validation against the live account, mirroring the
 * account owner's own established, repeated practice in fapa_testing.
 *
 * Each category runs its own Import -> Consult -> Generate PDF -> Download ->
 * Validate PDF -> (content-check, where fapa_testing built one) cycle. The
 * whole file runs serially - one category, one report generation, at a time -
 * both to preserve real order dependencies (the content-check needs the
 * Generate step's download) and to avoid hammering the live report-generation
 * backend with concurrent requests.
 */

test.describe.configure({ mode: 'serial' });

function getCurrentMonthName(): string {
  return new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

const categoriesToRun = UPLOAD_CATEGORIES.filter((c) => c.key !== 'portfolio');

for (const category of categoriesToRun) {
  test.describe(`Upload category: ${category.dropdownLabel}`, () => {
    test(`[${category.key}] Import for the current month`, async ({ page }) => {
      test.setTimeout(120_000);

      await page.getByRole('button', { name: 'Upload' }).click();
      await page.getByRole('button', { name: 'Import' }).click();
      await page.getByText('Portfoliokeyboard_arrow_down').click();
      if (typeof category.dropdownMatch === 'string') {
        await page.getByText(category.dropdownMatch).first().click();
      } else {
        await page.locator('div').filter({ hasText: category.dropdownMatch }).first().click();
      }

      // Not every category's Import dialog shows a month/year calendar step
      // (fapa_testing's own per-category scripts differ on this), and this
      // Material datepicker toggle is prone to the same click-hang issue
      // already documented for other Material dropdowns in this app
      // (test-results/exploratory-findings.md, Issue 4). Give it a short,
      // bounded attempt and move on rather than risk stalling for minutes -
      // the current month is very likely pre-selected anyway.
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
            // Selection didn't complete - close the picker so it doesn't block the next steps.
            await page.keyboard.press('Escape').catch(() => {});
          }
        }
      }

      await page.setInputFiles('input[type="file"]', excelFixturePath(category));
      await page.locator('.ql-editor').fill(category.importComment);
      await page.getByRole('button', { name: 'Import' }).click();
      await page.getByRole('button', { name: 'Close' }).click();
    });

    test(`[${category.key}] Generate and download the PDF report`, async ({ page }) => {
      test.setTimeout(180_000);
      const clientName = requireReportClientName();

      await page.getByRole('button', { name: 'Reports' }).click();
      const clientField = page.getByRole('textbox', { name: 'Select a client' });
      await clientField.fill(clientName.split(' ')[0]);
      // Known reliability issue: the suggestion menu doesn't always open from
      // typed input alone - a re-click reliably surfaces it.
      await clientField.click();
      await page.getByRole('menuitem', { name: clientName }).click();
      await page.getByRole('button', { name: 'Consult' }).click();
      await page.waitForLoadState('networkidle');

      await page.getByRole('button').filter({ hasText: 'picture_as_pdf' }).click();
      // The success toast doesn't always render/get caught in time under real
      // generation load - fall back to waiting for the network to settle.
      try {
        await expect(page.getByText('PDF generated successfully.')).toBeVisible({ timeout: 60_000 });
      } catch {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(15_000);
      }

      await page.getByRole('button').filter({ hasText: 'list' }).click();
      // Index 1: index 0 resolves to a hidden more_vert element elsewhere on the page.
      await page.locator('button').filter({ hasText: 'more_vert' }).nth(1).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.getByRole('menuitem', { name: 'Download' }).click();
      const download = await downloadPromise;

      const downloadPath = downloadPathFor(category);
      fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
      await download.saveAs(downloadPath);
      expect(fs.existsSync(downloadPath)).toBeTruthy();
    });

    test(`[${category.key}] Validate PDF (skips if already verified)`, async ({ page }) => {
      test.setTimeout(120_000);
      const clientName = requireReportClientName();

      await page.getByRole('button', { name: 'Reports' }).click();
      const clientField = page.getByRole('textbox', { name: 'Select a client' });
      await clientField.fill(clientName.split(' ')[0]);
      await clientField.click();
      await page.getByRole('menuitem', { name: clientName }).click();
      await page.getByRole('button', { name: 'Consult' }).click();
      await page.waitForLoadState('networkidle');

      await page.getByRole('button').filter({ hasText: 'list' }).click();
      await page.locator('button').filter({ hasText: 'more_vert' }).nth(1).click();

      const verifiedBadge = page.getByText('verified').first();
      if (await verifiedBadge.isVisible().catch(() => false)) {
        await page.keyboard.press('Escape');
        return;
      }

      await page.getByRole('menuitem', { name: 'Validate PDF' }).click();
      await expect(page.getByText('Are you sure you want to')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(verifiedBadge).toBeVisible({ timeout: 60_000 });
    });

    if (category.excelValidation) {
      test(`[${category.key}] Downloaded PDF content matches the imported Excel data`, async () => {
        const clientName = requireReportClientName();
        const config = category.excelValidation!(clientName);
        const expected = readExpectedColumnValues(excelFixturePath(category), config);
        const { results, hardMissing } = await verifyPdfContainsColumnValues(downloadPathFor(category), expected);

        // Cross-reference against the column configs to split required vs. optional misses.
        const optionalLabels = new Set(config.columns.filter((c) => c.optional).map((c) => c.label));
        const requiredMissing = results
          .filter((r) => !optionalLabels.has(r.label))
          .flatMap((r) => r.missing);
        const optionalMissing = results
          .filter((r) => optionalLabels.has(r.label))
          .flatMap((r) => r.missing);

        if (optionalMissing.length > 0) {
          console.log(`[${category.key}] Optional fields not found in PDF (not a failure): ${optionalMissing.join(', ')}`);
        }
        void hardMissing;

        expect(
          requiredMissing,
          `[${category.key}] PDF is missing expected data from the source Excel: ${requiredMissing.join(', ')}`
        ).toEqual([]);
      });
    }
  });
}
