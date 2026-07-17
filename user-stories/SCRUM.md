# User Story: FAPA

## Story Title
Family Partners (FAPA) — Wealth Management Portfolio Reporting Platform

## Story Description
Family Partners (Paris Partners) is a login-gated wealth-management and
portfolio-reporting web application for financial advisors and their
clients. An advisor logs in, imports portfolio/asset data from Excel files
across 10 data categories (Client Data / portfolios, Financial Movements,
Passive, Rental Management, Private Equity Summary/Funds, Structured
Products, Private Debts, Works of Art, TODO List), manages clients and
their relations, tracks market instruments (ISIN securities and currency
exchange rates), and generates consolidated PDF wealth reports ("État de
patrimoine") per client per month. Generated reports can be validated
(marked as reviewed) and downloaded, and their content should accurately
reflect whatever portfolio data was most recently imported for that client.

Note: this story previously described an "e-commerce checkout" scope that
does not exist in the live application — that description has been
replaced with the above, grounded in direct exploration of
develop-fapa.allweb.cloud (see specs/planner.md and
test-results/exploratory-findings.md) and in review of a companion
automation project (fapa_testing) that already exercises the Upload →
Report → PDF validation lifecycle in depth.

## Application URL
https://develop-fapa.allweb.cloud/login

## Test Credentials
Credentials are not stored in this file. Copy `.env.example` to a local `.env`
(gitignored, never committed) and set `FAPA_EMAIL` / `FAPA_PASSWORD` (and
`FAPA_REPORT_CLIENT_NAME` for report-generation tests) there. The automated
suite in `tests/fapa-test/` reads these same variables.

## Acceptance Criteria

### AC1: Authentication
- A user can log in with a valid email/password and is redirected to the Dashboard.
- Invalid credentials show an error and keep the user on the login page.
- Submitting the login form with empty fields shows inline "required" validation
  for both Email and Password.
- A "Forgot password?" link is available and navigates to a dedicated flow.
- Signing out ends the session; protected routes then redirect back to /login.

### AC2: Navigation
- The top navigation bar (Dashboard, Admins, Clients, Markets, Upload, Reports)
  reaches every section when clicked.
- Known gap: navigating directly to /markets (rather than clicking the nav
  button) does not resolve to the Markets section — only the nav button
  reaches the real /isin route. The equivalent applies to Upload's real
  route (/datas).
- An FR/EN language toggle switches visible UI text.

### AC3: Client & Data Management
- The Clients list supports search, column sorting, pagination, and filtering
  by type (All / Person / Companies / New clients).
- A client record can be viewed in detail (Client Information, Relations,
  linked accounts) and supports Edit / Reset password / Consult actions from
  a row-level menu.
- Adding a client is gated by required-field validation (First Name, Excel
  name matching First+Last Name, Last Name, Email) before the form can submit.
- Admins can manage Team Management (internal users), Unsupervised Asset
  Classes, Firewall IP allow-listing, and view a Logs audit trail of
  login/logout activity with date-range filtering.
- Markets tracks ISIN securities (with a calendar-scoped vs. all-time list
  view toggle) and currency exchange rates, each importable/exportable.

### AC4: Data Import (Upload)
- Ten data categories can be imported via Excel file per calendar month:
  Client Data (portfolios), Financial Movements, Passive, Rental Management,
  Private Equity Summary, Works of Art, TODO List, Private Equity Funds,
  Structured Products, and Private Debts.
- The Upload history table records File Type, filename, timestamp, Status
  (Success/Error), Author, and any error file, and supports search — though
  search currently only matches the filename, not the visibly displayed File
  Type category (see Defect: test-results/exploratory-findings.md, Issue 3).
- The Import dialog requires a File Type and a selected file before its
  submit control is enabled.

### AC5: Report Generation, Validation, and Download
- Selecting a client and month and clicking "Consult" renders that client's
  consolidated wealth report ("État de patrimoine") in-page, built from
  whatever data has been imported for that client/month.
- The report toolbar's "Generate as PDF" action produces a downloadable PDF
  version; a "PDF generated successfully." confirmation is shown (though not
  always reliably within a short window under real load — automation should
  tolerate this, not treat a missed toast as a hard failure).
- Generated reports appear in a "This month" / "Other Months" list, each
  with a Download action and a "Validate PDF" action that permanently marks
  the report as reviewed (a "verified" badge).
- The downloaded PDF's content (account numbers, ISIN codes, prices) must
  match the source data that was imported for that client/month — this is
  now covered by an automated content-validation test
  (tests/fapa-test/reports/report-generate-download-validate.spec.ts),
  ported from a companion project (fapa_testing) that already proved this
  pattern out across all 10 upload categories.
- Selecting a month with no underlying report data produces a handled
  outcome rather than an unhandled error — observed as either an "Invalid
  month to generate report." message or a "Copy data" prompt depending on
  context (see Issue 2 in the exploratory findings — the inconsistency
  itself may be worth product clarification).

### Error Handling
- Invalid login, empty required fields, and no-data report months all
  produce a visible, specific message rather than a silent failure or a
  broken page.
- Real-data safety: destructive/creating actions (Add Client, Add User, Add
  Currency, Import File, Edit ISIN row) must not be exercised for real by
  automated tests unless explicitly intended, since this environment holds
  real, production-like client and financial data.

## Business Rules
- Each of the 10 upload categories is scoped to a single calendar month per
  import; re-importing the same category/month appears to update that
  period's data (confirmed via repeated real imports in the Upload history).
- A generated report's PDF content must trace back to the most recently
  imported source data for that client/month — this is the basis of the
  content-validation tests.
- Once a report is marked "Validate PDF" / verified, that action is not
  undone by the UI observed so far (treat as a one-way state change in tests).
- The application manages real, production-like client and user data (not
  synthetic fixtures) even in the "develop" environment — automated tests
  must default to read-only interactions and cancel any create/edit dialog
  unless a test is specifically and deliberately exercising a real write
  (as the report-generation tests do, matching the account owner's own
  established practice).

## Technical Notes
- Use Playwright for test automation.
- Test across Chrome, Firefox, and Safari browsers.
- Validate all form validation messages.
- Test navigation flow and back button behavior.
- Report content validation requires reading the same source Excel file
  that was imported and cross-checking it against the downloaded PDF's text
  (see tests/fapa-test/helpers/pdfExcelValidator.ts).

## Definition of Done
- [x] All acceptance criteria have test cases
- [x] Manual exploratory testing completed
- [x] Automated test scripts created and passing
- [x] Test results documented
- [x] Bugs logged for any failures
- [x] Code committed to repository