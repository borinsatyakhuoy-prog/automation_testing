import * as XLSX from 'xlsx';
import * as fs from 'fs';

// CommonJS require for pdf-parse (no native ESM support).
const pdf = require('pdf-parse');

export interface PortfolioExpectedData {
  accounts: string[];
  isins: string[];
  cours: string[];
}

const ALLOWED_ACCOUNT_TYPES = ['Assurance vie', 'Compte titres', 'PEA - nanti'];

/**
 * Reads the account number, ISIN code, and price ("Cours") columns from a
 * portfolio import Excel fixture, filtered to the account types the report
 * actually surfaces.
 */
export function readPortfolioExcelData(excelPath: string): PortfolioExpectedData {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel fixture not found at: ${excelPath}`);
  }

  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
  const filtered = rows.filter((row) => ALLOWED_ACCOUNT_TYPES.includes(row['Type de compte']));

  const unique = (values: (string | undefined)[]) =>
    Array.from(new Set(values.map((v) => v?.toString().trim()).filter(Boolean))) as string[];

  return {
    accounts: unique(filtered.map((r) => r['Nom et N. de compte'])),
    isins: unique(filtered.map((r) => r['Code ISIN'])),
    cours: unique(filtered.map((r) => r['Cours'])),
  };
}

/**
 * Parses a downloaded PDF report and checks whether the given portfolio data
 * (account numbers, ISIN codes, prices) is present in its text content.
 * Prices also match against their rounded integer form, since the PDF may
 * round displayed values.
 */
export async function verifyPdfContainsPortfolioData(
  pdfPath: string,
  expected: PortfolioExpectedData
): Promise<{ missing: string[]; found: string[] }> {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found at: ${pdfPath}`);
  }
  const stats = fs.statSync(pdfPath);
  if (stats.size < 1000) {
    throw new Error(`PDF at ${pdfPath} is suspiciously small (${stats.size} bytes)`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  const normalizedPdfText = data.text.replace(/\s+/g, '').toLowerCase();

  const checkItems = (items: string[], isPrice = false) => {
    const found: string[] = [];
    const missing: string[] = [];
    for (const item of items) {
      const normalizedItem = item.replace(/[\s,]/g, '').toLowerCase();
      let matchFound = normalizedPdfText.includes(normalizedItem);

      if (!matchFound && isPrice) {
        const num = parseFloat(item.replace(/,/g, ''));
        if (!isNaN(num) && normalizedPdfText.includes(Math.round(num).toString())) {
          matchFound = true;
        }
      }

      (matchFound ? found : missing).push(item);
    }
    return { found, missing };
  };

  const accounts = checkItems(expected.accounts);
  const isins = checkItems(expected.isins);
  const cours = checkItems(expected.cours, true);

  return {
    found: [...accounts.found, ...isins.found, ...cours.found],
    missing: [...accounts.missing, ...isins.missing, ...cours.missing],
  };
}

// ---------------------------------------------------------------------------
// Generic, per-category configurable engine (ported from fapa_testing, which
// has bespoke Excel-to-PDF verification logic per upload category - each
// category's column names, date/currency formats, and matching quirks differ
// enough that a single one-size-fits-all transform would lose fidelity with
// the original, already-proven logic).
// ---------------------------------------------------------------------------

export interface ColumnCheck {
  /** Excel column header to read. */
  column: string;
  /** Human-readable label used in logging/error messages. */
  label: string;
  /** Optional per-value transform (e.g. Excel serial date -> DD/MM/YY, currency cleanup). Defaults to trimmed string. */
  transform?: (raw: any) => string | undefined;
  /** If true, missing values are logged but don't fail the test (matches fapa_testing's "optional" fields). */
  optional?: boolean;
}

export interface CategoryValidationConfig {
  columns: ColumnCheck[];
  /** Optional row filter, e.g. restrict to a specific client's rows. */
  rowFilter?: (row: any) => boolean;
}

export interface ColumnCheckResult {
  label: string;
  optional: boolean;
  found: string[];
  missing: string[];
}

/** Reads and extracts the configured columns' unique values from an Excel fixture. */
export function readExpectedColumnValues(excelPath: string, config: CategoryValidationConfig): Record<string, string[]> {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel fixture not found at: ${excelPath}`);
  }
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
  const filtered = config.rowFilter ? rows.filter(config.rowFilter) : rows;

  const result: Record<string, string[]> = {};
  for (const col of config.columns) {
    const values = filtered
      .map((row) => (col.transform ? col.transform(row[col.column]) : row[col.column]?.toString().trim()))
      .filter((v): v is string => !!v);
    result[col.label] = Array.from(new Set(values));
  }
  return result;
}

/**
 * Checks each configured column's expected values against a downloaded PDF's
 * text content. Text is compared with a "strip everything but alphanumerics,
 * lowercase" normalization, which is robust to the extraction artifacts
 * (concatenated words, stray whitespace) fapa_testing found in practice.
 */
export async function verifyPdfContainsColumnValues(
  pdfPath: string,
  expectedByColumn: Record<string, string[]>
): Promise<{ results: ColumnCheckResult[]; hardMissing: string[] }> {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found at: ${pdfPath}`);
  }
  const stats = fs.statSync(pdfPath);
  if (stats.size < 1000) {
    throw new Error(`PDF at ${pdfPath} is suspiciously small (${stats.size} bytes)`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pdfTextClean = clean(data.text);

  const results: ColumnCheckResult[] = [];
  const hardMissing: string[] = [];

  for (const [label, values] of Object.entries(expectedByColumn)) {
    const found: string[] = [];
    const missing: string[] = [];
    for (const value of values) {
      const valueClean = clean(value);
      let isFound = valueClean.length > 0 && pdfTextClean.includes(valueClean);

      // Numeric fallback: the PDF sometimes rounds decimals (e.g. 334568.5 -> 334569).
      if (!isFound) {
        const num = parseFloat(value.replace(/,/g, '.'));
        if (!isNaN(num)) {
          isFound = pdfTextClean.includes(Math.round(num).toString());
        }
      }

      (isFound ? found : missing).push(value);
    }
    results.push({ label, optional: false, found, missing });
    hardMissing.push(...missing);
  }

  return { results, hardMissing };
}

// ---------------------------------------------------------------------------
// Shared value transforms reused across categories
// ---------------------------------------------------------------------------

/** Excel serial date -> "DD/MM/YY". */
export function excelDateToDDMMYY(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'number') {
    const utcDays = Math.floor(val - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(date.getUTCFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
  return val.toString().trim() || undefined;
}

/** Excel serial date -> "DD-monAbbrevFR-YY" (e.g. 27-sept-21), used by the artwork report. */
export function excelDateToFrenchAbbrev(val: any): string | undefined {
  if (typeof val !== 'number') return val?.toString().trim() || undefined;
  const utcDays = Math.floor(val - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  const monthNames = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const month = monthNames[date.getUTCMonth()];
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}-${month}-${yy}`;
}

/** Strips currency symbols, commas, and spaces: "1 234,56 €" -> "1234,56". */
export function cleanCurrency(val: any): string | undefined {
  if (!val) return undefined;
  const cleaned = val.toString().replace(/[€,\s]/g, '');
  return cleaned || undefined;
}

/** Excel decimal fraction -> French percentage string: 0.1 -> "10,00%". */
export function fractionToFrenchPercent(val: any): string | undefined {
  if (typeof val === 'number' && val < 1) {
    return (val * 100).toFixed(2).replace('.', ',') + '%';
  }
  return val?.toString().trim() || undefined;
}

/** Absolute value as a string, for fields the PDF may render without a sign. */
export function absoluteValueString(val: any): string | undefined {
  if (typeof val === 'number') return Math.abs(val).toString();
  if (!val) return undefined;
  return val.toString().replace('-', '').trim() || undefined;
}
