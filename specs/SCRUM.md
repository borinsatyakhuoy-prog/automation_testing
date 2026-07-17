# SCRUM-101 Basic Operations Test Plan

## Application Overview

Family Partners is a login-gated wealth management / reporting web app (develop-fapa.allweb.cloud), explored at a 2000x1200 viewport to avoid clipped/truncated content. After authenticating, users land on a Dashboard with portfolio allocation charts (by asset class and by depository bank) and a 'Recently Consulted Reports' list. A top nav bar leads to: Admins (sub-tabs: Team Management, Unsupervised Asset Classes, Firewall Configuration, Logs — each a searchable/paginated user or config table), Clients (searchable, filterable — All/Person/Companies/New clients — paginated client table with Add client action), Markets (ISIN and Currency tabs with Import/Export actions and a paginated instrument table), Upload (a paginated history of uploaded data files by type — Client Data, Financial movements, Private Equity Funds, etc. — with Success/Error status and source/error file download links), and Reports (select a client and a YYYY/MM month to generate a report). The app supports an FR/EN language toggle and a user menu with 'Setting & Privacy' and 'Sign Out'. Note: the existing user story (SCRUM-101) is titled 'E-commerce Checkout Process' but the live application has no cart/checkout flow — this plan covers the application's actual basic operations instead.

## Test Scenarios

### 1. Authentication

**Seed:** `tests/seed.spec.ts`

#### 1.1. Successful login with valid credentials

**File:** `tests/auth/login.spec.ts`

**Steps:**
  1. Navigate to https://develop-fapa.allweb.cloud/login
    - expect: Login form is displayed with Email and Password fields and a Log in button
  2. Enter a valid email and password and click 'Log in'
    - expect: User is redirected to /dashboard
    - expect: Dashboard charts and 'Recently Consulted Reports' list are visible

#### 1.2. Login with invalid credentials shows an error

**File:** `tests/auth/login-invalid.spec.ts`

**Steps:**
  1. Navigate to the login page and submit an incorrect email/password combination
    - expect: User remains on the login page
    - expect: An error message is displayed
    - expect: No navigation to /dashboard occurs

#### 1.3. Sign out returns the user to the login page

**File:** `tests/auth/logout.spec.ts`

**Steps:**
  1. Log in, open the user menu (top-right initials button), click 'Sign Out'
    - expect: User is redirected back to the login page
    - expect: Attempting to access /dashboard directly redirects to /login

### 2. Navigation

**Seed:** `tests/seed.spec.ts`

#### 2.1. Main navigation links load each section without error

**File:** `tests/navigation/main-nav.spec.ts`

**Steps:**
  1. After logging in, click each of Dashboard, Admins, Clients, Markets, Upload, Reports in the top nav
    - expect: Each click navigates to its corresponding URL (/dashboard, /admin, /clients, /isin, /datas, /reports)
    - expect: The clicked nav item is visually marked active
    - expect: No console errors beyond the pre-existing baseline appear

#### 2.2. Language toggle switches the UI between FR and EN

**File:** `tests/navigation/language-toggle.spec.ts`

**Steps:**
  1. Click the 'FR' radio option, then the 'EN' radio option in the top-right language switcher
    - expect: Page text updates to the selected language
    - expect: The selected radio reflects the active language

### 3. Dashboard

**Seed:** `tests/seed.spec.ts`

#### 3.1. Dashboard displays allocation charts and recent reports at full resolution

**File:** `tests/dashboard/dashboard-view.spec.ts`

**Steps:**
  1. Log in and land on the Dashboard at a viewport of at least 2000x1200
    - expect: 'Allocation excluding liabilities' chart renders with fully readable category labels (not truncated with '...')
    - expect: 'Allocation by depository bank excluding liabilities' chart renders with fully readable bank names
    - expect: 'Recently Consulted Reports' list shows client name and consultation timestamp per entry
  2. Click an entry in 'Recently Consulted Reports'
    - expect: The corresponding report opens/loads

### 4. Admins

**Seed:** `tests/seed.spec.ts`

#### 4.1. Team Management tab lists users with search and pagination

**File:** `tests/admins/team-management.spec.ts`

**Steps:**
  1. Navigate to Admins (defaults to Team Management tab)
    - expect: A paginated table of users is displayed with First Name, Last Name, Role, Email, Phone, Status columns
    - expect: Pagination shows '1-10 of N' with working Next/Last page controls
    - expect: 'Add user' button is visible
  2. Type a known user's name into the 'Search user' box
    - expect: The table filters to matching rows only

#### 4.2. Admins sub-navigation switches between Team Management, Unsupervised Asset Classes, Firewall Configuration, and Logs

**File:** `tests/admins/admin-subnav.spec.ts`

**Steps:**
  1. Click each of the four Admins sub-nav items
    - expect: Each click loads its corresponding panel without error

### 5. Clients

**Seed:** `tests/seed.spec.ts`

#### 5.1. Clients list loads with search and pagination

**File:** `tests/clients/clients-list.spec.ts`

**Steps:**
  1. Navigate to the Clients section
    - expect: A paginated table of clients is displayed with First Name, Last Name, Company, Email, Phone, Status columns
    - expect: Pagination shows '1-10 of N' with working Next/Last page controls
  2. Type a known client name into the 'Search client' box
    - expect: The table filters to matching rows only

#### 5.2. Clients list filters by type (All / Person / Companies / New clients)

**File:** `tests/clients/clients-filter.spec.ts`

**Steps:**
  1. Select each option in the client-type filter list (All, Person, Companies, New clients)
    - expect: The table updates to show only rows matching the selected filter

### 6. Markets

**Seed:** `tests/seed.spec.ts`

#### 6.1. ISIN tab lists instruments with Import/Export actions

**File:** `tests/markets/isin-list.spec.ts`

**Steps:**
  1. Navigate to Markets (defaults to ISIN tab)
    - expect: A paginated instrument table is displayed
    - expect: 'Import' and 'Export' buttons are visible and enabled

#### 6.2. Currency tab loads as an alternate market view

**File:** `tests/markets/currency-tab.spec.ts`

**Steps:**
  1. Click the 'Currency' tab
    - expect: The panel switches to currency data without error

### 7. Upload

**Seed:** `tests/seed.spec.ts`

#### 7.1. Upload history table lists past file uploads with status

**File:** `tests/upload/upload-history.spec.ts`

**Steps:**
  1. Navigate to the Upload section
    - expect: A paginated table shows File Type, Uploaded File, Date & Time, Status, Author, Errors, Comments columns
    - expect: Rows with Status 'Success' display a downloadable source file link
    - expect: 'Import' button is visible to start a new upload
  2. Type a search term into the upload search box
    - expect: The table filters to matching rows only

### 8. Reports

**Seed:** `tests/seed.spec.ts`

#### 8.1. Generate a report by selecting a client and month

**File:** `tests/reports/generate-report.spec.ts`

**Steps:**
  1. Navigate to the Reports section, select a client via the client search box, choose a YYYY/MM value, then click 'Consult'
    - expect: The 'Consult' button becomes enabled once both client and month are selected
    - expect: Clicking 'Consult' displays the report for the selected client/month
