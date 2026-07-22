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

### 17. Performance - Formal SLA Coverage Across Every Feature Area (2026-07-21 baseline, 2026-07-22 full-coverage + formal SLA)

By request, measured how fast each key flow actually is, using the browser's own Navigation Timing Level 2 / Paint Timing / Resource Timing APIs (real numbers from real page loads, not a synthetic external probe) plus wall-clock timing of user-facing actions (e.g. click-to-visible). `tests/fapa-test/helpers/performance.ts` provides the shared `getNavigationMetrics`, `getResourceDurations`, `rate`/`ratedLine` (readable heuristic signal) and, as of 2026-07-22, `SLA`/`assertSLA` (a real, hard-fail gate).

**Formal SLA (2026-07-22):** the original 5-flow suite rated results GOOD/SLOW/POOR against thresholds explicitly documented as "generous... not a formal SLA." That has been replaced with a real SLA defined in **`specs/performance-sla.md`** - seven tiers (T1 Page Load, T2 Navigation, T3 API Read, T4 Search/Filter, T5 Dialog Open, T6 Report Consult, T7 PDF Generation), each with a `target` (healthy) and a hard `max` (test fails via `expect()` if exceeded). Coverage was also extended that day from 5 flows to every top-level feature area, plus a dedicated SLA gate for the report-lifecycle suite (the main feature built in this project - 10-category content-validation, ported from fapa_testing).

**Seed:** none (read-only or dialog-open-then-cancel measurements; PDF generation and the report-lifecycle SLA gate reuse the existing dedicated "QA Automation Client" and its already-imported data - no new real writes)

| Flow | File | Tier | Measurement | Verdict |
|---|---|---|---|---|
| Login - page load | `performance/038_login-page-performance.spec.ts` | T1 | 3,810 ms | WARN (within max 8,000 ms) |
| Login - click-to-`/dashboard` round trip | same | T2 | 2,047 ms | WARN (within max 6,000 ms) |
| Login - `POST /api/entrance/login` | same | T3 | 1,232 ms | WARN (within max 3,000 ms) |
| Dashboard - full load | `performance/039_dashboard-performance.spec.ts` | T2 | 587 ms | PASS |
| Dashboard - `GET /api/me` / `GET /api/config` | same | T3 | 64 ms / 54 ms | PASS |
| Clients list - click-to-controls-visible | `performance/040_clients-list-performance.spec.ts` | T2 | 419 ms | PASS |
| Reports Consult - click-to-"generating" state | `performance/041_reports-consult-performance.spec.ts` | T6 | 1,844 ms | PASS |
| Reports Consult - `GET /api/report/{client}/` | same | T3 | 132 ms | PASS |
| **PDF Generation - click-to-completion** | `performance/042_pdf-generation-performance.spec.ts` | T7 | **42,448 ms** | PASS (within max 120,000 ms) |
| Top Navigation - all 6 sections (Dashboard/Admins/Clients/Markets/Upload/Reports) | `performance/043_navigation-performance.spec.ts` | T2 | 96–488 ms each | PASS (all 6) |
| Admins - Team Management table | `performance/044_admins-team-management-performance.spec.ts` | T2/T3 | 519 ms / 34 ms | PASS |
| Admins - Unsupervised Asset Classes | `performance/045_admins-asset-classes-performance.spec.ts` | T2 | 104 ms | PASS |
| Admins - Firewall Configuration | `performance/046_admins-firewall-performance.spec.ts` | T2 | 98 ms | PASS |
| Admins - Logs | `performance/047_admins-logs-performance.spec.ts` | T2 | 116 ms | PASS |
| Markets - ISIN tab + search | `performance/048_markets-isin-performance.spec.ts` | T2/T4 | 194 ms / 2,155 ms | PASS / WARN (search within max 5,000 ms) |
| Markets - Currency tab + Add Currency dialog | `performance/049_markets-currency-performance.spec.ts` | T2/T5 | 129 ms / 160 ms | PASS |
| Upload - history table | `performance/050_upload-history-performance.spec.ts` | T2 | 505 ms | PASS |
| Upload - Import File dialog open | `performance/051_upload-import-wizard-performance.spec.ts` | T5 | 291 ms | PASS |
| Reports - client autocomplete | `performance/052_reports-client-search-performance.spec.ts` | T4 | 108 ms | PASS |
| Settings - Change Password page | `performance/053_settings-change-password-performance.spec.ts` | T2 | 291 ms | PASS |
| Client detail view - open / back | `performance/054_client-detail-view-performance.spec.ts` | T2 | 273 ms / 95 ms | PASS |
| **Report Lifecycle (main feature) - Consult** | `performance/055_report-lifecycle-sla-performance.spec.ts` | T6 | 1,806 ms | PASS |
| **Report Lifecycle (main feature) - Generate PDF** | same | T7 | 33,645 ms | PASS |

**All 18 performance tests passed against the formal SLA** (18/18, chromium, 2.3 min total) - zero FAILs. Three measurements landed in **WARN** (within SLA but degraded vs. target): Login's page load/round-trip/API (3,810 ms / 2,047 ms / 1,232 ms vs. targets of 2,000 ms / 2,000 ms / 800 ms) and the ISIN search (2,155 ms vs. 1,500 ms target). None breached their `max`, so none is a regression by this SLA's own definition, but Login is worth watching - it was comfortably GOOD in the 2026-07-21 baseline (894 ms/646 ms/255 ms) and roughly 3-4x slower in this run, consistent with this environment's already-documented session/load variability (see the tail-latency note below) rather than a code change, since nothing in the login flow changed between the two measurements.

**Headline finding, unchanged: PDF Generation remains the one clear bottleneck in the app** - 33.6-42.4 seconds across the two PDF-generation tests, comfortably inside its formal SLA max of 120s (and its target of 60s), but still 70-100x slower than nearly every other flow measured, all of which complete in well under 2.5 seconds. This matches (and continues to quantify) AC5 and the report-lifecycle suite's own generous per-test timeouts (up to 180s). Not yet determined whether this is inherent to server-side PDF rendering/composition or has optimization room - would need a backend-side trace, out of scope for browser-side Playwright measurement.

**Known measurement gap:** `GET /api/client`, `GET /api/user`, `GET /api/log`, `GET /api/isin`, and `GET /api/stock` resource-timing lookups returned no captured entry in the 2026-07-22 run (logged as "n/a"), including for `/api/client` which *had* a captured entry (67 ms) in the 2026-07-21 baseline run - most likely a Resource Timing buffer/entry-lifecycle quirk on this particular run rather than the requests not firing (the surrounding click-to-visible timing, which does not depend on Resource Timing, passed normally in every case). The T2/T5/T6 wall-clock measurements are unaffected. Confirming the exact real endpoint substrings for Team Management, Logs, ISIN, and Upload history (the way Login/Dashboard/Clients/Reports already were) is a good follow-up before relying on their T3 numbers.

**Follow-up finding (2026-07-21): Reports Consult has real tail-latency variance a single clean measurement doesn't show.** Across that day's several full-suite executions (each running ~110+ other tests back-to-back against the same shared live account beforehand), `041_reports-consult-performance.spec.ts`'s own `"report is being generated"` assertion (20s timeout) - and the equivalent assertion in multiple report-lifecycle "Consult" tests - timed out outright at least twice, always passing cleanly again on an immediate isolated re-run. This is the same class of variance noted for PDF Generation, just far less frequent and severe. Treat every PASS/WARN verdict above as "typical under this run's conditions," not "guaranteed" - tail latency under sustained cumulative load is exactly what this environment is hardest to reason about (see §3e in test-results/Report.md, and Issue 19 in exploratory-findings.md). This is also why T6's `max` (10,000 ms) and T2's `max` values were set with deliberate multi-x margin above observed baselines rather than tightly - see specs/performance-sla.md for the full rationale per tier.
