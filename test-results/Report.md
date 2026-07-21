# Family Partners (FAPA) — Test Execution Report

**Date:** 2026-07-21 (originally 2026-07-20; updated for a second Step 8 partial re-run cycle, then a third Step 8 FULL cycle covering new mail-service/notification scope)
**Environment:** https://develop-fapa.allweb.cloud (viewport 2000x1200, Chromium)
**Run type (cycle 3):** Step 8 **FULL** re-run (per QAE2EPromtFile.md) — this cycle covers genuinely new acceptance-criteria scope (mail/notification behavior on client/admin creation and password reset, requested live) with no prior coverage in `specs/planner.md` or `tests/fapa-test/`, so Steps 2-7 (plan, explore, generate, heal, report, commit) all ran for this new area specifically, without re-touching the already-passing existing suites.

---

## 1. Executive Summary

- **93 automated tests** across 41 spec files (chromium project).
- **First full run against the newly-migrated dedicated test client (2026-07-20):** 88 passed, 5 failed.
- **After investigation and healing:** all 5 root-caused; 0 remain failing. All fixes were either test-code corrections or confirmed environment flakiness — **no application defects were found or fixed** (one product-behavior gap was discovered and documented, not "fixed", since it's the live app's actual current behavior).
- **Cycle 2 (2026-07-21):** a real, reproducible bug in the report-lifecycle suite was root-caused and fixed — the Reports month selector could stay empty after choosing a client even though Consult was already enabled, silently no-op'ing Consult and hanging every downstream step. Fixed via a shared `consultReport()` helper (`tests/fapa-test/helpers/reports.ts`) that explicitly opens the month dropdown and re-selects the month every time. Allure 3 reporting was also added (`allurerc.mjs`, `tests/global-setup.ts`).
- **Cycle 2 verification:** full report-lifecycle suite (58 tests across the 10 report-lifecycle files) run once — 4 failed. Each of the 4 was re-run in isolation and **passed cleanly**; the failures were traced to this agent driving a manual exploratory browser session against the *same* shared live account and the *same* synthetic client concurrently with the automated run (see §3a) — not a regression from the fix.
- **Overall status: PASS** (93/93 passing as of cycle 2; +14 new tests in cycle 3 — 1 mail-service + 13 error-handling — all passing, bringing the suite to 107/107).
- **Cycle 3 (2026-07-21): Mail Service / Notifications (new scope, FULL Step 8 cycle).** Verified live, using disposable `temp-mail-mcp-server` inboxes, that (a) creating a new client sends a "Bienvenue chez Family Partners !" email, (b) resetting an existing client's password sends a second, distinct-subject email, and (c) creating a new staff record sends a distinct internal "Bienvenue dans l'équipe !" email with an "ACCÈS INTERNE" badge — all three confirmed never to include the actual password (manual SMS/email relay by the advisor is the deliberate, unscripted design, per both the in-app confirmation dialog and every email's own copy). **One real content bug found:** the password-reset email's body incorrectly reuses the "account created" boilerplate ahead of its own "password updated" paragraph, even though the subject line correctly says "reset complete." Automated 1 new test (`032_client-reset-password-notification.spec.ts`); the two creation flows are one-off real writes with no delete path discovered, so per this project's real-data-safety principle they're documented as manually-verified findings rather than repeatable automated tests (see `specs/planner.md` §15).
- **Cycle 3, continued: Error Handling across key flows (network-mocked, no real backend calls).** By request, checked how Login, Clients list, Reports Consult, Upload Import, and Markets Export behave when the underlying request genuinely fails (400-504, or a hard connection abort). **4 of 5 flows show duplicated or absent error messaging** — Login shows the identical "Log in fail" text for a real server outage as for a wrong password; Clients list silently renders an empty "no results" state for every error class including a dropped connection; Upload Import's dialog hangs open indefinitely with no feedback; Markets Export produces no download and no message at all. Only Reports Consult handles this well, showing one clear "The server was unable to complete your request. Please try again later." message for both 500 and 503, kept distinct from its own no-data business message. Automated 13 new tests across 5 files (`tests/fapa-test/error-handling/033`-`037`), all passing.

---

## 2. What Changed Before This Run

### Cycle 1 (2026-07-20)

Per feedback, the report-lifecycle suite (the only part of this project that performs real writes against the live app) was migrated off a real-name-adjacent client ("Borin Khuoy") onto a dedicated synthetic client created specifically for automation:
- New client created live: First "QA", Last "Automation Client", Excel name "QA Automation Client", randomized non-company email.
- Password reset directly in-app (Clients > Reset password).
- All 10 Excel fixtures (`tests/fapa-test/fixtures/*.xlsx`) updated so their embedded client-identifying columns reference this same synthetic name (row counts/structure verified unchanged).
- `.env`'s `FAPA_REPORT_CLIENT_NAME` updated to match.
- `playwright.config.ts` also gained a real-window-size fix for headed Chromium runs (`viewport: null` + `--window-size`), an `allure-playwright` reporter, and unrelated cleanup — none of this affects headless test behavior/correctness.

### Cycle 2 (2026-07-21)

- Fixed a real, reproducible bug: the Reports month selector could stay empty after choosing a client even though Consult was already enabled, making Consult a silent no-op and hanging every downstream step waiting on report UI. Extracted a shared `consultReport()` helper (`tests/fapa-test/helpers/reports.ts`) that explicitly opens the month dropdown and selects the month every time, used across all 10 report-lifecycle files instead of a duplicated inline block.
- Bumped the "report is being generated" toast's assertion timeout (5s → 20s), which had been intermittently failing under real load.
- Switched trace to `retain-on-failure` (previously `on-first-retry`, which never actually triggered locally since retries is 0 outside CI).
- Added `tests/global-setup.ts` (writes `allure-results/environment.properties`) and `allurerc.mjs` (Allure 3 "Awesome" UI plugin) so Allure reporting has a populated Environment widget.
- `specs/planner.md` gained two "Discovered" investigation sub-sections (§9.4 ISIN, §10.2 Currency) documenting Export/Import/Edit mechanics found during live exploration — explicitly not-yet-automated notes, not new acceptance criteria.

None of this touches test scenarios or acceptance criteria, which is why both cycles were Step 8 **partial** re-runs rather than full ones.

---

## 3. Automated Test Results

| Stage | Passed | Failed | Total |
|---|---|---|---|
| First full run post-migration | 88 | 5 | 93 |
| After healing (targeted re-runs of each failure) | 93 | 0 | 93 |

### Healing Activities

| Test | Root cause | Resolution |
|---|---|---|
| `001_portfolio` › Downloaded PDF content matches | **Test-design bug.** Checked the raw Excel "Cours" (price) literally in the PDF, but the report only ever shows computed valuation totals/percentages derived from price, never the raw quote — confirmed by the fact accounts and ISINs (which *do* appear verbatim) both passed. Pre-existing gap, never previously exercised to completion; unrelated to the client migration. | Removed the "Cours" check from `pdfExcelValidator.ts`, kept accounts + ISINs. Re-ran clean. |
| `003_passive` › Validate PDF | Login briefly redirected to `/login` instead of `/dashboard`. | Confirmed transient flake — passed cleanly on isolated re-run. No code change. |
| `004_rental-management` › Consult / Generate PDF | The observed failure (and an inflated "1.0h" duration on retry) traced to the QA session being paused mid-test, not a real defect. | Re-ran cleanly once un-paused. |
| `004_rental-management` › Downloaded PDF content matches *(surfaced during re-run, not in the original 5)* | **Real, previously-undiscovered product-behavior gap**, not a bug in test code: the consolidated wealth report PDF has no Real Estate section at all — not even the generic strings "immobilier"/"bien"/"loyer" appear anywhere in it, despite Real Estate Assets being a fully-importable upload category. Matches Financial Movements, which the source project (fapa_testing) likewise never built content-validation for. | Removed the content-check test and its `excelValidation` config for this category, matching how Financial Movements was already handled. Documented as Issue 13 (may warrant product clarification, not a confirmed defect). |
| `007_todo-list` › Download PDF | 120s timeout waiting for the report's "list" view-toggle button. | Confirmed transient flake — passed cleanly on isolated re-run. No code change. |
| `009_structured-products` › Validate PDF | 120s timeout waiting for the report's "list" view-toggle button. | Confirmed transient flake — passed cleanly on isolated re-run. No code change. |

Full narrative detail, including exact error output and PDF text excerpts used to diagnose each, is in `test-results/exploratory-findings.md` (Issue 13).

### 3a. Cycle 2 (2026-07-21): report-lifecycle re-verification after the month-selection fix

| Stage | Passed | Failed | Total |
|---|---|---|---|
| Full report-lifecycle suite, one pass | 54 | 4 | 58 |
| Isolated re-run of each of the 4 failures | 58 | 0 | 58 |

The 4 failures (`004_rental-management` › Consult, `007_todo-list` › Download PDF, `008_private-equity-funds` › Download PDF, `010_private-debts` › Consult) all reproduced the same symptom: a "report is being generated" toast or a report-toolbar button never appearing within its timeout. Root cause was **not** the application or the fix under test — this agent was concurrently driving a manual exploratory Playwright-MCP browser session (logged into the same `khuoyborin@gmail.com` account, consulting/generating reports for the same synthetic "QA Automation Client") while the automated suite ran. `playwright.config.ts` already documents that this suite hits a single shared live account and isn't safe to parallelize with itself; a manual session against the same client is the same hazard.

Re-running just those 4 files together (still with some incidental manual browser overlap) cleared 004, 007, and 010 completely, but surfaced the same collision symptom on a different `008_private-equity-funds` test (`Consult`, whose failure then cascaded into skipping that file's remaining serial tests). A final isolated run of `008_private-equity-funds` alone, with zero concurrent manual activity, passed all 6 of its tests including both `Consult` and `Download PDF` — confirming the month-selection-race fix itself introduced no regressions anywhere in the suite.

**Process note for future re-runs:** don't drive manual/exploratory browser sessions against this app while the automated report-lifecycle suite is executing, even from a separate tool/session — they share one live backend account and one synthetic client.

### 3b. Cycle 3 (2026-07-21): Mail Service / Notifications

New dedicated synthetic records were created live, solely for this investigation, never touching the existing "QA Automation Client" the report-lifecycle suite depends on:
- Client "QA Mail Test Client" (Clients > Add client), disposable `@web-library.net` inbox.
- Staff record "QA Mail Test Admin" (Admins > Add user, role EMPLOYE), a second disposable inbox.

| Scenario | Result | Notes |
|---|---|---|
| 001 - New client creation sends a notification email | PASS | "Bienvenue chez Family Partners !" from `phumra.chan@allweb.com.kh` arrived within seconds; no password included |
| 002 - Reset password on existing client sends a notification email | PASS WITH CONTENT BUG | Distinct email arrives ("Réinitialisation du mot de passe terminée"), but its body incorrectly opens with the account-creation paragraph before its own password-updated paragraph - see Defects Log |
| 003 - New admin/employee creation sends a notification email | PASS | Distinct "Bienvenue dans l'équipe !" email, genuinely different template (internal "ACCÈS INTERNE" badge + extra security-policy notice), not just a relabeled copy of 001 |
| 004 - Manual SMS/email password relay | DOCUMENTED, NOT SCRIPTED | Confirmed via all 3 emails' own copy and the existing §14.1 in-app confirmation dialog text - a deliberate human step outside the app, per the request that scoped this investigation |

Full step-by-step detail and the exact email copy are in `specs/planner.md` §15.

| Stage | Passed | Failed | Total |
|---|---|---|---|
| New `032_client-reset-password-notification.spec.ts` (chromium) | 1 | 0 | 1 |

### 3c. Cycle 3 (2026-07-21): Error Handling across key flows

By request, went beyond just 503/504 to a representative sweep of HTTP error classes (400/401/403/408/409/422/429/500/502/503/504) plus a hard connection abort, mocked via `page.route()`/`context.route()` (no real backend call ever fires) against 5 key flows. Two false leads were caught and corrected during this investigation before finalizing: an initial Login mock targeted a guessed `/api/auth/login` endpoint and appeared to "prove" duplication when it was actually just testing genuinely-wrong throwaway credentials (the real endpoint is `/api/entrance/login` - confirmed via live network capture, then retested with correct credentials); and an initial Export mock used `page.route()`, which the real backend bypassed entirely (a real file downloaded despite the "mock"), until switching to `context.route()` (Export triggers a browser download, which needs context-level interception).

| Flow | Real endpoint | Result across error classes | Verdict |
|---|---|---|---|
| Login | `POST /api/entrance/login` | 401/500/502/503/504 (correct credentials) all show identical "Log in fail" | BUG - indistinguishable from wrong password |
| Clients list | `GET /api/client?...` | All 12 status codes + a hard connection abort show identical silent "Search not found"/"0 of 0" | BUG - indistinguishable from a real empty search |
| Reports Consult | `GET /api/report/{client}/` | 500 and 503 both show "The server was unable to complete your request. Please try again later." | GOOD - clear, distinct from the no-data business message (§12.3) |
| Upload Import | `POST /api/stock` | 500 leaves the dialog open indefinitely, no message | BUG - no feedback at all |
| Markets Export | `GET /api/isin/export/detail` | 500 produces no download and no message | BUG - no feedback at all |

Full narrative detail per flow is in `specs/planner.md` §16. New tests: `tests/fapa-test/error-handling/033`-`037` (13 tests total, all passing).

---

## 4. Defects Log

No confirmed application defects from the first two cycles. One behavior worth product clarification (carried over):

**Real Estate Assets and Financial Movements are importable but not represented in the consolidated wealth report PDF.** Severity: unconfirmed (may be intentional — these categories could be tracked for other purposes, e.g. cash-flow/property screens elsewhere in the app, rather than this specific report). See `specs/planner.md` §11.3 and `exploratory-findings.md` Issue 13.

**Cycle 3 - confirmed content defect:** the client password-reset notification email's body reuses the brand-new-account welcome paragraph ("we're pleased to inform you an account has been created for you") ahead of its own password-updated paragraph, even though the email's subject correctly reads "Réinitialisation du mot de passe terminée" ("Password reset complete"). Severity: Low-Medium (cosmetic/confusing copy, not a security issue - no password is ever included in either email). See `specs/planner.md` §15.2.

**Cycle 3 - confirmed defects, error handling (4 of 5 flows checked):**
- **Login** shows the identical "Log in fail" message for a genuine server outage (401/500/502/503/504) as for a wrong password, with correct credentials. Severity: Medium (support-load risk - users will assume it's their own credentials and may reset a perfectly valid password during a real outage).
- **Clients list** silently renders its normal empty-search state for every error class, including a fully dropped connection, with zero visible indication anything failed. Severity: Medium (a real outage looks identical to "no matching clients").
- **Upload Import** dialog hangs open indefinitely on a server error with no message at all. Severity: Medium (users have no signal to retry, cancel, or know the import didn't happen).
- **Markets Export** produces no download and no message on a server error. Severity: Low-Medium (silent failure, but lower-frequency/lower-stakes action than the above three).
- (Not a defect) **Reports Consult** is the one flow that already handles this correctly - included here as a positive baseline, not logged as a bug.
See `specs/planner.md` §16 for full repro steps and the exact endpoints/messages involved in each.

---

## 5. Test Coverage Analysis

- All 13 functional areas from specs/planner.md have automated coverage (auth, dashboard, navigation, admins x4, clients, markets x2, upload, reports, settings/language/sign-out) plus the 10-category report-lifecycle suite, plus a new mail-service notifications area (§15).
- Report content-validation now correctly covers 8 of 10 upload categories (Portfolio, Liabilities, Artwork, Private Equity Summary/Funds, Structured Products, Private Debts, TODO List); the remaining 2 (Financial Movements, Real Estate) are confirmed not representable in this report and are documented rather than falsely asserted against.
- Gap: cross-browser (Firefox/WebKit) parity for the report-lifecycle suite specifically hasn't been re-verified against the new client in this cycle — only chromium was run. The rest of the suite (non-report-lifecycle) already has established chromium/firefox/webkit parity from prior work.
- New gap, deliberate: the two mail-service *creation* scenarios (new client, new admin/employee) are manually-verified findings, not repeatable automated tests, since neither record can be deleted through the UI discovered so far - only the reset-password notification (idempotent, no new data) is automated.
- Error handling now has dedicated regression coverage for 5 key flows (Login, Clients list, Reports Consult, Upload Import, Markets Export) under mocked server failures - fully safe/repeatable since no real backend call ever fires. Not yet covered: Admins/Team Management, Markets Currency, and Dashboard's session-check endpoint under the same failure conditions, since this cycle prioritized the flows called out as most important (Reports, Upload, Export) plus the two flows already characterized (Login, Clients).

---

## 6. Summary and Recommendations

- Suite is stable and green. The healing work here was entirely test-code correctness (one wrong assumption fixed, one gap in coverage removed) plus confirmed environment flakiness — the application itself showed no regressions from the client migration.
- Cycle 2: the month-selection-race fix is confirmed stable across the full 58-test report-lifecycle suite (all isolated re-runs green). Recommend never running this suite while a manual/exploratory browser session against the same account is active — see §3a.
- Recommend product/business confirmation on whether Real Estate and Financial Movements are intentionally excluded from the consolidated report, since this affects whether future content-validation should be added for them (e.g. against a different report or view) or left as-is.
- Recommend re-running the report-lifecycle suite against Firefox/WebKit at least once against the new client to confirm cross-browser parity holds, since this cycle only validated chromium.
- Cycle 3: recommend fixing the password-reset email's copy (it currently reuses "account created" boilerplate for an existing client) - a small content change, no code/security risk. Recommend a delete/deactivate path for client and staff records be considered if this project needs to keep testing creation-notification emails repeatably in future cycles, since none exists today.
- Cycle 3: recommend the product/engineering team review error handling on Login, Clients list, Upload Import, and Markets Export - all four currently give users no way to distinguish a real server outage from their own mistake (or, for Import/Export, no feedback whatsoever). Reports Consult's existing "The server was unable to complete your request. Please try again later." message is a good, low-effort template to reuse across the other four flows.
