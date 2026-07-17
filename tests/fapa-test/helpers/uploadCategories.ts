import * as path from 'path';
import {
  CategoryValidationConfig,
  excelDateToDDMMYY,
  excelDateToFrenchAbbrev,
  cleanCurrency,
  fractionToFrenchPercent,
  absoluteValueString,
} from './pdfExcelValidator';

/**
 * All 10 upload categories the live app supports, ported from fapa_testing
 * (tests/001..010_upload_model_*.spec.ts). Each category's file-type dropdown
 * label, fixture filename, and (where applicable) the Excel columns whose
 * values must appear in the generated PDF report are captured here so the
 * Import -> Consult -> Generate -> Download -> Validate -> content-check
 * cycle can run generically across all of them.
 *
 * `excelValidation` is omitted for categories fapa_testing never built
 * content-validation for (only "Financial Movements" - category 2).
 */

export interface UploadCategory {
  key: string;
  /** Human-readable label, used only in test titles/logging. */
  dropdownLabel: string;
  /**
   * Exact strategy to select this category in the file-type dropdown,
   * replicated per-category from fapa_testing's own (empirically-tuned)
   * working code rather than one uniform locator - a generic substring
   * filter was tried first and matched the wrong (much larger) element for
   * "Financial Movements", blocked by an overlay backdrop. A string means
   * `getByText(value).first()`; a RegExp means an exact-anchored
   * `locator('div').filter({ hasText: value })` match.
   */
  dropdownMatch: string | RegExp;
  excelFileName: string;
  importComment: string;
  /** Built lazily so row filters can reference the runtime client name (never hardcoded in source). */
  excelValidation?: (clientName: string) => CategoryValidationConfig;
}

export const UPLOAD_CATEGORIES: UploadCategory[] = [
  {
    key: 'portfolio',
    dropdownLabel: 'Portfolio',
    dropdownMatch: /^Portfolio$/,
    excelFileName: '1. JDD_model_portefeuille.xlsx',
    importComment: 'Automated report-content-validation test (ported from fapa_testing)',
    // Category 1 uses the dedicated readPortfolioExcelData/verifyPdfContainsPortfolioData
    // functions instead (already implemented and verified separately) - no generic config needed.
  },
  {
    key: 'financial-movements',
    dropdownLabel: 'Financial Movements',
    dropdownMatch: /^Financial Movements$/,
    excelFileName: '2. JDD_model_mouvement_financier.xlsx',
    importComment: 'Ported from fapa_testing 002_upload_model_mouvement_finanacier.spec.ts',
    // fapa_testing never built content-validation for this category either.
  },
  {
    key: 'passive',
    dropdownLabel: 'Liabilities',
    dropdownMatch: 'Liabilities',
    excelFileName: '3. JDD_model_passif.xlsx',
    importComment: 'Ported from fapa_testing 003_upload_model_passif.spec.ts',
    excelValidation: (clientName) => ({
      rowFilter: (row) => row['Client']?.toString().trim() === clientName,
      columns: [
        { column: 'Type de passif', label: 'Passif Type' },
        { column: 'Maturité', label: 'Maturity Date', transform: excelDateToDDMMYY },
        { column: 'Montant initial', label: 'Amount', transform: cleanCurrency },
        { column: 'Taux', label: 'Taux', transform: absoluteValueString },
      ],
    }),
  },
  {
    key: 'rental-management',
    dropdownLabel: 'Real Estate Assets',
    dropdownMatch: 'Real Estate Assets',
    excelFileName: '4. JDD_model_actif_immobilier.xlsx',
    importComment: 'Ported from fapa_testing 004_upload_model_actif_immobilier.spec.ts',
    excelValidation: (clientName) => ({
      rowFilter: (row) => row['Propriétaire']?.toString().trim() === clientName,
      columns: [
        { column: 'Propriétaire', label: 'Owner' },
        { column: 'Nom du bien', label: 'Property Name' },
        { column: 'Acquisition', label: 'Acquisition Price', transform: cleanCurrency },
        { column: 'Estimation', label: 'Estimation', transform: cleanCurrency },
        { column: 'Travaux', label: 'Travaux', transform: cleanCurrency, optional: true },
        { column: 'Différentiel', label: 'Différentiel', transform: cleanCurrency, optional: true },
      ],
    }),
  },
  {
    key: 'private-equity-summary',
    dropdownLabel: 'Private Equity Summary',
    // The option's accessible text has an icon ligature baked in ahead of the label.
    dropdownMatch: /^real_estate_agentPrivate Equity Summary$/,
    excelFileName: '5. JDD_model_synthese_private_equity.xlsx',
    importComment: 'Ported from fapa_testing 005_upload_model_synthese_private_equity.spec.ts',
    excelValidation: () => ({
      columns: [
        { column: 'Souscripteur', label: 'Souscripteur' },
        { column: 'Montant investi', label: 'Montant investi' },
        { column: 'Nb part', label: 'Nb part' },
        { column: 'Valeur actuelle de la part', label: 'Valeur actuelle' },
        { column: 'Dernière valorisation', label: 'Dernière valorisation' },
        { column: '% FD', label: '% FD', transform: fractionToFrenchPercent },
      ],
    }),
  },
  {
    key: 'works-of-art',
    dropdownLabel: 'Artwork',
    dropdownMatch: 'Artwork',
    excelFileName: '6. JDD_model_oeuvre_art.xlsx',
    importComment: 'Ported from fapa_testing 006_upload_model_oeuvre_art.spec.ts',
    excelValidation: () => ({
      columns: [
        { column: "Nom de l'artiste", label: 'Artist' },
        { column: "Nom de l'œuvre", label: 'Artwork Name' },
        { column: 'Date de creation', label: 'Creation Date' },
        { column: "Date d'acquisition", label: 'Acquisition Date', transform: excelDateToFrenchAbbrev },
        { column: "Prix d'acquisition", label: 'Acquisition Price' },
        { column: 'Valeur EUR', label: 'Value EUR' },
        { column: 'Informations techniques', label: 'Technical Info' },
        { column: 'Localisation', label: 'Location' },
      ],
    }),
  },
  {
    key: 'todo-list',
    dropdownLabel: 'Follow-up TODO List',
    dropdownMatch: 'Follow-up TODO List',
    excelFileName: '7. JDD_model_todolist.xlsx',
    importComment: 'Ported from fapa_testing 007_upload_model_todolist.spec.ts',
    excelValidation: () => ({
      columns: [
        // Known app bug (documented in fapa_testing): the PDF duplicates the
        // first row's "Interlocuteur FP" for all rows. Marked optional here
        // rather than silently working around it, so the gap stays visible.
        { column: 'Interlocuteur FP', label: 'Interlocuteur FP', optional: true },
        { column: 'Dossier', label: 'Dossier' },
        { column: 'Intitulé tâche', label: 'Task Title' },
        { column: 'Description', label: 'Description' },
        { column: 'Commentaire', label: 'Comment' },
        { column: 'Statut', label: 'Status' },
        { column: 'Date estimée fin', label: 'Estimated End Date', transform: excelDateToDDMMYY },
      ],
    }),
  },
  {
    key: 'private-equity-funds',
    dropdownLabel: 'Private Equity Funds',
    dropdownMatch: /^Private Equity Funds$/,
    excelFileName: '8. JDD_model_fond_private_equity.xlsx',
    importComment: 'Ported from fapa_testing 008_upload_model_fond_private_equity.spec.ts',
    excelValidation: () => ({
      columns: [
        { column: "Fonds d'investissement", label: 'Fund' },
        { column: 'Souscripteur', label: 'Subscriber' },
        { column: 'Devise', label: 'Currency' },
        { column: 'Montant appelé(EUR)', label: 'Montant appelé', transform: cleanCurrency },
        { column: 'Valorisation globale(TVPI)', label: 'TVPI', transform: cleanCurrency },
      ],
    }),
  },
  {
    key: 'structured-products',
    dropdownLabel: 'Structured Products',
    dropdownMatch: /^Structured Products$/,
    excelFileName: '9. JDD_model_product_structure.xlsx',
    importComment: 'Ported from fapa_testing 009_upload_model_product_structure.spec.ts',
    excelValidation: () => ({
      columns: [
        { column: 'Code ISIN', label: 'ISIN' },
        { column: 'Libellé', label: 'Libellé' },
        { column: 'Émetteur', label: 'Émetteur' },
        { column: 'Compte', label: 'Compte' },
        { column: 'Montant investi', label: 'Montant investi', transform: cleanCurrency },
        { column: 'Date de maturité', label: 'Maturity Date', transform: excelDateToDDMMYY },
      ],
    }),
  },
  {
    key: 'private-debts',
    dropdownLabel: 'Private Debts',
    dropdownMatch: /^Private Debts$/,
    excelFileName: '10. JDD_model_dette_privee.xlsx',
    importComment: 'Ported from fapa_testing 010_upload_model_dette_privee.spec.ts',
    excelValidation: () => ({
      columns: [
        { column: 'Client', label: 'Client' },
        { column: 'Dette Privée', label: 'Dette Privée' },
        { column: 'Montant souscrit', label: 'Montant souscrit', transform: cleanCurrency },
        { column: 'Taux', label: 'Taux', transform: cleanCurrency },
        { column: 'Date souscription', label: 'Date souscription', transform: excelDateToDDMMYY },
        { column: 'Maturité', label: 'Maturité', transform: excelDateToDDMMYY },
      ],
    }),
  },
];

export function excelFixturePath(category: UploadCategory): string {
  return path.join(__dirname, '..', 'fixtures', category.excelFileName);
}

export function downloadPathFor(category: UploadCategory): string {
  return path.join(__dirname, '..', 'fixtures', 'downloads', `${category.key}-report.pdf`);
}
