# Family Partners (FAPA) Application Test Plan

## Application Overview

Confirmed application structure (via login with the credentials in user-stories/SCRUM.md): a top navigation bar with Dashboard, Admins, Clients, Markets, Upload, Reports, a user-initials menu, and an FR/EN language toggle. Dashboard shows portfolio allocation donut/pie charts plus a "Recently Consulted Reports" list. Admins has four sub-tabs: Team Management (paginated user table), Unsupervised Asset Classes (removable chip list), Firewall Configuration (IP allow-list table, currently empty), and Logs (login/logout audit trail with date filters - confirmed it records real login attempts, including the negative-login test performed during this exploration). Clients is a searchable/filterable/paginated table of client records with an "Add client" dialog and a per-row kebab menu offering View detail / Edit / Reset password / Consult. Markets (reached only via the nav button - its real route is /isin, not /markets; navigating directly to /markets was found to redirect to a blank home page, a discrepancy captured as its own test) has ISIN and Currency tabs, each with Import/Export, a search box, and a calendar-vs-list view toggle. Upload (real route /datas) has a paginated upload-history table and a multi-step "Import File" wizard. Reports has an autocomplete client search plus a month selector; selecting a client/month and clicking Consult was confirmed to either show an async "report is being generated" progress state, or, for at least one client/month combination tested, an "Invalid month to generate report." error - both behaviors are captured as tests. The user menu offers "Setting & Privacy" (a change-password page with a live password-rules checklist) and "Sign Out".

IMPORTANT DATA-SAFETY NOTE: This environment displays real, production-like client and user data (not synthetic test fixtures) - the Clients table contains 117+ real-looking records. All tests in this plan are written to be read-only wherever possible: list/search/sort/filter/pagination checks, and detail views, are safe to execute freely. Wherever a test opens the "Add client", "Add user", "Add Currency", or "Import File" flows for one of the existing real records, the steps explicitly stop at validating the disabled/enabled state of the submit control and then Cancel/close the dialog - these forms must NOT be submitted for real against real records, to avoid creating or mutating production-like data. The Reports "Consult" action itself is read-only (a report-generation trigger, not a data mutation) and safe against any client.

The one deliberate, real-write exception is the report-lifecycle suite (Import File, Generate PDF, Validate PDF), which necessarily performs real writes to exercise the full lifecycle - it does so exclusively against a single dedicated synthetic client, "QA Automation Client" (`FAPA_REPORT_CLIENT_NAME` in `.env`), created and password-reset specifically for this purpose, never against a real client. All 10 Excel fixtures used for import were updated so their embedded client-identifying columns reference this same synthetic name.

## Test Scenarios

### 1. Authentication

**Seed:** `tests/seed.spec.ts`

#### 1.1. Successful login with valid credentials

**File:** `tests/fapa-test/auth/login-success.spec.ts`

**Steps:**
  1. Navigate to https://develop-fapa.allweb.cloud/login
    - expect: The login page displays a Connection form with Email and Password fields, an FR/EN language toggle, and a "Forgot password ?" link
  2. Enter the valid test email and password from user-stories/SCRUM.md into the Email and Password fields
    - expect: Both fields accept the input; the password characters are masked by default
  3. Click the "Log in" button
    - expect: The user is redirected to the /dashboard route
    - expect: A success confirmation ("LogIn successful, welcome") toast appears briefly

#### 1.2. Login fails with invalid credentials

**File:** `tests/fapa-test/auth/login-invalid-credentials.spec.ts`

**Steps:**
  1. Navigate to the login page and enter an invalid/non-existent email together with an incorrect password
    - expect: Both fields accept the typed values
  2. Click "Log in"
    - expect: The user remains on the /login page
    - expect: A "Log in fail" error message/toast (with a cancel icon) appears

#### 1.3. Required-field validation on empty login submit

**File:** `tests/fapa-test/auth/login-empty-fields.spec.ts`

**Steps:**
  1. Navigate to the login page and, without entering any values, click "Log in"
    - expect: An inline "Email is required" message appears under the Email field
    - expect: An inline "Password is required" message appears under the Password field
    - expect: The user stays on the /login page

#### 1.4. Password field visibility toggle

**File:** `tests/fapa-test/auth/login-password-visibility.spec.ts`

**Steps:**
  1. On the login page, type any value into the Password field
    - expect: The typed characters are masked and a "visibility_off" icon button is shown next to the field
  2. Click the visibility toggle icon
    - expect: The password value becomes visible as plain text and the icon state changes

#### 1.5. Forgot password link navigation

**File:** `tests/fapa-test/auth/forgot-password-link.spec.ts`

**Steps:**
  1. On the login page, click the "Forgot password ?" link
    - expect: The application navigates to the /forgot-password route and a forgot-password page/form is displayed

### 2. Dashboard

**Seed:** `tests/seed.spec.ts`

#### 2.1. Dashboard shows allocation charts and recently consulted reports

**File:** `tests/fapa-test/dashboard/dashboard-overview.spec.ts`

**Steps:**
  1. Log in with valid test credentials
    - expect: The app redirects to /dashboard
  2. Observe the dashboard content area
    - expect: An "Allocation excluding liabilities" chart is visible
    - expect: An "Allocation by depository bank excluding liabilities" chart is visible
    - expect: A "Recently Consulted Reports" list is visible with at least one entry showing a report name and a timestamp
  3. Click on the first item in the "Recently Consulted Reports" list
    - expect: The application navigates toward that report's detail/consultation view without any error being shown

### 3. Top Navigation

**Seed:** `tests/seed.spec.ts`

#### 3.1. All top navigation buttons route to their respective sections

**File:** `tests/fapa-test/navigation/top-nav-routes.spec.ts`

**Steps:**
  1. After logging in, click the "Dashboard" nav button
    - expect: The Dashboard content (allocation charts, Recently Consulted Reports) loads and the Dashboard button shows an active state
  2. Click the "Admins" nav button
    - expect: The Admins section loads at the /admin route showing the Team Management sub-tab table by default
  3. Click the "Clients" nav button
    - expect: The Clients section loads at the /clients route showing the client table
  4. Click the "Markets" nav button
    - expect: The Markets section loads at the /isin route showing ISIN and Currency tabs
  5. Click the "Upload" nav button
    - expect: The Upload section loads at the /datas route showing the upload history table
  6. Click the "Reports" nav button
    - expect: The Reports section loads at the /reports route showing the client search and month selector

#### 3.2. Direct URL navigation to /markets does not resolve (discovered discrepancy)

**File:** `tests/fapa-test/navigation/markets-direct-url-discrepancy.spec.ts`

**Steps:**
  1. While logged in, type https://develop-fapa.allweb.cloud/markets directly into the browser address bar and navigate to it
    - expect: The application redirects to the root "/" path and renders only the top navigation bar with no section content below it (this differs from clicking the "Markets" nav button)
  2. From that state, click the "Markets" button in the top navigation bar
    - expect: The Markets section now loads correctly at the /isin route with the ISIN and Currency tabs visible

### 4. Admins - Team Management

**Seed:** `tests/seed.spec.ts`

#### 4.1. Team Management table: search, sort, filter, pagination

**File:** `tests/fapa-test/admins/team-management-table.spec.ts`

**Steps:**
  1. Navigate to Admins (default Team Management sub-tab)
    - expect: A table of users displays with columns First Name, Last Name, Role, Email, Phone Number, Status, plus a "Status :" filter button, a "Search user" search bar, and an "Add user" button
  2. Click the "First Name" column header
    - expect: The table re-sorts by First Name and the column's sort indicator updates
  3. Type a partial name of an existing user (visible in the current table) into the search bar
    - expect: The table filters down to rows matching that search term
  4. Change "Rows per page" to a larger value
    - expect: The page size updates and the "x - y of NN" row-count label reflects the new page size
  5. Click "Next page"
    - expect: The table advances to the next page of users and the "Previous page"/"First page" controls become enabled

#### 4.2. Team Management row actions menu opens

**File:** `tests/fapa-test/admins/team-management-row-menu.spec.ts`

**Steps:**
  1. Click the kebab (more_vert) icon on any existing user row
    - expect: A context menu of row-level actions opens without error
  2. Dismiss the menu (e.g. press Escape or click elsewhere) without selecting an action
    - expect: The menu closes and no data is changed

#### 4.3. Add user dialog opens and can be cancelled without submitting

**File:** `tests/fapa-test/admins/add-user-cancel.spec.ts`

**Steps:**
  1. Click the "Add user" button
    - expect: An "Add user" form/dialog opens
  2. Without filling in the required fields, locate the submit control
    - expect: The submit control is disabled or otherwise prevents submission while required fields are empty
  3. Close/Cancel the dialog without entering any data
    - expect: The dialog closes and the Team Management table's total user count is unchanged

### 5. Admins - Unsupervised Asset Classes

**Seed:** `tests/seed.spec.ts`

#### 5.1. Asset class chip list and Add control state

**File:** `tests/fapa-test/admins/unsupervised-asset-classes.spec.ts`

**Steps:**
  1. Navigate to Admins > "Unsupervised Asset Classes" sub-tab
    - expect: The existing asset class chips are listed, each with a close ("x") icon, alongside a text input and a disabled "Add" button
    - expect: A warning notice about labels being used for portfolio import is displayed
  2. Type some text into the input field (without clicking Add)
    - expect: The "Add" button becomes enabled, confirming client-side validation reacts to input

### 6. Admins - Firewall Configuration

**Seed:** `tests/seed.spec.ts`

#### 6.1. Firewall configuration table and empty state

**File:** `tests/fapa-test/admins/firewall-configuration.spec.ts`

**Steps:**
  1. Navigate to Admins > "Firewall Configuration" sub-tab
    - expect: A table with columns Label IP, Start IP, End IP, Action is shown, along with an "Add Range" button and a warning about IP allow-listing
    - expect: If no ranges are configured, the table displays a "No data available" row

### 7. Admins - Logs

**Seed:** `tests/seed.spec.ts`

#### 7.1. Logs table records login activity, supports date filter and sorting

**File:** `tests/fapa-test/admins/logs-table.spec.ts`

**Steps:**
  1. Navigate to Admins > "Logs" sub-tab
    - expect: A table with columns Username, IP Address, Date, Action, Description is shown, listing recent Login/Logout events including a very recent entry for the current session
  2. Cause a failed login attempt in a separate step (invalid email/password on the login page), then return to Admins > Logs
    - expect: A corresponding row appears showing the attempted (invalid) username/email with an action/description indicating "Invalid Credentials or Account Disabled"
  3. Click a sortable column header such as "Date"
    - expect: The table re-orders by that column
  4. Set a Start date and End date in the date filters and click "Apply"
    - expect: The table filters to only show log entries within the specified date range
  5. Click "Clear"
    - expect: The date filters reset and the log table returns to its default unfiltered view

### 8. Clients

**Seed:** `tests/seed.spec.ts`

#### 8.1. Clients table: search, sort, pagination

**File:** `tests/fapa-test/clients/clients-table.spec.ts`

**Steps:**
  1. Navigate to the Clients section
    - expect: A table displays with columns First Name, Last Name, Company Name, Email, Phone Number, Status, plus a "Status :" filter, a client-type filter list (All / Person / Companies / New clients), a "Search client" search bar, and an "Add client" button
  2. Click a sortable column header (e.g. "Last Name")
    - expect: The table re-sorts by that column
  3. Change "Rows per page" and use the pagination controls to move to the next page
    - expect: The page size and displayed row range update accordingly, and previously-disabled "Previous page"/"First page" controls become enabled

#### 8.2. Client search returns matching results

**File:** `tests/fapa-test/clients/client-search.spec.ts`

**Steps:**
  1. Type a valid client search term (a partial name belonging to any existing client already visible in the table) into the "Search client" bar
    - expect: The table filters down to only the client rows matching that search term

#### 8.3. Client type filter narrows results

**File:** `tests/fapa-test/clients/client-type-filter.spec.ts`

**Steps:**
  1. Click the "Companies" option in the client-type filter list
    - expect: The table updates to display only company-type client records
  2. Click the "New clients" option
    - expect: The table filters to show only recently-added clients, and the option's label reflects a count (e.g. "New clients NN")

#### 8.4. View client detail (read-only)

**File:** `tests/fapa-test/clients/client-view-detail.spec.ts`

**Steps:**
  1. Click the kebab (more_vert) icon on any existing client row
    - expect: A menu opens with options: View detail, Edit, Reset password, Consult
  2. Click "View detail"
    - expect: The app navigates to a client detail page with "Client Information" (Client Type, Client/Manager Name, Company Name, Email) and "Relations" sections, plus a "PDF Display Rules" panel with a "Configure rule" button, and sub-navigation for "Client Information" / "Account List"
  3. Click the "Back" button
    - expect: The app returns to the Clients list view

#### 8.5. Add Client dialog required-field validation (cancel, do not submit)

**File:** `tests/fapa-test/clients/add-client-cancel.spec.ts`

**Steps:**
  1. Click "Add client"
    - expect: The "Add Client" dialog opens with a Person/Company radio choice (Person selected by default) and fields marked required with *: First Name*, Excel name* (with a hint that it must equal First Name + Last Name), Last Name*, Email*, plus Country Code + Phone Number, a Status Active checkbox, Issued date / Expiration Date pickers, Partner/Spouse, Linked Relations, and an Others rich-text field, and an "Add & Notify" submit button
  2. Leave the required (*) fields blank
    - expect: The "Add & Notify" button remains disabled
  3. Click "Cancel"
    - expect: The dialog closes without creating a new client; the Clients table's total record count is unchanged

### 9. Markets - ISIN

**Seed:** `tests/seed.spec.ts`

#### 9.1. ISIN tab table, search, and pagination

**File:** `tests/fapa-test/markets/isin-table.spec.ts`

**Steps:**
  1. Navigate to Markets (ISIN tab is selected by default)
    - expect: A table displays with columns Year, Month, ISIN Code, Security Name, Asset Class, Geo Zone, Industry Sector, Currency, Price, alongside Import/Export buttons, a calendar/list view toggle, a month field (defaulting to the current month), and a "Find an ISIN" search box
  2. Type a known ISIN code or security name fragment into "Find an ISIN"
    - expect: The table filters to matching rows
  3. Use the pagination controls to move to the next page
    - expect: The displayed row range updates and previously-disabled "Previous page" control becomes enabled

#### 9.2. Calendar vs list view toggle swaps the dataset view

**File:** `tests/fapa-test/markets/isin-view-toggle.spec.ts`

**Steps:**
  1. On the ISIN tab, confirm the calendar-view radio option is selected by default
    - expect: The table shows data for the currently selected month
  2. Click the list-view toggle option
    - expect: The table view changes to the list layout without any error, and data continues to load

#### 9.3. ISIN row Edit action opens pre-filled form (cancel, do not save)

**File:** `tests/fapa-test/markets/isin-edit-cancel.spec.ts`

**Steps:**
  1. Click "Edit" on any existing ISIN row
    - expect: An edit form/dialog opens pre-populated with that row's existing values
  2. Close/cancel the dialog without changing or saving anything
    - expect: The dialog closes and the row's values in the table are unchanged

#### 9.4. Discovered: Export/Import/Edit mechanics and report linkage (2026-07-20 investigation, real writes against new synthetic records only)

Investigated live (not yet automated) to understand the full Export -> Import-to-new-month -> Edit -> report-effect lifecycle, per the same data-safety principle as the report-lifecycle client: only new, self-created records were touched, never existing ISIN rows.

- **Export** downloads `isin_<year>-<month>.xlsx` (sheet `isin_detail`) with columns `Code ISIN | Libellé | Classe d'actifs | Zone géographique | Devise | Cours | Secteur` - this is the exact shape an Import file must match.
- **Import** requires a `Date of file` (MM/YYYY) via a calendar picker capped to years 2003-2026 (no future years beyond the current one are selectable) - importing to a month with no existing data is purely additive, confirmed via a test ISIN ("QATEST00001", month 08/2026, 2,438 -> 1 row shown once filtered to that month).
- **Edit** (on an existing or newly-imported row) locks `MM/YYYY` and `ISIN Code` (both disabled/read-only) but allows Security Name, Asset Class, Geo Zone, Currency, Price, and Industry Sector to be changed and saved for real - confirmed by editing the test row's Price from 123.45 to 999.99 and seeing it persist in the table.
- **Report linkage confirmed:** searching the ISIN table for "CAC" surfaces a row with ISIN Code "CAC", Security Name "CAC40", Asset Class "Indices" - this is the literal source of the "Indicateurs de marchés" benchmark table shown in every generated client report (confirmed by cross-referencing against the PDF text extracted during the report-lifecycle work). This means ISIN rows with Asset Class "Indices" are genuinely global, shared-across-all-reports reference data, not client-scoped - reinforcing why editing *existing* rows (real index values used in every real client's report) would be far riskier than the report-lifecycle client migration, and why this investigation only touched newly-created records.
- Not yet confirmed: whether a non-"Indices" security (like the test ISIN created here) ever surfaces in any report at all, since it isn't held by any client's portfolio and isn't a benchmark index - this would need a client whose portfolio fixture references that exact ISIN code to test further.

### 10. Markets - Currency

**Seed:** `tests/seed.spec.ts`

#### 10.1. Currency tab table, search, and Add Currency dialog (cancel only)

**File:** `tests/fapa-test/markets/currency-tab.spec.ts`

**Steps:**
  1. Click the "Currency" tab within Markets
    - expect: A table displays with columns Year, Month, From EUR To, Label, Exchange Rate, alongside Import/Export buttons, a month field, a "Search currency..." box, and an "Add Currency" button
  2. Type a known currency code (e.g. an existing "From EUR To" value visible in the table) into the search box
    - expect: The table filters to matching rows
  3. Click "Add Currency"
    - expect: An add-currency form/dialog opens
  4. Close/cancel the dialog without submitting
    - expect: The dialog closes and no new currency row is added to the table

#### 10.2. Discovered: Export/Add/Edit mechanics (2026-07-20 investigation, real writes against a new synthetic record only)

- **Export** downloads `devise_<year>-<month>.xlsx` (sheet `currency_detail`) with columns `Devise | Libellé | Taux d'échange` - only 14 currencies exist total (far fewer than the 2,438 ISIN rows).
- **Add Currency** (single-row form, separate from bulk Import) takes `MM/YYYY*`, `From EUR To*`, `Exchange Rate*`, and an optional `Label`. Notable quirk: typing just a currency code (e.g. "QAT") into "From EUR To" gets auto-prefixed with "EUR" by the app, producing "EURQAT" in the table - the field expects only the *target* currency code, not the full pair.
- **Edit** locks `MM/YYYY` and `From EUR To` (disabled) but allows Exchange Rate and Label to be changed and saved for real - confirmed by editing a test entry's rate from 2.5 to 7.77 and seeing it persist.
- Same real-write, new-records-only safety principle as ISIN (9.4) applies here.

### 11. Upload

**Seed:** `tests/seed.spec.ts`

#### 11.1. Upload history table search, sort, and pagination

**File:** `tests/fapa-test/upload/upload-history-table.spec.ts`

**Steps:**
  1. Navigate to the Upload section
    - expect: A paginated table displays with columns File Type, Uploaded File, Date & Time, Status, Author, Errors, Comments, along with a search bar and an "Import" button
  2. Click a sortable column header (e.g. "Date & Time")
    - expect: The table re-sorts by that column
  3. Click on an "Uploaded File" link for an existing successful upload
    - expect: A file download is initiated (or the link resolves) without an application error

#### 11.2. Import File wizard required-field validation (cancel, do not submit)

**File:** `tests/fapa-test/upload/import-wizard-cancel.spec.ts`

**Steps:**
  1. Click the "Import" button
    - expect: The "Import File" dialog opens on its first step, showing a "Choose File Type*" dropdown, a "Data file*" drag-and-drop upload zone with upload-rule guidance, a "Date of file" field defaulting to the current month, and a "Comments" rich-text field
  2. Leave the required File Type and Data file fields empty
    - expect: The dialog's "Import" submit control remains disabled
  3. Click the close (X) icon on the dialog
    - expect: The dialog closes without uploading any file, and the upload-history table's row count is unchanged

#### 11.3. Discovered: not all 10 upload categories are reflected in the consolidated wealth report

**Files:** `tests/fapa-test/report-lifecycle/001_portfolio.spec.ts` through `010_private-debts.spec.ts` (real-write tests against a dedicated synthetic client - see the data-safety note above)

Each of the 10 upload categories can be imported successfully, but only some feed into the consolidated PDF ("État de patrimoine") generated via Reports > Consult: confirmed present are Portfolio (via "Consultation des portefeuilles"), Liabilities (via "Consolidation du Passif"), Artwork, Private Equity Summary/Funds, Structured Products, Private Debts, and TODO List, each with their own dedicated section. Confirmed **absent** from the report entirely - not even the generic category name appears anywhere in its text - are **Financial Movements** and **Real Estate Assets**, despite both being fully importable via Upload. Whether this is intentional (these two categories may be tracked for other purposes, e.g. cash-flow/property-management screens, rather than this specific report) or a gap worth product clarification is not yet determined - see exploratory-findings.md Issue 13.

### 12. Reports

**Seed:** `tests/seed.spec.ts`

#### 12.1. Client autocomplete search in Reports

**File:** `tests/fapa-test/reports/reports-client-search.spec.ts`

**Steps:**
  1. Navigate to the Reports section
    - expect: A "Select a client" search field, a month field (placeholder "YYYY/MM"), and a disabled "Consult" button are displayed
  2. Type a partial name of an existing client into the "Select a client" field
    - expect: A dropdown menu of matching client names appears
  3. Select one of the suggested clients from the dropdown
    - expect: The client name populates the field, a month-selector control replaces the free-text month field, and the "Consult" button becomes enabled

#### 12.2. Generating a report shows an async in-progress state

**File:** `tests/fapa-test/reports/reports-generate-inprogress.spec.ts`

**Steps:**
  1. With a client already selected (per the previous test), open the month dropdown
    - expect: A scrollable list of selectable months (current month back through prior years) is displayed
  2. Choose the month corresponding to the client's own currently logged-in user (i.e., a month/client combination known to already have report data, such as one shown in the Dashboard's "Recently Consulted Reports" list) and click "Consult"
    - expect: The client and month controls become disabled, and a "The report is being generated and may take some time to complete..." message with a progress bar is displayed

#### 12.3. Report generation error for a client/month without data (discovered edge case)

**File:** `tests/fapa-test/reports/reports-invalid-month-error.spec.ts`

**Steps:**
  1. Select an existing client and a report month for which no underlying portfolio data exists for that client, then click "Consult"
    - expect: An inline error message reading "Invalid month to generate report." is displayed (with a cancel/error icon) instead of the report-generation progress state, and the search form remains available to retry with different inputs

#### 12.4. Discovered: "Sync" (Data synchronisation) — copy an old month's data into the current month (2026-07-21 investigation, dialog explored live; destructive step not executed)

The report toolbar (visible after Consult, alongside refresh/PDF/settings/list icons) has an unlabeled icon button whose Material Design Angular tooltip reads "Synchronize" (`matTooltip`, not a native `title`/`aria-label` — must hover or read the tooltip overlay to discover it). Its behavior depends entirely on which month is currently being consulted:

- **Consulting a non-current month (e.g. an old month) and clicking Sync:** immediately shows the same "Invalid month to generate report." toast used elsewhere for missing-data months (§12.3) — Sync only operates from the perspective of the **current real-world month**.
- **Consulting the current month and clicking Sync:** opens a "Data synchronisation" dialog titled "Please select the month to synchronize from*". Its dropdown is mislabeled — the input's placeholder text reads "Choose asset class" even though the field is actually a **month** picker (bug worth flagging; no separate asset-class selector exists in the dialog). The dropdown only lists months that already have imported client data (confirmed by importing a Portfolio fixture tagged to `01/2026` for "QA Automation Client" via Upload > Import > Date of file; `2026/01` then — and only then — appeared as a selectable option, having previously been marked with a "no data" `*` suffix in the Reports month-picker like every other empty past month).
- Below the dropdown, a static info panel lists what the feature will sync (not selectable, purely informational): Types de détentions, Actifs financiers, Actifs non supervisés, Actifs immobiliers, Fond Private Equity, Private Equity Direct, Passif (Uniquement les données remplies manuelles), Produit structuré, Dettes Privées.
- Clicking "Synchronize" (enabled once a source month is chosen) opens a second **"Confirmation of synchronization"** dialog: "Are you sure you want to synchronize the data from the month of `2026-01` to the month of `2026-07` for the following clients: **QA Automation Client**" with an explicit warning: **"Attention: The data for the destination month will be completely replaced by that of the source month."** The dialog's own body text says to click "Validate" to confirm, but the actual button is labeled "Confirm" (second minor label mismatch). Cancel is available at every step.
- **Not executed further:** confirming this would have completely overwritten the current month (2026/07)'s data for "QA Automation Client" — the exact client/month the entire report-lifecycle automation suite (§ report-lifecycle, all 10 categories) depends on being populated. Per this project's real-write safety principle (only ever touch newly-created synthetic records, never data other suites/tests rely on), the investigation stopped at the confirmation dialog and was cancelled rather than confirmed.
- Not yet confirmed: what a real Confirm does to categories that have **no** data in the source month (e.g. would syncing overwrite Financial Movements in the destination with "nothing" if the source month never had Financial Movements imported?), whether the destination is always literally today's calendar month or the month the user most recently consulted before opening the dialog, and what the exact resulting toast/UI state looks like post-sync. Automating this scenario would need a disposable client (or a disposable pair of months on the existing synthetic client) created solely for this test, seeded via Import, so the destructive replace never touches shared fixture data.

**Seed:** `tests/seed.spec.ts`

#### 12.5. Discovered: "Consolidation globale par titulaire" table's historical columns were empty for lack of historical data, not a bug (2026-07-24, by request - "help find a way to populate the data to make full")

The report's "Consolidation globale par titulaire" section (a by-account/by-establishment breakdown, distinct from the top-level `/api/consolidation-global` totals - see `specs/performance-sla.md`'s endpoint catalog) renders three fixed date columns: prior year-end (31/12/25), six months back (30/06/26), and the consulted month itself (24/07/26 at the time of this investigation). Before this investigation, "QA Automation Client" only ever had Portfolio data imported for the current month, so the two historical columns showed "–" for every account row - not a report bug, just genuinely no data existing for those two specific dates.

**Root cause confirmed and resolved** by re-importing the same `1. JDD_model_portefeuille.xlsx` fixture (already used by `report-lifecycle/001_portfolio.spec.ts`) for "QA Automation Client" twice more via Upload > Import, dated `12/2025` and `06/2026` respectively - the exact same safe, precedented pattern already used for the `01/2026` import in §12.4 above (re-importing this fixture only ever affects this one dedicated synthetic client, never shared/production client data). Both imports confirmed `COMPLETED` via `GET /api/audit`. Re-Consulting the current month afterward showed every account row's 31/12/25 and 30/06/26 columns now populated with real figures (e.g. BNP Banque Privée's accounts: `-€23,219.80` / `-€11,609.90` instead of `-`/`-`), and Perf MTD/YTD percentages now calculate correctly for every row instead of showing `-` for lack of a prior-period baseline to compare against.

Not automated as a repeatable test - this was a one-time data-completeness fix for manual/visual verification of this specific table, not a new assertion. The two new imports are permanent (consistent with this client's existing accumulated import history across many prior test sessions) and don't need to be repeated; a future session wanting to verify this table's historical columns again can Consult directly without re-importing.

#### 13.1. Setting & Privacy change-password page loads with live password rules (do not submit)

**File:** `tests/fapa-test/settings/change-password-page.spec.ts`

**Steps:**
  1. Click the user-initials button in the top-right of the navigation bar
    - expect: A menu opens with "Setting & Privacy" and "Sign Out" options
  2. Click "Setting & Privacy"
    - expect: The app navigates to a Change Password page showing "New password" and "Re-type new password" fields (each with a visibility toggle), a live checklist of 5 password rules (at least 8 characters, 1 lowercase letter, 1 uppercase letter, 1 number, 1 special character), and a "Reset & Notify Client" button that starts disabled
  3. Without entering any password value, navigate away by clicking a top navigation item instead of submitting
    - expect: No password change is applied and the current test account credentials remain valid for subsequent tests

#### 13.2. FR/EN language toggle switches all visible labels

**File:** `tests/fapa-test/settings/language-toggle.spec.ts`

**Steps:**
  1. Click the "FR" radio button in the language toggle
    - expect: Top navigation labels and page text switch to French (e.g. "Dashboard" -> "Tableau de bord", "Markets" -> "Marchés", "Upload" -> "Importer", "Reports" -> "Rapports")
  2. Click the "EN" radio button
    - expect: All labels revert to English

#### 13.3. Sign Out ends the session

**File:** `tests/fapa-test/settings/sign-out.spec.ts`

**Steps:**
  1. Open the user-initials menu and click "Sign Out"
    - expect: The application redirects the user to the /login page
  2. Attempt to navigate directly to a protected route such as /dashboard
    - expect: The application redirects back to /login rather than showing protected content, confirming the session was ended

### 14. Client Portal (Client-role login, discovered 2026-07-21)

Investigated live per user request: clients are not merely CRM records in this app — each client has their own login, entirely separate from the advisor/admin account, reached via the same `/login` form (no role selector; the backend just returns a different, much more restricted app for a client identity).

**Seed:** Reset a target client's password first via Clients > (row) more_vert > "Reset password" while logged in as an advisor (see §8 for the Clients table), since a client's initial/actual password is not otherwise known or discoverable through the UI.

#### 14.1. Advisor can reset a client's login password

**File:** not yet automated

**Steps:**
  1. Locate a client's row in the Clients table (search matches First Name/Last Name/Company/Email as separate fields, not a concatenated full-name string — e.g. searching "QA Automation Client" as one phrase returns "Search not found", but "QA" or "Automation" alone matches)
    - expect: The row shows the client's First Name, Last Name, Company Name, Email, Phone Number, Status
  2. Click the row's kebab (more_vert) menu and choose "Reset password"
    - expect: A "Reset Password" dialog opens showing the client's name, "New password"/"Re-type new password" fields, and a live 5-rule password checklist (8+ characters, 1 lowercase, 1 uppercase, 1 number, 1 special character), each rule showing a filled check_circle once satisfied
  3. Enter a value satisfying all 5 rules in both fields and click "Reset & Notify Client"
    - expect: A second "Confirm Password Reset" dialog appears, warning that the system will email the client and that the advisor must relay the new password via SMS separately; clicking "Confirm" closes both dialogs with no error and returns to the Clients table
  4. (Cancel path) At either dialog, click Cancel/close instead
    - expect: No password change is applied

#### 14.2. Client portal: distinct restricted dashboard after login

**File:** not yet automated

**Steps:**
  1. Sign out of the advisor session and log in at `/login` using the client's email and the password set in §14.1
    - expect: Login succeeds ("LogIn successful, welcome" toast) and lands on `/dashboard` showing "Welcome, <CLIENT NAME>" with a wave emoji
  2. Inspect the top navigation
    - expect: Only "Dashboard" and "Reports" are present — no Admins, Clients, Markets, or Upload — confirming a distinct, restricted client role rather than a filtered advisor view
  3. Inspect the Dashboard content
    - expect: The same three widget shapes as the advisor Dashboard (Allocation excluding liabilities, Allocation by depository bank excluding liabilities, PDFs available for download) render as greyed-out/placeholder donut charts with static sample legend values, each captioned "No data available at the moment." (or "No report is available at the moment." for the PDF widget) when the client has no advisor-published data — i.e. this client's real portfolio/report data (imported and consulted throughout this project's report-lifecycle suite) is **not** visible here, implying client-visible data requires an explicit advisor-side publish/share step distinct from Consult
  4. Click "Reports" in the client nav
    - expect: A "No report is available at the moment." message, consistent with the Dashboard's PDF widget
  5. Open the client's own account menu (avatar with initials, top-right)
    - expect: Same two options as the advisor menu, "Setting & Privacy" and "Sign Out"; "Setting & Privacy" opens `/settings/change_password`, a self-service version of the same Reset Password UI/copy from §14.1 (still labeled "Reset & Notify Client" even for self-service — a pre-existing copy quirk also present on the advisor's own change-password page, §13.1)
  6. Click "Sign Out"
    - expect: Redirects to `/login`; logging back in as the advisor restores normal advisor access

Not yet confirmed: the exact advisor-side action that makes a report/PDF visible in the client portal (candidates: the report toolbar's "Download PDF"/"Validate PDF" steps used throughout the report-lifecycle suite, or a dedicated publish action not yet located).

### 15. Mail Service - Client & Staff Notifications (2026-07-21 investigation, real writes against two new dedicated synthetic records)

Follow-up to §14's open question: whether the "Reset & Notify Client" email actually arrives. Verified live end-to-end using the `temp-mail-mcp-server` MCP tool for real, disposable inboxes - not the existing "QA Automation Client" (which the report-lifecycle suite depends on and whose original inbox credentials were never saved), but two brand-new dedicated synthetic records created solely for this investigation: client "QA Mail Test Client" and staff record "QA Mail Test Admin" (role EMPLOYE), each given its own fresh `@web-library.net` disposable address. All three emails below were sent from `phumra.chan@allweb.com.kh` via SendinBlue and arrived within seconds of the triggering action.

**Seed:** none (real-write investigation against dedicated new records; see data-safety note at the top of this file)

#### 15.1. New client creation sends a "Bienvenue chez Family Partners !" notification (001)

**File:** not automated (one-off real write, see note below)

**Steps:**
  1. Clients > "Add client", fill required fields (First Name "QA", Excel name "QA Mail Test Client", Last Name "Mail Test Client", a disposable email address) and click "Add & Notify"
    - expect: The client is created (table row count increments) and the dialog closes
  2. Check the inbox for the email address just used
    - expect: An email from `phumra.chan@allweb.com.kh`, subject "Bienvenue chez Family Partners !", arrives within seconds, with a link to `https://develop-fapa.allweb.cloud` and copy stating a personal password will follow separately by SMS (or personal email) - confirming the app never emails the password itself

#### 15.2. Resetting an existing client's password sends a distinct reset-confirmation email (002) - content bug found

**File:** `tests/fapa-test/notifications/032_client-reset-password-notification.spec.ts`

**Steps:**
  1. Using the client created in §15.1 (or any existing client), Clients > row kebab > "Reset password", enter a value satisfying all 5 password rules in both fields, click "Reset & Notify Client", then "Confirm" on the "Confirm Password Reset" dialog (copy: "The system will automatically send an email notification to the client. You will need to send the new password to the client manually via SMS.")
    - expect: Both dialogs close with no error
  2. Check the same client's inbox
    - expect: A second, distinct email arrives, subject "Réinitialisation du mot de passe terminée" ("Password reset complete")

- **Bug found:** the reset email's body does not match its own subject. It opens with the exact same "Nous avons le plaisir de vous informer qu'un compte a été créé pour vous..." ("we're pleased to inform you an account has been created for you") boilerplate used in the brand-new-account email (§15.1), before a second paragraph correctly says the password was updated. For an existing client who is not receiving a new account, the leading paragraph is simply wrong/confusing copy - looks like the reset flow's email is built by concatenating the same "account created" template fragment with a "password updated" fragment, rather than using reset-specific copy throughout.
- Neither email contains the actual new password in any form - consistent with the in-app copy that the password must be relayed manually via SMS (or personal email) by the advisor.

#### 15.3. New admin/employee creation sends a distinct internal "Bienvenue dans l'équipe !" notification (003)

**File:** not automated (one-off real write, see note below)

**Steps:**
  1. Admins > Team Management > "Add user", fill required fields (First Name "QA", Last Name "Mail Test Admin", a disposable email address; Role left at its EMPLOYE default) and click "Add & Notify"
    - expect: The user is created (table row count increments) and the dialog closes
  2. Check the inbox for the email address just used
    - expect: An email from the same sender arrives, subject "Bienvenue dans l'équipe !" ("Welcome to the team!") - genuinely distinct from the client-facing §15.1 email, not just a reused template: it adds an "ACCÈS INTERNE" ("INTERNAL ACCESS") badge in the header and an extra blue notice box stating the access is strictly for professional use per Family Partners' internal security policy. Same SMS/personal-email password-relay copy as §15.1/§15.2.

#### 15.4. Manual SMS/email password relay is a deliberate, unscripted human step (004)

Not a bug and not automatable: every one of the three emails above (and the in-app "Confirm Password Reset" dialog text already documented in §14.1) explicitly states the system never emails the password itself - an advisor/admin must relay the newly-set password to the client or new staff member manually, via SMS or a separate personal email, outside the application. This is a business-process step with no UI action to trigger or verify in-app, so per the request that scoped this investigation, it is documented here only, with no corresponding test file.

**Automation note:** only §15.2 (reset password on an *existing* record) is safely repeatable - it performs a real write but doesn't create new data, matching the report-lifecycle client's re-import pattern. §15.1 and §15.3 (creating a brand-new client/admin) are one-off real writes with no in-app delete path discovered yet, so repeating them on every automated run would permanently accumulate synthetic records in this production-like environment; they are documented as manually-verified findings only, consistent with how other one-off "Discovered" investigations in this file (§9.4, §10.2, §12.4) are handled. `FAPA_MAIL_TEST_CLIENT_NAME` in `.env` points at the "QA Mail Test Client" record §15.2's automated test runs against.

### 16. Error Handling - Server-Error Response Behavior Across Key Flows (2026-07-21 investigation, network-mocked, no real backend calls)

Investigated by request: how does the app behave when a request genuinely fails server-side (500-range errors, 401/403, or a hard connection failure), and does it show the same message regardless of the underlying cause? All findings below use Playwright's `page.route()`/`context.route()` to fulfill a request with a fake status/body (or `route.abort()` for a true connection failure) before it ever reaches the real backend - fully safe, deterministic, and repeatable against the live account, unlike a real outage which can't be manufactured on demand. The real endpoint for each flow was confirmed live via `browser_network_requests` before mocking it (e.g. an early attempt to mock Login against a guessed `/api/auth/login` silently did nothing, because the real endpoint is `/api/entrance/login` - always confirm the real URL first, or a route that never matches will make a flow look "fine" for the wrong reason).

**Seed:** none (mocked network responses only)

#### 16.1. Login: every error status produces the identical "Log in fail" message as a wrong password (BUG)

**File:** `tests/fapa-test/error-handling/033_login-request-failure-shows-generic-message.spec.ts`

- Real endpoint: `POST /api/entrance/login`.
- Mocked 401, 500, 502, 503, and 504 responses **with genuinely correct credentials** all produce the exact same "Log in fail" toast that a wrong password produces, and the user stays on `/login` with no other clue. A user whose password is correct has no way to tell "the server is down, try again shortly" apart from "you mistyped your password" - likely to cause unnecessary password-reset requests during a real outage.

#### 16.2. Clients list: every error (including a hard connection failure) silently renders as "no results" (BUG)

**File:** `tests/fapa-test/error-handling/034_clients-list-request-failure-silent.spec.ts`

- Real endpoint: `GET /api/client?...`.
- Mocked 400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504, and even a fully aborted connection (`route.abort('connectionrefused')`) all produce the exact same result: the table silently shows its normal empty-search state ("Search not found", "0 of 0"), indistinguishable from a legitimate zero-result search. The only trace of a real problem is a `console.error` reading `Failed to load resource...` plus a second, generic `ERROR V2` log line - both invisible to an actual user, developer-tools-only.

#### 16.3. Reports Consult: the one flow that gets this right (positive finding)

**File:** `tests/fapa-test/error-handling/035_reports-consult-request-failure-shows-message.spec.ts`

- Real endpoint: `GET /api/report/{clientName}/` (fired by Consult; the client-search and available-months calls are separate endpoints, deliberately left unmocked so the client can still be selected).
- Mocked 500 and 503 both show a clear, visible message: "The server was unable to complete your request. Please try again later." - a real, distinct, appropriately generic message, unlike Login and Clients list above. This is deliberately kept separate in the UI from the business-logic "Invalid month to generate report." message documented in §12.3 for a genuinely no-data month - the app can and does distinguish "the server broke" from "there's nothing here" for this flow, just not for the others in this section.

#### 16.4. Upload Import: the dialog hangs open with no error at all on failure (BUG)

**File:** `tests/fapa-test/error-handling/036_upload-import-request-failure-no-feedback.spec.ts`

- Real endpoint: `POST /api/stock` (used for every upload category, not just Portfolio).
- A mocked 500 leaves the "Import File" dialog open indefinitely (confirmed visible 3+ seconds after clicking its submit button, no toast, no inline error) - a real user would have no way to know their import failed versus the app simply being slow, and no obvious next action beyond guessing to close and retry. Only a raw `console.error` (`Failed to load resource: the server responded with a status of 500`) is logged, again invisible to an end user.

#### 16.5. Markets Export: silent failure, no download and no message (BUG)

**File:** `tests/fapa-test/error-handling/037_markets-export-request-failure-silent.spec.ts`

- Real endpoint: `GET /api/isin/export/detail?date=YYYY-MM` (discovered via `download.url()` after a real export, since Export triggers a browser download rather than an in-page network call the initiating page necessarily sees - `context.route()` is required to intercept it reliably, not `page.route()`; the first attempt at this test used `page.route()` and the real backend served the real file anyway, silently defeating the mock).
- A mocked 500 produces no download at all and no visible error message of any kind - the ISIN table just sits there as if Export was never clicked, identical to the Clients-list and Upload-import findings above.

**Summary - is the message duplicated across error types?** Answering the original question directly: **yes, for 4 of the 5 flows checked** (Login, Clients list, Upload Import, Markets Export), every distinct HTTP error class (client errors, server errors, and even a hard connection failure) produces either the exact same message as every other error class (Login, Clients list) or no message at all (Import, Export) - there is no way for a user to distinguish "the server is temporarily down" from "you made a mistake" or "nothing happened." The one exception is Reports Consult (§16.3), which shows one clear, shared-but-honest "try again later" message for genuine server errors, kept distinct from its own business-logic no-data message - proving the app is capable of better error handling when it chooses to implement it.

### 17. Performance - Formal SLA Coverage Across Every Feature Area (2026-07-21 baseline, 2026-07-22 full-coverage + formal SLA, same-day follow-up expanding coverage further and fixing a false-failure, 2026-07-23 API-endpoint coverage expansion + two more false-failure fixes)

By request, measured how fast each key flow actually is, using the browser's own Navigation Timing Level 2 / Paint Timing / Resource Timing APIs (real numbers from real page loads, not a synthetic external probe) plus wall-clock timing of user-facing actions (e.g. click-to-visible). `tests/fapa-test/helpers/performance.ts` provides the shared `getNavigationMetrics`, `getResourceDurations`, `rate`/`ratedLine` (readable heuristic signal) and, as of 2026-07-22, `SLA`/`assertSLA` (a real, hard-fail gate).

**Formal SLA (2026-07-22):** the original 5-flow suite rated results GOOD/SLOW/POOR against thresholds explicitly documented as "generous... not a formal SLA." That has been replaced with a real SLA defined in **`specs/performance-sla.md`** - eight tiers (T1 Page Load, T2 Navigation, T3 API Read, T4 Search/Filter, T5 Dialog Open, T6 Report Consult, T7 PDF Generation, T8 Download Action), each with a `target` (healthy) and a hard `max` (test fails via `expect()` if exceeded). Coverage was extended that day from 5 flows to every top-level feature area, plus a dedicated SLA gate for the report-lifecycle suite (the main feature built in this project - 10-category content-validation, ported from fapa_testing), then extended further the same day with 8 more tests (Export, both remaining search/filter flows, Sign Out, Language toggle, and 3 more dialog-open flows) plus a Download-timing addition to the report-lifecycle gate.

**Bug found and fixed during this work: a false-failure risk in the login flow's own test infrastructure.** An isolated re-run of `038` (prompted by an operator noticing their own manual login felt fast despite the WARN reading below) initially **failed outright** - not because login was broken, but because `expect(page).toHaveURL(/\/dashboard/)` used Playwright's default 5s timeout, which is *shorter* than this SLA's own T2 Navigation max (6s). The screenshot at failure showed the login button still disabled with a "Loading..." state and no error - a genuinely slow-but-successful login was being cut off by an unrelated assertion timeout before `assertSLA()` ever got to judge it. Fixed by giving both `tests/fapa-test/helpers/auth.ts`'s shared `login()` (used by effectively every test in this suite) and `038`'s own inline login flow an explicit 15s timeout on that assertion - comfortably above every relevant SLA max, so a login is now always measured and judged by the SLA rather than risking a false failure on a shorter, unrelated default timeout. A clean re-run immediately after the fix measured 762 ms / 509 ms / 252 ms (all GOOD), confirming the original WARN reading (see below) was a genuine but transient tail-latency spike on this shared "develop" environment, not a regression - consistent with this file's own repeated tail-latency findings (Issue 19) and this section's prior note that this project deliberately excludes concurrent/load testing.

**Seed:** none (read-only or dialog-open-then-cancel measurements; PDF generation, Markets Export, and the report-lifecycle SLA gate reuse existing data / the dedicated "QA Automation Client" - no new real writes)

| Flow | File | Tier | Measurement | Verdict |
|---|---|---|---|---|
| Login - page load | `performance/038_login-page-performance.spec.ts` | T1 | 858 ms | PASS |
| Login - click-to-`/dashboard` round trip | same | T2 | 556 ms | PASS |
| Login - `POST /api/entrance/login` | same | T3 | 260 ms | PASS |
| Dashboard - full load | `performance/039_dashboard-performance.spec.ts` | T2 | 668 ms | PASS |
| Dashboard - `GET /api/me` / `GET /api/config` | same | T3 | 34 ms / 28 ms | PASS |
| Clients list - click-to-controls-visible | `performance/040_clients-list-performance.spec.ts` | T2 | 164 ms | PASS |
| Reports Consult - click-to-"generating" state | `performance/041_reports-consult-performance.spec.ts` | T6 | 1,545-1,640 ms | PASS |
| **Reports Consult - click-to-report-actually-rendered (the real Consult completion)** | same | T6b | **21,741 ms** | PASS (within max 75,000 ms) |
| Reports Consult - `GET /api/report/{client}/` | same | T3 | 49-123 ms | PASS |
| **PDF Generation - click-to-completion (report already rendered)** | `performance/042_pdf-generation-performance.spec.ts` | T7 | **7,153 ms** | PASS (within max 120,000 ms; see 2026-07-22 correction note below - superseded prior 20,082 ms figure) |
| Top Navigation - all 6 sections (Dashboard/Admins/Clients/Markets/Upload/Reports) | `performance/043_navigation-performance.spec.ts` | T2 | 71–470 ms each | PASS (all 6) |
| Admins - Team Management table | `performance/044_admins-team-management-performance.spec.ts` | T2/T3 | 629 ms / 28 ms | PASS |
| Admins - Unsupervised Asset Classes + `GET /api/group-dataclass` | `performance/045_admins-asset-classes-performance.spec.ts` | T2/T3 | 105-212 ms / 17-42 ms | PASS |
| Admins - Firewall Configuration + `GET /api/ip-white-list` | `performance/046_admins-firewall-performance.spec.ts` | T2/T3 | 104-108 ms / 15-18 ms | PASS |
| Admins - Logs | `performance/047_admins-logs-performance.spec.ts` | T2 | 149 ms | PASS |
| Markets - ISIN tab + search | `performance/048_markets-isin-performance.spec.ts` | T2/T4 | 532 ms / 2,029 ms | PASS / WARN (search within max 5,000 ms) |
| Markets - Currency tab + `GET /api/currency-detail` + Add Currency dialog | `performance/049_markets-currency-performance.spec.ts` | T2/T3/T5 | 104-122 ms / 16-36 ms / 119-201 ms | PASS |
| Upload - history table | `performance/050_upload-history-performance.spec.ts` | T2 | 535 ms | PASS |
| Upload - Import File dialog open | `performance/051_upload-import-wizard-performance.spec.ts` | T5 | 375 ms | PASS |
| Reports - client autocomplete | `performance/052_reports-client-search-performance.spec.ts` | T4 | 80 ms | PASS |
| Settings - Change Password page | `performance/053_settings-change-password-performance.spec.ts` | T2 | 361 ms | PASS |
| Client detail view - open / `GET /api/account/{id}` / back | `performance/054_client-detail-view-performance.spec.ts` | T2/T3 | 227-393 ms / 38-46 ms (n/a some runs) / 97-229 ms | PASS |
| **Report Lifecycle (main feature) - Consult (progress state)** | `performance/055_report-lifecycle-sla-performance.spec.ts` | T6 | 1,565-1,587 ms | PASS |
| **Report Lifecycle (main feature) - Consult (report actually rendered)** | same | T6b | **22,646 ms** | PASS (within max 75,000 ms) |
| **Report Lifecycle (main feature) - Generate PDF** | same | T7 | 8,416 ms | PASS (see 2026-07-22 correction note below - superseded prior 28,125 ms figure) |
| **Report Lifecycle (main feature) - TOTAL Consult click to PDF ready** | same | — | 31,062 ms | Real end-to-end wait a user experiences |
| Report Lifecycle (main feature) - Download | same | T8 | 318-331 ms | PASS |
| Markets - ISIN Export (real download) | `performance/056_markets-export-performance.spec.ts` | T8 | 5,026 ms | WARN (within max 10,000 ms) |
| Clients - search filter | `performance/057_clients-search-performance.spec.ts` | T4 | 996 ms | PASS |
| Admins - Team Management search filter | `performance/058_admins-search-performance.spec.ts` | T4 | 914 ms | PASS |
| Sign Out - click to `/login` | `performance/059_sign-out-performance.spec.ts` | T2 | 325 ms | PASS |
| Language toggle - EN→FR / FR→EN | `performance/060_language-toggle-performance.spec.ts` | T2 | 1,057 ms / 710 ms | PASS |
| Add Client dialog open | `performance/061_add-client-dialog-performance.spec.ts` | T5 | 411 ms | PASS |
| Add User dialog open | `performance/062_add-user-dialog-performance.spec.ts` | T5 | 192 ms | PASS |
| ISIN row Edit dialog open | `performance/063_isin-edit-dialog-performance.spec.ts` | T5 | 1,533 ms | WARN (within max 4,000 ms) |
| **Clients pagination - `GET /api/client?page=1`** (new 2026-07-23) | `performance/064_clients-admins-pagination-api-performance.spec.ts` | T2/T3 | 97-704 ms / 62-96 ms | PASS |
| **Admins pagination - `GET /api/user?page=1`** (new 2026-07-23) | same | T2/T3 | 104-295 ms / 23-165 ms | PASS |
| **Clients search - `GET /api/client?search=`** (new 2026-07-23) | `performance/065_search-filter-api-performance.spec.ts` | T3 | 55-123 ms | PASS |
| **Admins search - `GET /api/user?search=`** (new 2026-07-23) | same | T3 | 21-28 ms | PASS |

**All 26 performance tests passed against the formal SLA** (26/26, chromium, 2.3 min total) - zero FAILs. Three measurements landed in **WARN** (within SLA but above target, not a failure): the ISIN search (2,029 ms vs. 1,500 ms target), Markets Export (5,026 ms vs. 3,000 ms target - a real file download, inherently more variable than an in-page render), and the ISIN Edit dialog open (1,533 ms vs. 1,000 ms target). None breached its `max`. Login, which had WARN'd in the prior run, came back fully GOOD across all three of its measurements once the false-failure-prone assertion timeout was fixed (see the bug note above) - reinforcing that the earlier WARN reading was genuine transient environment variance, not a code-side issue on either the test or the app.

**Headline finding, unchanged: PDF Generation remains the one clear bottleneck in the app** - 20.1-42.4 seconds across this section's two PDF-generation tests (a wider spread than the 2026-07-21 baseline alone suggested), comfortably inside its formal SLA max of 120s and generally within its 60s target, but still tens of times slower than nearly every other flow measured, all of which complete in well under 2.5 seconds. This matches (and continues to quantify) AC5 and the report-lifecycle suite's own generous per-test timeouts (up to 180s). Not yet determined whether this is inherent to server-side PDF rendering/composition or has optimization room - would need a backend-side trace, out of scope for browser-side Playwright measurement.

**Known measurement gap (unchanged):** `GET /api/client`, `GET /api/user`, `GET /api/log`, `GET /api/isin`, and `GET /api/stock` resource-timing lookups still return no captured entry ("n/a") in this run, including for `/api/client` which *had* a captured entry (67 ms) in the 2026-07-21 baseline run - most likely a Resource Timing buffer/entry-lifecycle quirk rather than the requests not firing (the surrounding click-to-visible timing, which does not depend on Resource Timing, passed normally in every case). The T2/T5/T6/T8 wall-clock measurements are unaffected. Confirming the exact real endpoint substrings for Team Management, Logs, ISIN, and Upload history (the way Login/Dashboard/Clients/Reports already were) is a good follow-up before relying on their T3 numbers.

**Update (2026-07-23):** the `/api/client` and `/api/user` gap above is now understood and resolved for the two *new* pagination tests (`064`) - reading Resource Timing entries immediately after the row-visible assertion can race the entry actually being appended to the buffer; a `waitForLoadState('networkidle')` plus a short settle wait before reading resolved it reliably across repeated runs. `044`/`047`/`048`/`050`/`054` still occasionally report "n/a" for `/api/user`, `/api/log`, `/api/isin`, `/api/stock`, and `/api/account/{id}` respectively even with this project's existing `waitForLoadState('networkidle')` pattern - confirmed via `page.on('request')` that the real HTTP call does fire every time (e.g. `GET /api/account/340` returned 200 in a case where the resource-timing lookup still reported "n/a"), so this is specifically a Resource Timing capture gap, not a missing/failed request. Since every existing test in this suite already treats "n/a" as an acceptable, non-failing outcome for exactly this reason, no further fix was made - the T2 wall-clock gate remains a real, unaffected assertion regardless.

**Correction (2026-07-23, later same day, by request - "some endpoint have no measured duration for verdict"):** the note directly above was wrong about `047`/`048`/`050`/`054` already having the `waitForLoadState('networkidle')` pattern - checking their actual code found **none of the four ever called it** before reading Resource Timing; that claim was an unverified assumption, not something actually checked at the time. Worse, for two of them the "n/a" was never a timing race at all:

- **`047` (Admins Logs) and `050` (Upload History) were asserting against the wrong endpoint entirely.** Live network inspection found the real calls are `GET /api/entrance/list-logs` (not `/api/log`) and `GET /api/audit` (not `/api/stock`) - substrings that never matched anything, in any timing condition. Fixed by asserting against the correct endpoint.
- **`048` (Markets ISIN) and `054` (Client Detail View) were a genuine timing race**, same root cause as `064`'s original bug - fixed the same way, with `waitForLoadState('networkidle')` + a settle wait inserted after the T2 measurement (so it doesn't pollute that number) and before reading Resource Timing.

After both fixes: `054`'s `/api/account/{id}` and `050`'s `/api/audit` now capture reliably every run; `047`'s `/api/entrance/list-logs` captured cleanly; `048`'s `/api/isin` still intermittently reports "n/a" (confirmed via re-run: worked the very next attempt, 1,810 ms) - this is the same, separate, already-documented capture gap specific to that endpoint's large payload (see the P99 methodology section and its `n=15` sample-size rationale in `specs/performance-sla.md`), not something these two fixes were meant to (or did) resolve. `044` (Admins Team Management, `/api/user`) was not touched this pass and remains open - same fix would likely apply, not yet verified.

**Verification pass on the three WARN readings above (2026-07-22, same day):** each of `048`/`056`/`063` was re-run in isolation (outside the 26-test sequential suite) to check whether its WARN was transient noise or a real, reproducible characteristic - the same isolate-and-recheck method already established in this project for distinguishing the two (see §3a/§3e in test-results/Report.md).

- **ISIN search - not a real issue.** Isolated runs measured 30 ms and 31 ms (twice), both comfortably PASS - a world apart from the 2,029-2,155 ms WARN readings measured when this same test ran ~11th deep in the full 26-test sequential suite. The search itself is near-instant; the WARN was purely a symptom of this environment's already-documented tail latency under sustained session load (Issue 19), surfacing here for the first time on a search interaction rather than Consult/PDF-generation. Not a code or product defect - no fix needed, just confirmation the earlier reading was noise, not signal.
- **Markets Export - real and reproducible.** Measured 5,026 ms (in-suite) and 3,034 ms (isolated) - both land in the same 3-5s band and both WARN (target 3,000 ms), consistently, regardless of suite position. This is a genuine characteristic of a real ~2,438-row xlsx export + browser download, not flakiness. Comfortably within its 10,000 ms max both times.
- **ISIN Edit dialog - real and reproducible.** Measured 1,533 ms (in-suite) and 1,502 ms (isolated) - consistently ~1.5s regardless of suite position, unlike the blank Add-dialogs elsewhere in this suite which open in under 500 ms (Add User 192 ms, Add Currency 119-160 ms, Add Client 411 ms). The difference makes sense: Edit has to fetch and pre-fill the row's existing values before rendering, while Add opens an empty form - a real, structural reason for the gap, not a bug.

**Conclusion:** of the three WARN-tier flows, only one (ISIN search) was environment noise; Markets Export and the ISIN Edit dialog are genuinely, consistently slower than their targets for structural reasons (a real file generation, and a pre-fill fetch, respectively) - both remain comfortably within their SLA max and are not recommended for a threshold change, since loosening the target to eliminate the WARN would reduce the signal's usefulness for catching a *future* real regression on these two flows specifically.

**Correction (2026-07-22): "Consult" and "PDF Generation" were both being measured incompletely, and the boundary between them was wrong.** A user manually checking the app noticed Consult itself taking much longer than the ~1.6s documented above, and PDF Generation completing faster than the documented ~20-35s baseline. Investigation confirmed both observations pointed at the same root cause: every Consult-related test (`041`, `042`, `055`, and every functional Consult test in `report-lifecycle/001`-`010`) stopped watching the instant the "report is being generated" progress bar *appeared* - none waited for it to disappear and the report to actually render. That real render wait (~20-25s, unchanged whether measured via `041`, `042`, or `055` - see the new T6b rows above) was never reported anywhere: it either vanished into an untimed `waitForLoadState('networkidle')` call, or bled into the adjacent PDF Generation timer via Playwright's click-actionability auto-wait, depending on timing luck from run to run - which is the likely explanation for why the old T7 numbers varied so widely (20,082 / 28,125 / 35,645 ms) despite timing "the same click" each time. All three files now explicitly time the render wait as its own SLA tier (T6b, `specs/performance-sla.md`), so the true PDF Generation number (click-to-completion once the report has already rendered) is now a consistent 7,153-8,416 ms, and the real end-to-end "Consult then Generate PDF" experience a user actually feels is ~30-31 seconds, not the ~1.6s or ~20-35s either tier suggested in isolation. Separately, 12 back-to-back isolated Consult repeats in an otherwise idle session stayed flat at 20.0-25.5s with no degradation trend, so the specific multi-minute case the user described was not reproduced by repetition alone - it most likely requires genuine concurrent load on the shared account (see the tail-latency finding immediately below), which this suite deliberately doesn't generate.

**Follow-up finding (2026-07-21): Reports Consult has real tail-latency variance a single clean measurement doesn't show.** Across that day's several full-suite executions (each running ~110+ other tests back-to-back against the same shared live account beforehand), `041_reports-consult-performance.spec.ts`'s own `"report is being generated"` assertion (20s timeout) - and the equivalent assertion in multiple report-lifecycle "Consult" tests - timed out outright at least twice, always passing cleanly again on an immediate isolated re-run. This is the same class of variance noted for PDF Generation, just far less frequent and severe. Treat every PASS/WARN verdict above as "typical under this run's conditions," not "guaranteed" - tail latency under sustained cumulative load is exactly what this environment is hardest to reason about (see §3e in test-results/Report.md, and Issue 19 in exploratory-findings.md). This is also why T6's `max` (10,000 ms) and T2's `max` values were set with deliberate multi-x margin above observed baselines rather than tightly - see specs/performance-sla.md for the full rationale per tier.

**2026-07-23: API-endpoint coverage expansion, found by live-exploring the app rather than reading existing tests.** By request, extended T3 (API Read) coverage by logging into the live app (Chromium, via the Playwright MCP planner tools) and reading actual network traffic per feature area, rather than assuming from test code alone which endpoints existed. This surfaced four real, previously-unasserted read endpoints - `GET /api/group-dataclass` (Admins - Unsupervised Asset Classes), `GET /api/ip-white-list` (Admins - Firewall Configuration), `GET /api/currency-detail` (Markets - Currency), and `GET /api/account/{id}` (Client Detail View) - each added as a T3 assertion to its existing test (`045`/`046`/`049`/`054`) alongside the T2 navigation timing it already had. Also added two new files: `064_clients-admins-pagination-api-performance.spec.ts` (clicks "Next page" and gates the resulting `page=1` call on `/api/client` and `/api/user`, since every existing list test only ever exercised page 0) and `065_search-filter-api-performance.spec.ts` (isolates the actual filtered `GET /api/client?search=`/`GET /api/user?search=` call, complementing `057`/`058`'s UI-wall-clock-only search timing). All new/changed assertions passed against T3 (`API_READ`, target 800 ms / max 3,000 ms) with real measured durations of 15-165 ms across every endpoint above (see the coverage table rows tagged "new 2026-07-23").

**Two more false-failure bugs found and fixed the same day, both pre-existing and unrelated to the coverage work above** - surfaced only because a full-suite run was done afterward to confirm nothing else broke:

- `041_reports-consult-performance.spec.ts` had **no `test.setTimeout()` override**, unlike its siblings `042` and `055` (both 180s). Since T6b alone allows up to 75s, a legitimately SLA-compliant run (29,248 ms, well under the 75,000 ms max) still hit Playwright's default 30s *test* timeout and failed outright - the per-test timeout was tighter than the SLA it was asserting. Fixed with `test.setTimeout(120_000)`.
- `041` and `055` both still gated Consult completion on `getByText(/report is being generated/i).toBeHidden()` - the exact zero-match-is-trivially-hidden race that `helpers/reports.ts`'s `waitForReportRendered()` was written to fix that same day for the report-lifecycle functional specs (`001`-`010`), but the fix was never propagated to these two performance specs. It reproduced live: `055` failed with the progress text never appearing within 20s, page still showing the blank Consult search form. Fixed by applying the same pattern inline in both files - tolerate the progress text never appearing, and gate completion on the PDF toolbar button becoming visible instead of the progress text becoming hidden.

After both fixes, a fresh full-suite run (30 tests, all files including the new `064`/`065`) passed 29/30, with the single failure being `041` timing out waiting 75s for the report to render - a **different, pre-existing failure mode** than either bug just fixed (this was a genuine backend stall, not a test-logic bug): re-running `041` alone immediately afterward passed cleanly at 14,043 ms. This is the same documented tail-latency characteristic as the 2026-07-21 finding directly above, not a regression introduced by today's changes - Consult occasionally exceeds even a generous window on this shared live environment, and no single run should be read as a permanent verdict on it.

**2026-07-23, same day: switched from single-sample gating to real P99 (percentile) SLA gating, by request.** Every test above gates one measured sample per run - a real signal, but not what "P99 SLA" means in the industry-standard sense (the 99th percentile of a *distribution* of repeated samples). Added `percentile()`, `summarizeSamples()`, and `assertP99SLA()` to `helpers/performance.ts`, and a new file, `066_p99-sla-performance.spec.ts`, that repeats each flow N times per run and gates the P99 duration instead of one click. N is scaled per tier's real cost rather than uniform, since this project explicitly avoids generating repeated/concurrent load against its one shared live dev account: 30 for navigation and the cheap API reads (`/api/client`, `/api/user`), 15 for `/api/isin` (each sample is a real ~614 KB payload), 5 for `/api/currency-detail` (across 5 different historical months, not repeats of one), 5 for Report Consult, and 3 for PDF Generation (each of those two costs 15-90s+ per sample and requires its own real report generation). See `specs/performance-sla.md`'s new "P99 methodology" section for the full table and rationale.

**Two data-volume questions investigated live, by request - "does Markets > Currency ('Devise' in French) or Markets > ISIN hold enough data to matter, and does load time vary with it":**

- **Currency ("Devise")**: only ~10-14 rows for any single month (confirmed via the live `/api/currency-detail` JSON response) - the "lot of data" question here is really about the `month` query parameter, not row count. Swept 5 periods from the current month back to 2003 (the earliest year the app's date picker allows): P99 across those 5 calls was **125 ms** (min 17 / P50 35 / max 125 ms) against an 800 ms target / 3,000 ms max - fast and flat regardless of how far back the queried month is, no evidence older data is slower to fetch.
- **ISIN**: genuinely does hold a lot of data - confirmed live at **2,438 rows / ~614 KB** for a single month's JSON response (matching the row count already cited for Markets Export above). Two independent runs measured P99 = 2,673 ms and P99 = **3,203 ms** against the 800 ms target / 3,000 ms max - the second run's P99 actually **exceeded the hard max and failed the gate**, not just WARN'd. This is the one endpoint in today's entire P99 sweep that breached its ceiling, and it's structural (a real, unpaginated 2,438-row payload), not flakiness. Recommendation logged in `specs/performance-sla.md`: paginate this endpoint (root-cause fix, matching `/api/client`/`/api/user`) or give it its own SLA tier - a product/eng decision, not something to resolve unilaterally in the test suite.
- Building the Currency sweep also surfaced two dead ends worth recording so they aren't retried: clicking through the Material date-picker's year/month grid is fragile across repeat cycles in a loop, and typing the date character-by-character fires a live-reparsed request per keystroke (including one observed literal `GET /api/isin?month=Invalid%20date` → 400 mid-type). A single atomic `fill()` on the date input produces exactly one clean request per period and was used instead.

**Bug found and fixed while building the slow-tier P99 tests: `consultReport()` breaks on a 2nd Consult in the same test.** The shared helper's final click, `getByRole('button', { name: 'Consult' })`, is a substring match - fine on a fresh page, but once a report has already rendered once, the portfolio tree's per-bank toggle buttons are named `"Toggle Consultation des portefeuilles ..."`, which also contains "Consult". This is latent in the helper the whole time (every other caller only ever Consults once per fresh page) and only surfaced because the new P99 tests repeat Consult 5x and PDF Generation 3x in a single test. Fixed with `exact: true` on that one locator. After the fix, both slow-tier P99 tests passed cleanly:

| Flow | File | Tier | n | min / P50 / P99 / max | Verdict |
|---|---|---|---|---|---|
| Report Consult (full render) | `066_p99-sla-performance.spec.ts` | T6b (P99) | 5 | 19,149 / 21,693 / 26,705 / 26,705 ms | PASS (target 35,000 / max 75,000 ms) |
| PDF Generation | same | T7 (P99) | 3 | 6,971 / 10,327 / 12,389 / 12,389 ms | PASS (target 60,000 / max 120,000 ms) |
| Navigation (Dashboard↔Clients) | same | T2 (P99) | 30 | 76 / 98 / 153 / 153 ms | PASS |
| `GET /api/client?page=0...` | same | T3 (P99) | 30 | 55 / 68 / 315 / 315 ms | PASS |
| `GET /api/user?page=0...` | same | T3 (P99) | 30 | 18 / 21 / 31 / 31 ms | PASS |
| `GET /api/isin?month=2026-07` (2,438 rows), run 1 | same | T3 (P99) | 15 (n=2 captured) | 1,787 / — / 2,673 / 2,673 ms | WARN (above 800 ms target, under 3,000 ms max) |
| `GET /api/isin?month=2026-07` (2,438 rows), run 2 (full-suite re-run) | same | T3 (P99) | 15 (n=2 captured) | — / — / 3,203 / 3,203 ms | **FAIL** - exceeded the 3,000 ms max |
| `GET /api/isin?month=2026-07` (2,438 rows), runs 3-6 (re-verification) | same | T3 (P99) | 15 each (n=2-3 captured) | — / — / 3,403, 3,062, 3,636, 3,700 ms | **FAIL x4** - all four exceeded the 3,000 ms max |
| `GET /api/isin?month=2026-07`, later full-suite run - **anomalous, root-caused as a test bug (see below)** | same | T3 (P99) | 15 (n=15 captured, all) | 1,701 / — / **18,653** / 21,006 ms | Correctly failed, but the magnitude was a measurement artifact, not real latency - see the pacing-bug fix below |
| `GET /api/isin?month=2026-07`, re-verified 3x after fixing the pacing bug | same | T3 (P99) | 15 each (n=3 captured) | — / — / 3,918, 3,934, 4,404 ms | **FAIL x3** - core finding confirmed at the correct, non-inflated magnitude |
| `GET /api/currency-detail` (5 periods, 2003-2026) | same | T3 (P99) | 5 | 17 / 35 / 125 / 125 ms | PASS |

**Uptime/availability framing, by request.** This project has no true uptime/availability monitoring (no synthetic pings, no APM) - see `specs/performance-sla.md`'s new "SLA & Uptime Calculator" section for the standard 99.9% downtime-allowance reference table and why manufacturing a "99.9%" figure here would be dishonest. The closest real data this project has is a Consult-completion SLA-compliance rate: **100% (12/12)** under idle/isolated repetition (2026-07-21), versus **75% (6/8)** under heavy same-session repetition today (2026-07-23) - not a contradiction, two different regimes, both too small a sample to statistically claim "99.9%" either way. See `specs/performance-sla.md`'s new "Overall Conclusion" section for the full system-health verdict: healthy across every measured flow for normal single-user use, with Consult's tail-latency behavior under sustained repeated use as the one open risk worth a backend-side look.

**2026-07-23, continued: re-verification pass + deeper live exploration, by request ("keep verify your performance test and find more endpoints, thorough exploration, I want assurance").** Two parts:

**1) Re-verified the ISIN finding with 4 more independent runs specifically to answer "is this frequent."** The original two runs (2,673 ms WARN, 3,203 ms FAIL) weren't enough to say whether breaching the SLA was rare or common. Four more isolated runs of the same test measured **3,403 / 3,062 / 3,636 / 3,700 ms** - all four also exceeded the 3,000 ms max. **Total: 5 of 6 independent runs (83%) breached the ceiling**, clustering consistently in a 2.7-3.7s band with no run landing anywhere near the 800 ms target. This settles the question: `/api/isin`'s slowness is its *normal* behavior, not an occasional tail event - the finding is upgraded from "WARN, worth watching" to "confirmed, frequent, root-caused, needs action" in `specs/performance-sla.md` and the PM summary.

**2) Live-explored previously-untouched areas of the app for more endpoints and to root-cause Consult's latency, by request.** Checked Settings/Change Password (no API call at all - pure client-side page, confirming why `053` has no T3 assertion), the Upload Import wizard dialog (no API call until a file type is actually chosen), and then ran a full live Consult while capturing every `/api/report/*` call's complete Resource Timing record (`startTime`/`fetchStart`/`requestStart`/`responseStart`/`responseEnd`). This surfaced **6 previously-uncatalogued endpoints** - `GET /api/report/client?search=`, `GET /api/report/client/{name}/months`, `GET /api/report/pdf?client=&month=`, `GET /api/report/{reportId}`, and `GET /api/report/{reportId}/sections/{hash}` (fired **14 times** in one Consult - the report is assembled from ~14 independent section fetches, not one payload) - see `specs/performance-sla.md`'s new "Report generation architecture" section for the full table.

**Answering the specific question "is there queuing latency in Consult":** No, not on the network/browser side. All 22 `/api/report/*` calls in the captured Consult completed in 20-300 ms each, and `fetchStart - startTime` (Resource Timing's own connection-queuing metric) was **exactly 0 ms on every single call** - the browser never queued a request behind a connection limit. The real ~20-30s duration lives entirely in **three idle gaps between completed calls** (~8.0s, ~8.7s, ~15.3s) with zero network activity (no polling, no WebSocket/SSE) observed during any of them. This rules out slow queries, connection contention, and network-bound rendering as causes - the gaps most likely reflect a server-side async job the client is waiting on via a mechanism invisible to browser-based measurement (no visible poll or push), which would need backend tracing/APM to quantify further, not something achievable from this test suite. This is a materially better root-cause understanding than "Consult takes ~20-30s, structural cost of assembling a report" - now we know specifically *where in the flow* the time goes (three gaps, not the data-fetch calls themselves) and can rule out several plausible causes with confidence.

**Full re-verification of the rest of the suite, same session:** re-ran the entire performance suite (34 tests, excluding the already-validated expensive slow-tier P99 repeats) - 33/34 passed, the only failure being the (now-expected, confirmed-real) ISIN P99 breach. Nothing else regressed.

**2026-07-23, later re-verification pass, by request ("rerun and analyze again for verification"), then ("push the code and show me the report"):** re-ran the full suite twice more. First re-run: 33/34 passed, one new (then-unseen) failure in `042` - the month-dropdown option became unstable/detached mid-click and Playwright retried for the full 3-minute timeout. Investigation found `042` still had the exact `toBeVisible()`/`toBeHidden()` race fixed in `041`/`055` earlier the same day - it had simply never been unlucky enough to hit it until now. Fixed identically (tolerate the progress text never appearing, gate on the PDF toolbar button instead) and verified: reproduced a genuine Consult stall on the very next run (same blank-search-form screenshot as the already-documented tail-latency finding), then passed cleanly on immediate retry - confirms the fix works and this was the same known stall pattern, not a new bug. Pushed all pending work (4 commits total) to `origin/main`.

**Then, building the Allure report requested for this session, a real bug was found in the P99 methodology itself.** A run intended to produce clean data for Allure instead surfaced an anomaly: the ISIN P99 test's 15 samples, when *all 15* happened to be captured (n=15 instead of the usual n=2-3), formed a near-perfectly linear climb - 1,701 / 2,864 / 4,303 / 5,912 / 7,014 / 8,037 / 9,473 / 10,707 / 11,937 / 13,114 / 14,532 / 16,004 / 17,297 / 19,263 / **21,006 ms**. Root cause, confirmed via three follow-up debug scripts: `066`'s ISIN loop fired all 15 nav-away-and-back cycles back-to-back with no per-cycle settle wait - "ISIN tab selected" resolves as soon as the tab UI switches, well before the underlying `/api/isin` fetch completes, so cycle N+1 could fire while cycle N (and its Dashboard-revisit siblings) were still in flight. Confirmed via a wall-clock check (`page.on('response')`, no waiting) that the *UI* stayed flat at ~200-260ms per cycle regardless - the escalation was invisible to a user, only visible in the Resource Timing entries themselves. Confirmed via a full per-call Resource Timing breakdown *with* per-cycle pacing that a single, properly-paced call measures a flat ~1.6s TTFB with zero variance. **The self-inflicted request pile-up, not the endpoint, was producing the climbing numbers.** Fixed by moving `waitForLoadState('networkidle')` inside the loop (one wait per cycle, not one at the end). Re-verified 3 more times after the fix: **3,918 / 3,934 / 4,404 ms** - still exceeding the 3,000 ms max on all three (and if anything slightly higher than earlier in the day, plausibly reflecting cumulative session load rather than the fix), which means **the core finding survives the correction** - `/api/isin` really does consistently exceed its SLA ceiling - but the honest range is **~1.6-4.4 seconds, not "up to 21 seconds."** That extreme figure was measurement error and has been corrected everywhere it appeared (`specs/performance-sla.md`, this file, `specs/performance-summary-for-pm.md`). This is exactly the kind of self-check this project's own methodology is supposed to catch - found here by building an Allure report from real data rather than trusting an aggregate number at face value.

**2026-07-23, same session, by request ("find more endpoints too with client and employee, not just admin"): extended coverage to the app's other two roles.** Every test up to this point logs in as ADMIN only. Reused two existing dedicated synthetic accounts from the 2026-07-21 mail-service investigation (`QA Mail Test Admin`, role EMPLOYE; `QA Mail Test Client`) rather than creating new noise, setting a known password on each directly via each role's own "Reset password" admin action (no email round-trip needed) - credentials stored as `FAPA_EMPLOYEE_EMAIL`/`PASSWORD` and `FAPA_CLIENT_PORTAL_EMAIL`/`PASSWORD` in `.env` (pattern documented in `.env.example`).

**EMPLOYE role, `068_employee-role-performance.spec.ts`:** confirmed live that EMPLOYE has no "Admins" nav item and a direct `/admin` navigation redirects away server-side (real backend authorization, not a hidden link). `GET /api/me` returns `"role":"EMPLOYEE"` and `"permission":60`. Every operational screen it can reach hits identical endpoints to ADMIN with statistically indistinguishable timing - confirmed with a real P99 pass (30 paced cycles): Dashboard→Clients P99 788 ms (UI), `GET /api/client` P99 89 ms - both comfortably fast, essentially the same profile ADMIN gets for the same flow. Parity confirmed, not new endpoint discovery.

**Client Portal role, `067_client-portal-performance.spec.ts`:** a genuinely distinct, far more restricted surface (only Dashboard/Reports nav). This investigation resolved the open question `specs/planner.md` §14.2 had left unanswered on 2026-07-21 ("what advisor action makes a report visible in the client portal?") - **it's specifically "Validate PDF", not Consult or Generate PDF alone**, confirmed directly from the app's own confirmation-dialog copy: *"Once validated, this PDF will be visible on the client's dashboard."* Before that, the client dashboard shows only greyed-out placeholders regardless of how much real advisor-side data exists.

To get a representative (non-empty) measurement, seeded `QA Mail Test Client` with real portfolio data: took the existing `1. JDD_model_portefeuille.xlsx` fixture (already used by `report-lifecycle/001_portfolio.spec.ts`), unzipped it (`.xlsx` is a zip), confirmed via `xl/worksheets/sheet1.xml` that column A's plain-text `"Client"` value is the only thing that determines which client an import row targets, replaced all 30 occurrences of `"QA Automation Client"` with `"QA Mail Test Client"` in a copy, and repackaged it as a new derived fixture (`fixtures/qa-mail-test-client-portfolio.xlsx`, forward-slash zip entry paths required - .NET's `ZipFile.CreateFromDirectory` emits backslashes on Windows and silently produces a technically-invalid-per-spec archive that this app's backend still happened to accept, but `ZipArchive` with explicit entries was used instead to be correct rather than lucky). Imported it via the real Upload > Import UI, then Consulted → Generated PDF → Validated for the current month before measuring.

Real P99 results (both fully captured, n=15 and n=13):

| Flow | n | P99 | Verdict |
|---|---|---|---|
| Client Dashboard click-to-visible | 15 | 2,263 ms | WARN, consistent (not noise) |
| Client Reports click-to-visible | 15 | 2,184 ms | WARN, consistent (not noise) |
| `GET /api/dashboard` (client role) | 13 | 98 ms | PASS - fast |
| `GET /api/report/doc` (client role) | 13 | 66 ms | PASS - fast |

The WARN is real but not concerning: the underlying API calls are fast (P99 66-98 ms), so the ~2.2s click-to-visible time is pure UI render weight from rendering the *entire* validated report inline on click - the same content weight as the advisor's own post-Consult view, not a lightweight list. Full endpoint catalog (also surfaced by this investigation - `POST /api/stock` for import, `PUT /api/report/validate/{id}` for the actual publish action, and ~10 more per-section report endpoints like `/api/consolidation-global`, `/api/passif`, `/api/real-estate`, `/api/gestion-locative`, `/api/movements-bancaire`, `/api/arts/clients/`, `/api/direct-private-equity/clients/related`) is documented in full in `specs/performance-sla.md`'s new "Role-based coverage" section.

Full suite re-verification after adding both new files: 41/41 passed.

**2026-07-23, same session, by request ("I saw 17 endpoint mention with no measure time help update" / "if n/a please specific reason"): systematic audit of every "n/a" resource-timing gap across the whole suite.** Rather than continue treating "n/a" as an acceptable blanket outcome, audited every file calling `getResourceDurations` for whether it waits for the underlying fetch to settle before reading, and found two genuinely different root causes hiding behind the same symptom:

- **Wrong endpoint entirely (not a timing issue at all):** `047` (Admins Logs) was asserting against `/api/log`, but live network inspection shows the real call is `GET /api/entrance/list-logs` - a substring that could never have matched, regardless of timing. `050` (Upload History) had the same problem: asserting `/api/stock`, but the real call is `GET /api/audit`. Both fixed by asserting the correct endpoint.
- **Genuine timing race** (the same root cause as `064`'s original bug): `044` (Team Management), `045` (Asset Classes), `046` (Firewall), `049` (Currency), and `054` (Client Detail) all read Resource Timing immediately after their visibility assertion, before the fetch was necessarily captured in the buffer. Fixed identically in all five: `waitForLoadState('networkidle')` + a 500ms settle wait inserted after the T2 timing measurement (so it doesn't pollute that number) and before reading Resource Timing.

Checked but deliberately left unmodified, with specific reasons (not just "seems fine"):
- **`038` (Login), `040` (Clients list), `041` (Reports Consult)** - none have ever produced "n/a" in any run this session. `038`'s read happens after a full page navigation completes (`toHaveURL` on a real nav, not an SPA route change), which settles more thoroughly than an SPA click. `041`'s read happens after waiting up to 75s for the PDF toolbar button (Consult's actual completion signal), by which point the early-firing `/api/report/{client}/` call has had ample real time to be captured regardless. `040` has no structural reason to expect a race and has never shown one - left alone rather than adding an unproven wait.
- **`039` (Dashboard) already had the fix** (`waitForLoadState('networkidle')` before both of its `getResourceDurations` calls) - correctly designed from the start, not something this pass needed to touch.

Re-verified all fixed files individually - `044`/`045`/`046`/`047`/`050`/`054` now capture real durations every run. `048` (Markets ISIN) remains intermittent even after the identical fix - this is the same, already-documented, separate issue (a real ~614 KB payload occasionally missed by the Resource Timing buffer specifically for this endpoint - see the P99 methodology's `n=15` rationale in `specs/performance-sla.md`), confirmed non-reproducible on immediate retry (failed once, passed the very next run at 1,810 ms).

**Bonus finding from this pass, not something being chased further: running two full performance suites concurrently (one headed, one headless, both hitting the same shared live account at once) pushed the new Client Portal Reports/Dashboard tests (`067`) past their SLA ceiling** - P99 up to 8,739 ms against a 6,000 ms max, and even the single-sample Reports test failed once. Re-running the same file in complete isolation immediately after both concurrent runs finished passed cleanly (5/5, P99 2,750 ms / 3,451 ms, both back to the expected WARN-not-FAIL range). This is a third independent confirmation of the "concurrent load pushes tail latency past SLA" pattern already documented for Consult (Issue 19) and now demonstrated experimentally rather than accidentally - by literally running two suites at once - on a completely different flow (client-portal report rendering). Not a code bug in `067`; a reminder that this suite's own single-worker, non-concurrent design (see `playwright.config.ts`) exists precisely to avoid self-inflicting this exact condition.

**2026-07-23, same session, by request ("should add a propriate measure time" / "with p99 sla too"): closed the 14-endpoint "discovered but never measured" gap the user identified from their own compiled table.** The n/a audit above covered assertions that existed but failed to capture a duration; this pass covered endpoints with *no assertion at all* - real calls firing on every Consult, PDF generation, ISIN edit, and sign-out, confirmed via live network inspection but never wrapped in a timing check.

- **`066` T6b Consult P99** extended to capture all 11 per-domain section endpoints alongside the existing render-time P99 (n=5 each): `consolidation-global`/`-filtered`/`-bank`, `passif`, `real-estate`, `gestion-locative`, `movements-bancaire`, `arts/clients`, `direct-private-equity/clients/related`, `unsupervised/stock/clientName`, `report-todos/clients`. All 11 PASS, P99s ranging 71-518 ms. Prefix-collision endpoints (e.g. `consolidation-global` vs `consolidation-global-filtered`) disambiguated with a trailing `?` on the substring.
- **`066` T7 PDF Generation P99** extended to capture `GET /api/report/check-validated/{id}` (P99 18 ms) and `GET /api/report/{id}/pdf` (P99 112 ms), both PASS, n=3. The latter needed a regex match via `page.evaluate()` since a plain `/pdf` substring would also catch the unrelated `/api/report/pdf?client=...` list call. Hit and fixed a real bug getting here: opening the report actions menu to trigger these calls left its `cdk-overlay-backdrop` intercepting the next click, hanging the test for 458 retries - fixed with `page.keyboard.press('Escape')` before clicking Dashboard.
- **`063` new test**: currency-code autocomplete P99 (n=15, open/cancel the ISIN Edit dialog, never save) - `GET /api/currency-detail/distinct?search=`, P99 82 ms, PASS.
- **`059` new test**: Sign Out P99 (n=10 login/logout cycles) - UI P99 882 ms PASS. `DELETE /api/logout` itself only ever captures **n=1 of 10**, and this is structural rather than a capture bug: each cycle's `login()` is a full page navigation, and Resource Timing's buffer is per-document - it resets on navigation, so every earlier cycle's logout entry is wiped by the *next* cycle's login before the test reads the buffer at the end. Only the last cycle's entry survives. Documented inline as an expected n<=1 ceiling for any endpoint measured across repeated full-navigation cycles, distinct from the ISIN gap (which is a genuine intermittent capture race on an otherwise-stable SPA route).
- **`055`**: added `PUT /api/report/validate/{id}` at n=1 (not P99), using the same "skip if already verified" pattern from `report-lifecycle/001_portfolio.spec.ts`. Deliberately not repeated for a percentile - this is a genuine one-way state change (permanently marks a report verified/client-visible), unlike every other endpoint in this pass. Verified 2026-07-23: passed, correctly reported an honest n/a since the report was already validated earlier this session, rather than forcing a spurious re-validation just to get a number.
- **`POST /api/stock`** (the data-import endpoint) was the one remaining item in the user's table with no path forward decided. Asked directly whether to add a single real sample, full P99 (15-30 real imports), or leave as-is given each run creates a permanent import history record on the live account. **User chose to leave it as n/a** - consistent with the real-data-safety principle already applied throughout this suite (§ top of this file).

### 18. API-Exposure Security Review (2026-07-24, new scope - by request: "explore more api endpoint and try to find is any endpoint can be exposed or unsafe")

New investigation angle distinct from §17's performance focus: is any API endpoint reachable by a role that shouldn't reach it, or exposed in a way that weakens the app's own auth design? All checks below are real, authenticated, read-only GETs (or, for the one write, a password reset on the same already-dedicated "QA Mail Test Client" synthetic account §15 already uses) against the live backend - no destructive action, no new data created. Automated as `tests/fapa-test/security/069`-`071` (9 tests, all passing).

**Auth mechanism, confirmed live by decoding the login response and inspecting cookies at the Playwright-driver level (bypasses `document.cookie`'s JS restriction):**
- Login (`POST /api/entrance/login`) sets two cookies: `token` (30 min expiry) and `refresh_token` (7 day expiry, path-scoped to `/api/refresh` only). Both are `httpOnly: true` (good - not readable via `document.cookie`/localStorage/sessionStorage; confirmed neither holds a token, only `i18nextLng`/`isLogin`).
- Both tokens are PS256 (RSA-PSS)-signed JWTs embedding `role` and `permission` directly in the claims (e.g. `{"role":"ADMIN","permission":127}` / `{"role":"CLIENT","permission":16}`) - confirmed the signature is genuinely verified server-side, not decorative: flipping one character in the signature segment of a live token produces an immediate `401` on the next call, and restoring the original token immediately restores access. Role/permission cannot be forged without the private key.
- Every `/api/*` call additionally requires a static `frontend-name: SPA` header or gets a `401` regardless of cookie validity - confirmed this is a naive bot-filter, not a real security boundary (its value is fixed and visible in every browser request; trivially added to any hand-crafted request, as done throughout this section).
- CORS is correctly locked down: `Access-Control-Allow-Origin` is pinned to the app's own origin on every response (never wildcarded or reflected), and sending an arbitrary attacker `Origin` header gets a flat `403`, not a reflected allow.

**Confirmed finding - broken access control on `GET /api/group-dataclass` (Admins > Unsupervised Asset Classes).** Tested the same 4 admin-only endpoints against both non-admin roles (EMPLOYE, which has zero "Admins" nav item; CLIENT, the most restricted role - Dashboard + Reports only):

| Endpoint | EMPLOYE | CLIENT |
|---|---|---|
| `GET /api/user` (Team Management) | 403 (correct) | 403 (correct) |
| `GET /api/ip-white-list` (Firewall) | 403 (correct) | 403 (correct) |
| `GET /api/entrance/list-logs` (Logs) | 403 (correct) | 403 (correct) |
| **`GET /api/group-dataclass` (Unsupervised Asset Classes)** | **200 (gap)** | **200 (gap)** |

Three of four sibling admin-only endpoints correctly enforce role-based authorization server-side; this one doesn't, for either non-admin role - it's reachable by any authenticated session regardless of role/permission, even though neither EMPLOYE nor CLIENT has any UI path to it at all (the feature is entirely hidden from their nav). **Severity assessed as Low-Medium, not High:** the endpoint's actual payload is only internal asset-classification labels (e.g. `{"id":1,"dataClass":"Participations"}`) - no client PII, financial data, or credentials. The real concern is the *pattern* (inconsistent server-side enforcement across sibling endpoints under the same nav section) rather than this specific instance's data sensitivity - it suggests this one endpoint's authorization check was missed during implementation, and a similar miss on a higher-value endpoint elsewhere is the actual risk worth an engineering audit. By request, the automated test (`069`) documents this as characterization of current behavior (asserts the actual `200`) rather than a red/failing assertion, matching how this project already handles other known product-behavior gaps (e.g. the `/markets` direct-nav quirk in AC2) - see the Defects Log in `test-results/Report.md` for the tracked severity and recommendation.

**No IDOR found on cross-tenant resources.** Account IDs are small, sequential-ish 3-digit integers (e.g. 340, 366, 395, 421 - confirmed live via `/api/client`), unlike report IDs which are opaque UUIDs (e.g. `9fb26b9f-f6a1-4966-a464-18ef4d9e2a9e`) - account IDs would be the realistic IDOR target if authorization ever regressed, since they're guessable within a small range and UUIDs practically aren't. Tested CLIENT (logged in as the dedicated "QA Mail Test Client", account id 421) against three other real clients' account IDs plus its own: **every one returned `403`**, including its own ID - `/api/account/{id}` turns out to be an advisor/admin-facing client-management endpoint the client-portal frontend never calls for its own profile (it uses `/api/dashboard`/`/api/me` instead), so there's no path into it at all for this role, not just a correctly-scoped one. Also confirmed CLIENT cannot list `/api/report` (the full cross-client report list - `403`, correctly scoped to its own portal view only).

**Informational - login response body redundantly exposes both raw JWTs in plaintext JSON, even though the real session transport is the HttpOnly cookie pair above.** The frontend clearly doesn't need this (the cookies alone authenticate every subsequent call, confirmed by every test in this section using only `page.request` with no explicit Authorization header), so handing the same secrets to page JS via the response body undermines part of the reason to use `HttpOnly` in the first place - anything able to read that one network response (browser extensions, client-side error/monitoring tooling that captures response bodies, an XSS specifically on the login flow) could exfiltrate a live token even though `document.cookie` itself is blocked. Recommend the backend stop including `token`/`refreshToken` in the login response body once the frontend is confirmed to only rely on the cookies.

**Informational - auth cookies are missing the `Secure` flag; no `Strict-Transport-Security` header observed.** Both `token` and `refresh_token` are `httpOnly: true` but `secure: false` (confirmed via `page.context().cookies()`). Combined with no HSTS header on any response, a network-position attacker able to force or intercept a plain-HTTP request to this host (e.g. an SSL-stripping attack on hostile Wi-Fi) could technically capture these cookies in cleartext. Low likelihood in practice since the app is HTTPS-only today and there's no evidence of an HTTP listener, but it's a standard, cheap hardening gap - recommend adding `Secure` to both cookies and a `Strict-Transport-Security: max-age=...; includeSubDomains` response header.

**Confirmed finding - HIGH severity, cross-tenant real financial data leak on the per-domain report endpoints.** The report-by-UUID/PDF endpoints above are correctly tenant-scoped (CLIENT gets `403` on another client's report id, its PDF, and `check-validated`). But the *underlying per-domain* endpoints that assemble each section of that same report - `GET /api/consolidation-global`, `/api/passif`, `/api/real-estate`, `/api/gestion-locative`, `/api/arts/clients/{name}`, `/api/report-todos/clients/{name}`, `/api/report/client/{name}/months` (7 of 9 tested) - take a plain `client` NAME string as a query/path parameter instead of deriving the client from the authenticated session, and the backend never checks that name against the caller's own tenant. Confirmed live with **real, non-empty response bodies**, not just a bare `200`: authenticated as "QA Mail Test Client" (CLIENT role), requesting `/api/consolidation-global?...&client=QA Automation Client` returned that *other* client's real portfolio total (`"totalValToday":-34829.700696594`), and `/api/passif?client=QA Automation Client&...` returned that other client's real liability rows (bank name "BNP Banque Privée", real amounts and dates). **Any authenticated client-portal user who knows or guesses another client's exact name string can pull that client's portfolio, liabilities, real estate, rental income, art holdings, to-do notes, and which months have report data** - a genuine cross-tenant confidentiality breach, not a low-sensitivity metadata leak like §18's `group-dataclass` finding. Two of the nine per-domain endpoints tested (`direct-private-equity/clients/related`, `unsupervised/stock/clientName`) correctly returned `403` for the same request pattern, confirming this isn't a blanket "CLIENT role is unauthenticated everywhere" issue but a specific, inconsistent gap in exactly these 7 endpoints' authorization checks. Also confirmed the one write endpoint tested (`PUT /api/report/validate/{id}`) correctly rejects CLIENT with `403` before any processing, using a bogus report id so no real report could be affected either way. **This is the single most severe finding in this project's test history** and, by explicit request, is documented as a regression *characterization* test (asserts the current, leaking `200`s) rather than a red/failing assertion, same treatment as the lower-severity `group-dataclass` gap - see the Defects Log in `test-results/Report.md` for the urgent-priority recommendation. Automated as `tests/fapa-test/security/072_cross-tenant-report-domain-data-idor.spec.ts` (4 tests, all passing).

**Test-infrastructure note (not an app finding):** the CLIENT-portal test account's password required a real reset mid-session (via Clients > row menu > Reset password on the same dedicated "QA Mail Test Client" record §15.2 already established as safe to reset repeatably) after its previously-stored `.env` password had gone stale since the last time it was set; `.env` was updated to match. This is the same pattern already documented in §15/`.env.example` for setting up this account, not a new write pattern introduced here.

New tests: `tests/fapa-test/security/069_rbac-cross-role-authorization.spec.ts`, `070_cross-tenant-idor.spec.ts`, `071_auth-token-integrity-and-cors.spec.ts` (9 tests, chromium only, all passing). Cross-browser (Firefox/WebKit) parity for this area not yet verified, consistent with how several other new-scope areas in this project (mail-service, error-handling) were introduced chromium-only first.

All of the above verified passing individually, run sequentially (not concurrently) after the `067` concurrency lesson two paragraphs up.

### 19. Functional Coverage Gaps (2026-07-24, new scope - by request: "not just performance test help explore more feature you haven't reach to make test case")

Distinct from §17 (performance) and §18 (security/exposure): a survey of every existing spec file against `user-stories/SCRUM.md`'s acceptance criteria and this file's own §1-16 turned up genuine functional gaps - scenarios explicitly flagged elsewhere as "not yet automated"/"discovered but not tested", and asymmetries where one area had a cancel/edit/validation test its sibling areas didn't. All 9 new tests below are read-only or cancel-before-submit, matching this project's real-data-safety principle - none creates, edits, or deletes a real record for good.

- **Reports - Sync cancel path** (`073_reports-sync-cancel.spec.ts`): §12.4's "Data synchronisation" dialog was investigated live in 2026-07-21 but explicitly never automated ("destructive step not executed" - confirming it would completely replace a client's current-month data). This exercises the full flow - open Sync, select a source month, open the "Confirmation of synchronization" dialog - then Cancels at the final step, never confirming. Confirmed live both nested dialogs must be scoped by their own title text (`Data synchronisation` / `Confirmation of synchronization`), not position - they stack, so a positional `.last()` locator silently re-targets the wrong dialog once the top one closes (root-caused a real test bug this way before landing on the fix).
- **Reports - Validate PDF cancel path** (`074_validate-pdf-cancel.spec.ts`): every existing report-lifecycle test (`001`-`010`) only ever clicks "Confirm" on this dialog; Business Rules calls Validate a one-way, irreversible action, so the decline path had zero coverage. Confirmed live the confirmation dialog opens the same way regardless of the report's current verified state, so this is safe to run repeatedly.
- **Markets - Currency Edit cancel** (`075_currency-edit-cancel.spec.ts`): mirrors the existing ISIN Edit-cancel test (`022`); §10.2 already documented the same Edit mechanics for Currency (MM/YYYY and From-EUR-To locked, Rate/Label editable) but it had never gotten its own automated cancel test.
- **Admins - Team Management Edit cancel + prefill** (`076_team-management-edit-cancel.spec.ts`): `010`'s row-menu test only opens and dismisses the kebab menu; the "Edit" option itself (confirmed live to open a genuinely pre-filled "Edit User" dialog, not a blank Add-User copy) was never opened.
- **Clients - Edit cancel + prefill** (`077_client-edit-cancel.spec.ts`): AC3 lists Edit as one of the four row-menu actions; `018` only covers View detail. Confirmed live "Edit Client" opens pre-filled (e.g. existing First Name already populated).
- **Admins - Firewall Add Range cancel** (`078_firewall-add-range-cancel.spec.ts`): `013` only checks the table/empty state; the Add Range dialog itself (Label IP/Start IP/End IP, submit disabled until filled) was never opened, unlike Add User/Add Client/Add Currency which all already have this precedent.
- **Settings - Change Password validation** (`079_change-password-validation.spec.ts`): `029` only checks the disabled-by-default state and navigating away empty; never actually typed a password that should fail. Confirmed live: both a mismatched New/Re-type pair and a password missing 3 of the 5 rules keep the submit button disabled with **no inline error text anywhere on the page** - the only feedback is the button staying disabled, silently. Not asserted as a bug (nothing in AC1/Business Rules requires inline text), but worth a product note - see Recommendations.
- **Auth - Session/token expiry** (`080_session-token-expiry.spec.ts`): distinct from security/071's JWT-tamper test (about signature integrity) and `031`'s explicit Sign Out - this is the functional "session just goes stale" path. Confirmed live the app uses two cookies with different lifetimes: losing only the short-lived `token` is silently and transparently recovered via `refresh_token` (user stays on the protected page, no visible interruption) - a real, positive UX behavior now covered by regression. Losing both redirects to `/login` on the next protected navigation, as expected.
- **Admins - Logs invalid date range** (`081_logs-invalid-date-range.spec.ts`): `014` covers a valid range plus Clear, not an inverted one. Confirmed live: setting Start after End doesn't error, doesn't show an empty/no-data state, and doesn't visibly indicate the range was invalid - "Apply" stays enabled and the table silently falls back to its normal default (unfiltered) view. Documented as the app's actual current behavior (a minor missing-validation gap, not a crash), not an assumed "correct" empty-result behavior that isn't actually implemented.

New tests: `tests/fapa-test/{reports,markets,admins,clients,settings,auth}/073`-`081` (11 tests total, chromium only, all passing - re-verified individually after two real test-authoring bugs were caught and fixed during this pass: 073's dialog-scoping issue above, and 081 initially reading its "before" row count before the Logs table had finished populating, undercounting and producing a false mismatch). Cross-browser parity not yet verified for this batch, consistent with how new-scope areas are typically introduced in this project.
