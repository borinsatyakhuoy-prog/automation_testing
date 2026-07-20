# Family Partners (FAPA) Application Test Plan

## Application Overview

Confirmed application structure (via login with the credentials in user-stories/SCRUM.md): a top navigation bar with Dashboard, Admins, Clients, Markets, Upload, Reports, a user-initials menu, and an FR/EN language toggle. Dashboard shows portfolio allocation donut/pie charts plus a "Recently Consulted Reports" list. Admins has four sub-tabs: Team Management (paginated user table), Unsupervised Asset Classes (removable chip list), Firewall Configuration (IP allow-list table, currently empty), and Logs (login/logout audit trail with date filters - confirmed it records real login attempts, including the negative-login test performed during this exploration). Clients is a searchable/filterable/paginated table of client records with an "Add client" dialog and a per-row kebab menu offering View detail / Edit / Reset password / Consult. Markets (reached only via the nav button - its real route is /isin, not /markets; navigating directly to /markets was found to redirect to a blank home page, a discrepancy captured as its own test) has ISIN and Currency tabs, each with Import/Export, a search box, and a calendar-vs-list view toggle. Upload (real route /datas) has a paginated upload-history table and a multi-step "Import File" wizard. Reports has an autocomplete client search plus a month selector; selecting a client/month and clicking Consult was confirmed to either show an async "report is being generated" progress state, or, for at least one client/month combination tested, an "Invalid month to generate report." error - both behaviors are captured as tests. The user menu offers "Setting & Privacy" (a change-password page with a live password-rules checklist) and "Sign Out".

IMPORTANT DATA-SAFETY NOTE: This environment displays real, production-like client and user data (not synthetic test fixtures) - the Clients table alone contains 116+ real-looking records. All tests in this plan are written to be read-only wherever possible: list/search/sort/filter/pagination checks, and detail views, are safe to execute freely. Wherever a test opens the "Add client", "Add user", "Add Currency", or "Import File" flows, the steps explicitly stop at validating the disabled/enabled state of the submit control and then Cancel/close the dialog - these forms must NOT be submitted for real, to avoid creating or mutating production-like records. The one exception already partially exercised during grounding is the Reports "Consult" action, which is a read-only report-generation trigger, not a data mutation.

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

### 13. User Menu, Settings, and Language

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
