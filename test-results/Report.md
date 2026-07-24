# Family Partners (FAPA) — Test Execution Report

**Date:** 2026-07-21 (originally 2026-07-20; updated for a second Step 8 partial re-run cycle, then a third Step 8 FULL cycle covering new mail-service/notification scope); updated again 2026-07-22 for cycle 4; updated again 2026-07-24 for cycles 5 and 6
**Environment:** https://develop-fapa.allweb.cloud (viewport 2000x1200, Chromium)
**Run type (cycle 3):** Step 8 **FULL** re-run (per QAE2EPromtFile.md) — this cycle covers genuinely new acceptance-criteria scope (mail/notification behavior on client/admin creation and password reset, requested live) with no prior coverage in `specs/planner.md` or `tests/fapa-test/`, so Steps 2-7 (plan, explore, generate, heal, report, commit) all ran for this new area specifically, without re-touching the already-passing existing suites.
**Run type (cycle 4, 2026-07-22):** Step 8 **PARTIAL** re-run for the pre-existing suite (the only change to `user-stories/SCRUM.md` was a cosmetic note removal; `specs/planner.md`'s acceptance criteria were untouched, so none of the existing 112 tests needed rework) layered with a **new-scope FULL mini-cycle** for performance testing specifically — matching how cycle 3 handled mail-service/error-handling as their own new-scope cycles. Formalized the performance suite's thresholds into a real SLA (`specs/performance-sla.md`) and extended coverage from 5 flows to every feature area, including a dedicated SLA gate for the report-lifecycle suite (the main feature built in this project).
**Run type (cycle 5, 2026-07-23, catch-up):** this report itself had fallen behind - `specs/planner.md` and `tests/fapa-test/` gained 10 more commits (19 new performance/API-endpoint-coverage tests, `064`-`068`) after this report was last built (`2caa79b`, 2026-07-22), with `user-stories/SCRUM.md` unchanged throughout. Steps 2-5 for that work were already done and committed in those prior sessions; cycle 5 here is purely the Step 6/7 catch-up - compiling that already-passing work into this report with no re-planning, re-exploring, or re-scripting needed.
**Run type (cycle 6, 2026-07-24):** Step 8 new-scope **FULL** mini-cycle, by request ("explore more api endpoint and try to find is any endpoint can be exposed or unsafe") - a security/API-exposure angle with zero prior coverage anywhere in this project. Steps 2 (`specs/planner.md` §18), 3 (live RBAC/IDOR/token-integrity exploration via Playwright MCP against ADMIN/EMPLOYE/CLIENT roles), 4 (13 new automated tests, `tests/fapa-test/security/069`-`072`), 5 (executed, all passing, no healing needed), 6 (this report), 7 (commit) all ran for this area specifically.

---

## 1. Executive Summary

- **93 automated tests** across 41 spec files (chromium project).
- **First full run against the newly-migrated dedicated test client (2026-07-20):** 88 passed, 5 failed.
- **After investigation and healing:** all 5 root-caused; 0 remain failing. All fixes were either test-code corrections or confirmed environment flakiness — **no application defects were found or fixed** (one product-behavior gap was discovered and documented, not "fixed", since it's the live app's actual current behavior).
- **Cycle 2 (2026-07-21):** a real, reproducible bug in the report-lifecycle suite was root-caused and fixed — the Reports month selector could stay empty after choosing a client even though Consult was already enabled, silently no-op'ing Consult and hanging every downstream step. Fixed via a shared `consultReport()` helper (`tests/fapa-test/helpers/reports.ts`) that explicitly opens the month dropdown and re-selects the month every time. Allure 3 reporting was also added (`allurerc.mjs`, `tests/global-setup.ts`).
- **Cycle 2 verification:** full report-lifecycle suite (58 tests across the 10 report-lifecycle files) run once — 4 failed. Each of the 4 was re-run in isolation and **passed cleanly**; the failures were traced to this agent driving a manual exploratory browser session against the *same* shared live account and the *same* synthetic client concurrently with the automated run (see §3a) — not a regression from the fix.
- **Overall status: PASS** (93/93 passing as of cycle 2; +14 new tests in cycle 3 — 1 mail-service + 13 error-handling — all passing, bringing the suite to 107/107; +5 new performance tests added later in cycle 3, bringing the suite to 112/112; a healing pass later the same cycle brought the full suite to a clean 112/112 with zero failures on its final run; +13 new performance tests in cycle 4, bringing the suite to 125/125; +8 more performance tests same-day in cycle 4's follow-up, bringing the suite to 133/133, all passing; +19 more performance/API-endpoint-coverage tests across cycle 5's catch-up window (already executed and passing in prior sessions, see §3i); +13 new security tests in cycle 6, all passing on first run, no healing needed — bringing the suite to **166 automated tests across 83 spec files (chromium project)**, confirmed via `npx playwright test --list`).
- **Cycle 5 (2026-07-23, report catch-up only): closed a 14-endpoint performance-measurement gap, escalated the ISIN P99 finding, and added Client Portal + Employee role coverage.** No new application defects - purely SLA/coverage/test-infrastructure work already committed before this report cycle began. See §3i for the full breakdown.
- **Cycle 6 (2026-07-24): API-Exposure Security Review (new scope, FULL Step 8 mini-cycle).** Tested every discovered admin-only endpoint and several cross-tenant resource IDs against the EMPLOYE and CLIENT roles for broken access control and IDOR, tampered a live JWT's signature to confirm the backend actually verifies it, and checked CORS origin handling. **One HIGH severity finding: 7 of 9 per-domain report endpoints leak another client's real financial data** (portfolio totals, liabilities, real estate, rental income, art holdings, to-do notes, report months) to any authenticated CLIENT-portal user who knows another client's exact name string - confirmed with real, non-empty response bodies (real bank names/amounts), not just a bare 200. This is a genuine cross-tenant confidentiality breach and the single most severe finding in this project's history - see §3j. **Separately, one Low-Medium broken-access-control bug:** `GET /api/group-dataclass` is reachable by any authenticated role regardless of permission (EMPLOYE and CLIENT both, despite zero UI path to it), while three sibling admin-only endpoints correctly return 403 - low impact since only internal classification labels are exposed. The report-by-UUID/PDF endpoints, account-by-id endpoints, and one tested write endpoint (`PUT /api/report/validate/{id}`) are all correctly tenant/role-scoped - no blanket bypass. Two informational hardening recommendations also logged (login response body redundantly exposes both JWTs in plaintext alongside the proper HttpOnly cookies; auth cookies lack the `Secure` flag and no HSTS header is sent). New tests: `tests/fapa-test/security/069`-`072` (13 tests, all passing). See §3j for full detail.
- **Cycle 3, continued: Performance across key flows.** Measured real page-load/API timing (Navigation Timing, Paint Timing, Resource Timing) for Login, Dashboard, Clients list, Reports Consult, and PDF Generation, rating each GOOD/SLOW/POOR. **Result: everything is fast (under ~2s end-to-end, API calls typically under 100ms) except PDF Generation, which took 35.6s — roughly 20-65x slower than every other flow measured**, the one clear bottleneck in the app. New tests: `tests/fapa-test/performance/038`-`042` (5 tests, all passing).
- **Cycle 4 (2026-07-22): Formal Performance SLA across every feature area (new scope, FULL Step 8 mini-cycle).** Replaced the prior "generous, not a formal SLA" heuristic with a real 7-tier SLA (`specs/performance-sla.md`) enforced via a hard `assertSLA()` gate, and extended performance coverage from 5 flows to all ~18 top-level feature areas (Top Navigation, all 4 Admins sub-tabs, both Markets tabs, Upload history + Import wizard, Reports client search, Settings, Client detail view), plus a dedicated SLA gate for the report-lifecycle suite (the main feature built in this project — Consult + Generate PDF against the existing dedicated "QA Automation Client", no new real writes). **Result: all 18 performance tests pass the formal SLA (18/18, 2.3 min total) — zero SLA FAILs.** Three measurements landed in WARN (within SLA but above target): Login's page load/round-trip/API and the ISIN search — none breached its hard max. PDF Generation remains the one clear bottleneck (33.6–42.4s) but is comfortably within its 120s SLA max. New tests: `tests/fapa-test/performance/043`-`055` (13 tests, all passing).
- **Cycle 4, same-day follow-up: fixed a false-failure risk, expanded coverage further.** An isolated re-run of the Login performance test (prompted by a report that manual login felt fast despite a WARN reading) initially **failed outright** — not from a real login break, but because `expect(page).toHaveURL(/\/dashboard/)` used Playwright's default 5s timeout, shorter than this SLA's own T2 max (6s), cutting off a genuinely slow-but-successful login before the SLA gate could judge it. Fixed in both `helpers/auth.ts`'s shared `login()` (used by nearly every test in the suite) and `038`'s own inline flow by raising that assertion's timeout to 15s. A clean re-run then measured Login fully GOOD (858 ms/556 ms/260 ms), confirming the original WARN was genuine transient environment variance, not a regression. Also added 8 more performance tests (Markets Export, Clients search, Admins search, Sign Out, Language toggle, and 3 more dialog-open flows) plus a Download-timing addition (new SLA tier T8) to the report-lifecycle gate. **Result: all 26 performance tests pass (26/26, 2.3 min) — zero SLA FAILs**, 3 WARNs (ISIN search, Markets Export, ISIN Edit dialog), none breaching max. New tests: `tests/fapa-test/performance/056`-`063` (8 tests, all passing).
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

### Cycle 4 (2026-07-22)

- `user-stories/SCRUM.md` changed: removed a since-outdated note about the story's original (incorrect) e-commerce-checkout scope having been replaced. Purely cosmetic — no acceptance criteria, test data, or credentials changed. `specs/planner.md`'s scenario content was untouched aside from this cycle's own §17 rewrite. **Verdict: PARTIAL** for the pre-existing 112-test suite — nothing needed re-planning, re-exploring, or regenerating.
- By request, added new scope on top of that: a formal performance SLA (previously explicitly "not a formal SLA") and full feature-area performance coverage (previously 5 of ~18 areas). Treated as its own new-scope FULL mini-cycle, same pattern as cycle 3's mail-service/error-handling additions — Steps 2 (planner.md §17 rewrite + new `specs/performance-sla.md`), 4 (13 new spec files + `helpers/performance.ts` SLA additions), 5 (executed, all passing, no healing needed), 6 (this report), 7 (commit) all ran for this area specifically, without re-touching the already-passing existing suites.

### Cycle 5 (2026-07-23)

- `user-stories/SCRUM.md` unchanged throughout this window (last touched 2026-07-22, before this report). `specs/planner.md` and `tests/fapa-test/` gained 10 more commits in the meantime: an audit and fix of every remaining "n/a" resource-timing gap (two were the wrong endpoint substring entirely, not a timing race - `047`/`050`), a request-pacing bug fix in the ISIN P99 test that had inflated one reading to a misleading 21s, escalation of the ISIN P99 finding from "WARN, worth watching" to "confirmed, frequent, root-caused" after 6 independent re-runs, live-exploration of previously-uncatalogued report-generation endpoints (14 of them, closing a gap the user identified from their own compiled table), and new Client Portal (`067`) + Employee (`068`) role performance coverage.
- **Verdict: this was all already Step 8-compliant work executed and committed in real time during those prior sessions** - none of it required this report to change *what* was tested, only to catch this report up on results that already existed. No re-planning, re-exploring, or re-scripting was needed here; this cycle is Step 6 (report) + Step 7 (commit, already done for the code in the commits above - only this report's own update needed committing).

### Cycle 6 (2026-07-24)

- New scope, by request: "explore more api endpoint and try to find is any endpoint can be exposed or unsafe." No prior coverage of authorization/exposure testing existed anywhere in this project (confirmed via grep across `Report.md`, `exploratory-findings.md`, `planner.md` before starting - every prior endpoint mention was performance-timing-focused, not security-focused). Treated as its own new-scope FULL mini-cycle: Steps 2 (`specs/planner.md` §18), 3 (live exploration via Playwright MCP, logged in as ADMIN/EMPLOYE/CLIENT), 4 (`tests/fapa-test/security/069`-`072`), 5 (executed, all passing), 6 (this report), 7 (commit) all ran.

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

### 3e. Cycle 3 (2026-07-21): Step 8 healing pass on recurring flakes

By request, healed two recurring flake patterns observed repeatedly across this cycle's many full-suite runs (headless and headed), both pre-existing and unrelated to any new test added this cycle:

1. **Report-lifecycle "list"/"more_vert" button clicks occasionally hanging** (the same family as this file's own long-documented Issue 4/New Issue 7 - Material component click reliability), seen across at least 6 different report-lifecycle files across this cycle's runs. Extracted `openMonthReportsList()` / `openMonthReportActionsMenu()` into `tests/fapa-test/helpers/reports.ts`, each retrying the click up to 3 times with a bounded 15s-per-attempt timeout and an `Escape` + 1s pause between attempts, replacing the inline two-line click sequence duplicated across all 10 report-lifecycle files (30 call sites).
2. **`032_client-reset-password-notification`'s "Reset password" menuitem occasionally detaching mid-click** (a background list refresh re-rendering the row between opening the kebab menu and clicking the menuitem) - changed to retry the whole open-menu-then-click sequence (re-opening fresh each attempt) rather than retrying a click on an already-stale element reference.

**Honest result:** these fixes measurably help (the "list"/"more_vert" hang did not reproduce at all in the two runs immediately after the fix, whereas it had appeared in nearly every prior run), but a comparison run right after applying them still hit 5 unrelated-looking timeouts in one continuous headed run (all confirmed transient via isolated re-run) - consistent with genuine backend/environment slowness during long continuous sessions against this shared live account, not something a client-side retry can fully mask. The final full run of this cycle (112 tests, headed) passed clean with zero failures, but that single clean run shouldn't be read as proof the environment's underlying flakiness is gone - only that these two specific, previously-recurring patterns are meaningfully more resilient now.

### 3d. Cycle 3 (2026-07-21): Performance across key flows

Measured via the browser's own Navigation Timing Level 2 / Paint Timing / Resource Timing APIs plus wall-clock click-to-visible timing - real numbers from real page loads against the live account, not a synthetic external probe or a load-testing tool (deliberately out of scope here, since generating concurrent load against this shared, production-like "develop" environment would risk the same account-collision issues `playwright.config.ts` already documents).

| Flow | Measurement | Rating |
|---|---|---|
| Login (page load / round trip / API) | 894 ms / 646 ms / 255 ms | GOOD |
| Dashboard (full load / APIs) | 519 ms / 17 ms / 14 ms | GOOD |
| Clients list (click-to-visible / API) | 514 ms / 67 ms | GOOD |
| Reports Consult (click-to-progress / API) | 1,775 ms / 21 ms | GOOD |
| **PDF Generation (click-to-completion)** | **35,645 ms** | **SLOW** |

**Headline finding: PDF Generation is the one clear performance bottleneck**, 20-65x slower than every other flow measured, all of which complete in under 2 seconds. This quantifies what was already suspected from AC5 and the report-lifecycle suite's own generous timeouts (up to 180s per PDF test) - not a new discovery of a problem, but the first real measurement of its actual magnitude. Full detail in `specs/planner.md` §17. New tests: `tests/fapa-test/performance/038`-`042` (5 tests, all passing).

**Follow-up finding, same day: Reports Consult's GOOD rating is a "typical," not "guaranteed," number.** Across this cycle's several full-suite runs, `041`'s own "report is being generated" assertion (and the equivalent in multiple report-lifecycle files) timed out outright at least twice after the account had been under sustained continuous load - always clean on an immediate isolated re-run. See Issue 19 in `exploratory-findings.md` and the tail-latency note in `specs/planner.md` §17.

**Correction (2026-07-22, cycle 4): the 1,775 ms Consult figure and the 35,645 ms PDF Generation figure above were both measuring the wrong boundary.** Neither test ever waited for the report to actually finish rendering after the progress bar appeared - see the full correction note in `specs/planner.md` §17 and `specs/performance-sla.md`. Re-baselined: Consult click-to-actually-rendered is ~20-25s (new T6b tier), and PDF Generation click-to-completion, now correctly starting only once the report has already rendered, is ~7-8s. The real end-to-end "Consult then Generate PDF" wait a user experiences is ~30-31s.

### 3f. Cycle 4 (2026-07-22): Formal Performance SLA, full feature-area coverage

Replaced the prior heuristic-only rating with a real, hard-gated SLA (`specs/performance-sla.md`, 7 tiers: T1 Page Load, T2 Navigation, T3 API Read, T4 Search/Filter, T5 Dialog Open, T6 Report Consult, T7 PDF Generation), each with a `target` and a hard `max` enforced via `assertSLA()` in `tests/fapa-test/helpers/performance.ts`. Extended coverage from the prior 5 flows to every top-level feature area, plus a dedicated SLA gate for the report-lifecycle suite specifically (the main feature built in this project), reusing the existing dedicated "QA Automation Client" - no new real writes.

| Stage | Passed | Failed | Total |
|---|---|---|---|
| Full performance suite (chromium, single worker) | 18 | 0 | 18 |

All 18 tests passed the formal SLA on the first run - no healing needed. Three measurements landed in **WARN** (within SLA, above target, not a failure):

| Measurement | Target | Result | Max |
|---|---|---|---|
| Login page load | 2,000 ms | 3,810 ms | 8,000 ms |
| Login click-to-`/dashboard` round trip | 2,000 ms | 2,047 ms | 6,000 ms |
| Login `POST /api/entrance/login` | 800 ms | 1,232 ms | 3,000 ms |
| Markets ISIN search ("Find an ISIN") | 1,500 ms | 2,155 ms | 5,000 ms |

Login's three WARN figures are roughly 3-4x slower than the 2026-07-21 baseline (894 ms / 646 ms / 255 ms) despite no code change to the login flow between the two measurements - consistent with this environment's own already-documented session/load variability (Issue 19, the §3d/§3e tail-latency notes) rather than a regression. None breached its `max`, so none is an SLA failure. PDF Generation (both `042` and the new `055` report-lifecycle gate) measured 33,645–42,448 ms, comfortably within its 120,000 ms max and 60,000 ms target, confirming the 2026-07-21 baseline's ~35.6s figure was representative, not a one-off best case.

New tests: `tests/fapa-test/performance/043`-`055` (13 tests, all passing) covering Top Navigation (all 6 sections), Admins (Team Management, Unsupervised Asset Classes, Firewall Configuration, Logs), Markets (ISIN search, Currency + Add Currency dialog), Upload (history table, Import File dialog), Reports client autocomplete, Settings Change Password, Client detail view, and the report-lifecycle main-feature SLA gate (Consult + Generate PDF). Full per-flow table in `specs/planner.md` §17.

**Known measurement gap (not a defect):** the `GET` resource-timing lookups for Team Management, Logs, ISIN, and Upload history returned no captured entry ("n/a") in this run, as did `GET /api/client` (which *had* captured a value, 67 ms, in the 2026-07-21 baseline) - most likely a Resource Timing buffer/entry-lifecycle quirk specific to this run, not the requests failing to fire, since every surrounding click-to-visible (T2) measurement passed normally. Confirming the exact real endpoint substrings for these four flows (the way Login/Dashboard/Clients/Reports were already confirmed) is a good follow-up before relying on their T3 numbers specifically.

### 3g. Cycle 4, same-day follow-up (2026-07-22): false-failure fix + 8 more performance tests

By request, re-ran the Login performance test in isolation to sanity-check the WARN reading in §3f against a report that manual login felt fast. The isolated re-run **failed outright**:

| Test | Root cause | Resolution |
|---|---|---|
| `038_login-page-performance` (isolated re-run) | **Test-infrastructure bug, not an app defect.** `expect(page).toHaveURL(/\/dashboard/)` used Playwright's default 5s timeout - shorter than this SLA's own T2 Navigation max (6s). Screenshot at failure showed the login button still disabled, "Loading...", no error - a genuinely slow-but-successful login was cut off by an unrelated assertion timeout before `assertSLA()` could judge it. | Raised the timeout to 15s (above every relevant SLA max) in both `tests/fapa-test/helpers/auth.ts`'s shared `login()` (used by nearly every test in the suite) and `038`'s own inline login flow, so a slow-but-real login is now always measured and judged by the SLA instead of risking a false failure on a shorter, unrelated default timeout. |

A clean re-run immediately after the fix measured Login at 762 ms / 509 ms / 252 ms (all GOOD) - confirming the original 3,810 ms / 2,047 ms / 1,232 ms WARN reading in §3f was genuine transient tail latency on this shared "develop" environment (consistent with the project's own repeatedly-documented Issue 19 variance), not a regression introduced by this cycle's changes, and not something wrong with a manual login test either.

Also added 8 more performance tests to close remaining gaps, plus a Download-timing addition (new SLA tier T8 - Download Action) to the report-lifecycle main-feature gate:

| Stage | Passed | Failed | Total |
|---|---|---|---|
| Full performance suite re-run after the fix + 8 new tests (chromium, single worker) | 26 | 0 | 26 |

New tests: `tests/fapa-test/performance/056`-`063` (Markets Export real-download timing, Clients search filter, Admins Team Management search filter, Sign Out, Language toggle EN↔FR, Add Client dialog open, Add User dialog open, ISIN Edit dialog open) - all passing. 3 WARN-tier results (ISIN search 2,029 ms, Markets Export 5,026 ms, ISIN Edit dialog 1,533 ms), none breaching their SLA max. Full per-flow table in `specs/planner.md` §17.

### 3h. Cycle 4, verification pass (2026-07-22): re-checking the three WARN readings

By request, re-ran `048_markets-isin-performance`, `056_markets-export-performance`, and `063_isin-edit-dialog-performance` in isolation to determine whether each WARN was transient noise or a real, reproducible characteristic - the same isolate-and-recheck method this project has used throughout (§3a, §3e) to tell the two apart.

| Test | In full 26-test suite | Isolated (2 runs) | Verdict |
|---|---|---|---|
| ISIN search | 2,029 ms / 2,155 ms (WARN) | 30 ms / 31 ms (PASS) | **Noise, not signal.** The search itself is near-instant; the WARN was this environment's already-documented tail latency under sustained session load (Issue 19) surfacing on a search interaction for the first time, not a real slowdown. |
| Markets Export | 5,026 ms (WARN) | 3,034 ms (WARN) | **Real, reproducible.** Both land in the 3-5s band regardless of suite position - a genuine characteristic of a real ~2,438-row xlsx export + download, comfortably within its 10,000 ms max both times. |
| ISIN Edit dialog | 1,533 ms (WARN) | 1,502 ms (WARN) | **Real, reproducible.** Consistently ~1.5s vs. under 500 ms for the blank Add-dialogs elsewhere (Add User 192 ms, Add Currency 119-160 ms) - Edit has to fetch and pre-fill the row's existing values first, a structural reason for the gap, not a bug. |

**No SLA threshold changes made.** Markets Export and the ISIN Edit dialog stay WARN by design - loosening their targets to make the WARN disappear would reduce the signal's value for catching a genuine future regression on those two specific flows. Only the ISIN search reading is now understood to have been noise rather than a real characteristic.

### 3i. Cycle 5 (2026-07-23): performance/endpoint-coverage catch-up

Report-catch-up only - all of the following was executed and committed in prior sessions before this report cycle began; summarized here for the first time.

| Stage | Passed | Failed | Total |
|---|---|---|---|
| New tests added since the last report (`064`-`068`) | 19 | 0 | 19 |

- **API-endpoint coverage expansion:** live-exploring the app (rather than assuming from test code) surfaced 4 previously-unasserted read endpoints (`/api/group-dataclass`, `/api/ip-white-list`, `/api/currency-detail`, `/api/account/{id}`), each added as a T3 assertion to its existing test, plus two new files gating pagination (`064`, `GET /api/client?page=1` / `GET /api/user?page=1`) and filtered search (`065`, `GET /api/client?search=` / `GET /api/user?search=`) specifically, since every prior list test only ever exercised page 0/unfiltered.
- **Real P99 (percentile) SLA gating** replaced single-sample gating (`066`): repeats each flow N times per run (30 for cheap navigation/API reads, 15 for the large ISIN payload, 5 for Currency/Consult, 3 for PDF Generation) and gates the P99, not one sample. **Confirmed finding: `GET /api/isin` (2,438 rows / ~614 KB) breached its 3,000 ms hard max in 5 of 6 independent runs (83%)**, clustering 2.7-4.4s - upgraded from "WARN, worth watching" to "confirmed, frequent, root-caused." This is a real, structural characteristic (a large unpaginated payload), not flakiness - one run's initial reading of 21s was itself a measurement artifact from a request-pacing bug in the test (fixed; re-verified at the correct, non-inflated 3.9-4.4s range after the fix).
- **"n/a" resource-timing audit:** two files (`047` Admins Logs, `050` Upload History) were asserting against the wrong endpoint substring entirely (`/api/log`/`/api/stock` instead of the real `/api/entrance/list-logs`/`/api/audit`) - not a timing race, fixed by asserting the correct endpoint. `048` (Markets ISIN) remains intermittently "n/a" even after the same fix - a known, separate, already-documented capture gap specific to that endpoint's large payload.
- **Role-based coverage extended to Employee (`068`) and Client Portal (`067`):** EMPLOYE shows statistically indistinguishable timing from ADMIN on every shared screen (confirmed parity, not new discovery). CLIENT's one WARN (Reports Consult, ~2.2s click-to-visible) traces to genuinely fast underlying API calls (66-98ms) - the time is pure UI render weight from the full validated-report view, not a backend issue.
- **14 previously-uncatalogued endpoints closed the gap the user identified from their own compiled table** - extended `066`'s Consult P99 to cover all 11 per-domain report-section endpoints and PDF Generation's two remaining endpoints, plus 2 new standalone tests (currency-code autocomplete, Sign Out). `POST /api/stock` (data-import) deliberately left as `n/a` by user choice, consistent with this suite's real-data-safety principle (each sample would create a permanent import record on the live account).

No new application defects from this cycle - entirely SLA/coverage/test-infrastructure work. Full detail in `specs/planner.md` §17.

### 3j. Cycle 6 (2026-07-24): API-Exposure Security Review

New scope, by request: "explore more api endpoint and try to find is any endpoint can be exposed or unsafe." All checks are real, authenticated, read-only GETs (or, for the one write, a password reset on the already-dedicated "QA Mail Test Client" synthetic account §15 already established as safe) - no destructive action, no new data created.

| Stage | Passed | Failed | Total |
|---|---|---|---|
| Security suite (`069`-`072`, chromium, single worker) | 13 | 0 | 13 |

**Auth mechanism confirmed live:** session is an HttpOnly, PS256-signed JWT cookie pair (`token` 30 min / `refresh_token` 7 day) embedding `role`/`permission` directly in the claims - confirmed genuinely signature-verified (not decorative) by flipping one character in a live token's signature and getting an immediate 401, then restoring access by restoring the original token. CORS is correctly locked to the app's own origin (an arbitrary attacker `Origin` gets a flat 403, never reflected).

**Confirmed finding - HIGH severity: cross-tenant real financial data leak on 7 of 9 per-domain report endpoints.** Unlike the report-by-UUID/PDF endpoints (correctly tenant-scoped - CLIENT gets 403 on another client's report id), the endpoints that assemble each *section* of a report take a plain `client` name-string parameter instead of deriving the client from the session, with no check that the name matches the caller's own tenant:

| Endpoint | CLIENT role, requesting a *different* client's name |
|---|---|
| `GET /api/report/client/{name}/months` | **200** - real months list |
| `GET /api/consolidation-global?client=` | **200** - real portfolio total (e.g. `totalValToday: -34829.70`) |
| `GET /api/passif?client=` | **200** - real liability rows (bank name "BNP Banque Privée", real amounts/dates) |
| `GET /api/real-estate?client=` | **200** |
| `GET /api/gestion-locative?client=` | **200** |
| `GET /api/arts/clients/{name}` | **200** |
| `GET /api/report-todos/clients/{name}` | **200** |
| `GET /api/direct-private-equity/clients/related?client=` | 403 (correct) |
| `GET /api/unsupervised/stock/clientName/{name}` | 403 (correct) |

Confirmed with real, non-empty response bodies - not a bare 200 with an empty/filtered result. **Any authenticated client-portal user who knows or can guess another client's exact name can pull that client's portfolio, liabilities, real estate, rental income, art holdings, and to-do notes.** The 2 correctly-blocked endpoints confirm this is a specific gap in 7 endpoints' own authorization checks, not a blanket "no auth at all" issue. **This is the single most severe finding in this project's test history** - see the Defects Log for the urgent-priority recommendation.

**Confirmed finding: broken access control on `GET /api/group-dataclass`.**

| Endpoint | EMPLOYE (no Admins nav item) | CLIENT (Dashboard + Reports only) |
|---|---|---|
| `GET /api/user` | 403 (correct) | 403 (correct) |
| `GET /api/ip-white-list` | 403 (correct) | 403 (correct) |
| `GET /api/entrance/list-logs` | 403 (correct) | 403 (correct) |
| **`GET /api/group-dataclass`** | **200 (gap)** | **200 (gap)** |

Three of four sibling admin-only endpoints correctly enforce role-based authorization for both non-admin roles; this one doesn't, for either role, despite neither having any UI path to it. **Severity: Low-Medium** - the endpoint's payload is only internal asset-classification labels (e.g. `{"dataClass":"Participations"}`), no client PII/financial data, but the inconsistent enforcement pattern across sibling endpoints suggests this specific endpoint's authorization check was simply missed, which is worth an engineering audit for similar misses elsewhere. Logged in the Defects Log below; automated as `069` documenting current (not yet fixed) behavior, by explicit request, so the suite stays green while the gap remains visible in this report.

**No IDOR found.** CLIENT (account id 421) was tested against three other real clients' account IDs plus its own - all four returned 403; `/api/account/{id}` turns out to be an advisor/admin-facing endpoint the client-portal frontend never calls at all (not merely a correctly-scoped one). CLIENT also cannot list `/api/report` across clients (403, correctly scoped to its own portal).

**Two informational hardening recommendations** (see Summary and Recommendations): the login response body redundantly returns both raw JWTs in plaintext JSON alongside the proper HttpOnly cookies, partially undermining the point of `HttpOnly`; and the `token`/`refresh_token` cookies lack the `Secure` flag with no `Strict-Transport-Security` header sent anywhere.

Full detail, including the exact endpoint catalog and severity reasoning, in `specs/planner.md` §18.

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

**Cycle 6 - HIGH SEVERITY, confirmed security defect: cross-tenant real financial data leak.** `GET /api/consolidation-global`, `/api/passif`, `/api/real-estate`, `/api/gestion-locative`, `/api/arts/clients/{name}`, `/api/report-todos/clients/{name}`, and `/api/report/client/{name}/months` (7 of 9 per-domain report endpoints tested) accept a plain `client` name-string parameter and return that client's real data regardless of which client the authenticated session actually belongs to - confirmed live with real, non-empty response bodies (real bank names, amounts, dates), not just a bare 200. **Any authenticated client-portal user who knows or guesses another client's exact name can view that client's portfolio, liabilities, real estate, rental income, art holdings, and to-do notes.** This is a genuine cross-tenant confidentiality breach in an app holding real, production-like client financial data - **recommend engineering treat this as urgent/priority-one**, in contrast to every other finding in this report. The report-by-UUID/PDF endpoints, account-by-id endpoints, and the one write endpoint tested are all correctly scoped, so the fix is specifically adding tenant-ownership checks to these 7 endpoints (deriving/validating the client from the authenticated session rather than trusting the request's `client` parameter), not a broader auth-system rework. See `specs/planner.md` §18 and `tests/fapa-test/security/072_cross-tenant-report-domain-data-idor.spec.ts`.

**Cycle 6 - confirmed security defect (Low-Medium, separate from the above): broken access control on `GET /api/group-dataclass`.** Reachable by any authenticated session (confirmed with both EMPLOYE and CLIENT roles) despite neither role having any UI path to the "Unsupervised Asset Classes" feature it backs, while three sibling admin-only endpoints (`/api/user`, `/api/ip-white-list`, `/api/entrance/list-logs`) correctly return 403 for the same accounts. **Severity: Low-Medium** - the exposed payload is only internal asset-classification labels, no client PII or financial data, so the immediate data-exposure impact is minor; the concern is the *pattern* (an authorization check present on sibling endpoints but missing here), which is worth an engineering audit for similar misses elsewhere in the API surface. See `specs/planner.md` §18 and `tests/fapa-test/security/069_rbac-cross-role-authorization.spec.ts`.

**Cycle 6 - informational hardening gaps (not exploited, no fix urgency, logged for completeness):**
- The login endpoint's response body returns both the access and refresh JWTs in plaintext JSON, even though the actual session transport is a separate HttpOnly cookie pair that already works without them. This redundant exposure partially defeats the purpose of `HttpOnly` (which exists specifically to keep a token unreadable to page JS) since the same secret is handed to JS anyway via the response body. Recommend removing `token`/`refreshToken` from the login response body once confirmed the frontend only relies on the cookies (already appears to be the case - every security test in this suite authenticates via cookies alone).
- Both auth cookies (`token`, `refresh_token`) are `httpOnly: true` but `secure: false`, and no `Strict-Transport-Security` response header was observed on any request. Low likelihood of exploitation today (the app is HTTPS-only with no evidence of an HTTP listener), but it's a standard, low-cost hardening gap. Recommend adding `Secure` to both cookies and an HSTS header.

---

## 5. Test Coverage Analysis

- All 13 functional areas from specs/planner.md have automated coverage (auth, dashboard, navigation, admins x4, clients, markets x2, upload, reports, settings/language/sign-out) plus the 10-category report-lifecycle suite, plus a new mail-service notifications area (§15).
- Report content-validation now correctly covers 8 of 10 upload categories (Portfolio, Liabilities, Artwork, Private Equity Summary/Funds, Structured Products, Private Debts, TODO List); the remaining 2 (Financial Movements, Real Estate) are confirmed not representable in this report and are documented rather than falsely asserted against.
- Gap: cross-browser (Firefox/WebKit) parity for the report-lifecycle suite specifically hasn't been re-verified against the new client in this cycle — only chromium was run. The rest of the suite (non-report-lifecycle) already has established chromium/firefox/webkit parity from prior work.
- New gap, deliberate: the two mail-service *creation* scenarios (new client, new admin/employee) are manually-verified findings, not repeatable automated tests, since neither record can be deleted through the UI discovered so far - only the reset-password notification (idempotent, no new data) is automated.
- Error handling now has dedicated regression coverage for 5 key flows (Login, Clients list, Reports Consult, Upload Import, Markets Export) under mocked server failures - fully safe/repeatable since no real backend call ever fires. Not yet covered: Admins/Team Management, Markets Currency, and Dashboard's session-check endpoint under the same failure conditions, since this cycle prioritized the flows called out as most important (Reports, Upload, Export) plus the two flows already characterized (Login, Clients).
- **Performance now has formal-SLA-gated coverage for every top-level feature area**, including the previously-flagged gaps (Login, Dashboard, Top Navigation, all 4 Admins sub-tabs + Team Management search, Clients list + search + detail view, both Markets tabs + ISIN search + real Export download, Upload history + Import wizard, Reports Consult + client search, Settings, Sign Out, Language toggle, and dedicated Add Client/Add User/ISIN Edit dialog-open coverage, plus a dedicated gate for the report-lifecycle main feature including its Download step) - up from the original 5-flow baseline, 18 flows after cycle 4, 26 after its same-day follow-up. Backend concurrent-load/stress testing remains explicitly out of scope for this environment (see §3d).
- **Cycle 5:** performance/API-read coverage now includes real P99 percentile gating (not just single-sample), pagination and filtered-search variants of the list endpoints, all 11 per-domain report-section endpoints plus both remaining PDF-generation endpoints, and role-scoped coverage for Employee and Client Portal specifically (not just Admin). 19 new tests, all passing.
- **New area, cycle 6: API-Exposure Security Review.** First-ever authorization/exposure-focused testing pass in this project (everything before this was performance-timing-focused). Covers RBAC enforcement across 4 admin-only endpoints for both non-admin roles, cross-tenant IDOR checks on account/report/report-domain resources, JWT signature-integrity verification, and CORS origin handling - 13 new tests, all passing. **Confirmed one HIGH severity cross-tenant data leak (7 of 9 per-domain report endpoints) and one Low-Medium broken-access-control gap (`/api/group-dataclass`)** - see §3j and the Defects Log. Gap: only 4 admin-only endpoints and 9 report-domain endpoints were tested (the ones already catalogued from performance work); a broader sweep of the full endpoint catalog in `specs/performance-sla.md` against both non-admin roles would be a natural next pass, especially given two confirmed misses already found in a small sample suggests others may exist. Cross-browser (Firefox/WebKit) parity for this area not yet verified, chromium only so far.

---

## 6. Summary and Recommendations

- Suite is stable and green. The healing work here was entirely test-code correctness (one wrong assumption fixed, one gap in coverage removed) plus confirmed environment flakiness — the application itself showed no regressions from the client migration.
- Cycle 2: the month-selection-race fix is confirmed stable across the full 58-test report-lifecycle suite (all isolated re-runs green). Recommend never running this suite while a manual/exploratory browser session against the same account is active — see §3a.
- Recommend product/business confirmation on whether Real Estate and Financial Movements are intentionally excluded from the consolidated report, since this affects whether future content-validation should be added for them (e.g. against a different report or view) or left as-is.
- Recommend re-running the report-lifecycle suite against Firefox/WebKit at least once against the new client to confirm cross-browser parity holds, since this cycle only validated chromium.
- Cycle 3: recommend fixing the password-reset email's copy (it currently reuses "account created" boilerplate for an existing client) - a small content change, no code/security risk. Recommend a delete/deactivate path for client and staff records be considered if this project needs to keep testing creation-notification emails repeatably in future cycles, since none exists today.
- Cycle 3: recommend the product/engineering team review error handling on Login, Clients list, Upload Import, and Markets Export - all four currently give users no way to distinguish a real server outage from their own mistake (or, for Import/Export, no feedback whatsoever). Reports Consult's existing "The server was unable to complete your request. Please try again later." message is a good, low-effort template to reuse across the other four flows.
- Cycle 3: recommend investigating PDF Generation specifically (35.6s vs under 2s for every other flow) if faster report turnaround matters to users - everything else in the app is fast, so this is a targeted, not systemic, performance question. A backend-side trace would be needed to say whether this is inherent to PDF composition work or has optimization room, which is outside what a browser-side Playwright measurement can determine.
- Cycle 4: the formal SLA (`specs/performance-sla.md`) held on first run across all 18 tests with zero FAILs - recommend running this suite as a standing regression check on future deploys, since it now covers every feature area rather than a 5-flow sample. Recommend confirming the real API endpoint substrings for Team Management/Logs/ISIN/Upload-history so their T3 API-read numbers stop reading "n/a" (see §3f).
- Cycle 4 follow-up: Login's apparent 3-4x slowdown turned out to be genuine transient environment latency, not a regression or a code issue - confirmed by an isolated re-run measuring fully GOOD numbers once a test-infrastructure timeout bug (§3g) was fixed. Recommend keeping that 15s login-assertion timeout as a permanent safeguard against future false failures, and treating any future Login WARN the same way: verify with an isolated re-run before assuming a regression, per this project's established healing pattern. No new application defects were found in either round of this cycle - all of it added SLA gating, coverage breadth, and test-infrastructure robustness, not new app behavior findings.
- Cycle 5: recommend the product/engineering team decide on `GET /api/isin`'s now-confirmed-frequent SLA breach (83% of independent runs exceeded the 3,000 ms max, consistently in a 2.7-4.4s band) - pagination (matching `/api/client`/`/api/user`'s existing pattern) is the most likely root-cause fix, or the endpoint could be given its own, more permissive SLA tier if pagination isn't feasible soon. This is a genuine, structural finding, not flakiness.
- **Cycle 6, URGENT: recommend engineering treat the cross-tenant report-domain data leak as priority-one.** 7 endpoints (`/api/consolidation-global`, `/api/passif`, `/api/real-estate`, `/api/gestion-locative`, `/api/arts/clients/{name}`, `/api/report-todos/clients/{name}`, `/api/report/client/{name}/months`) return real financial data for whatever client name is passed in, with no check against the authenticated session's own tenant - any client-portal user who knows/guesses another client's name can view that client's portfolio, liabilities, real estate, rental income, art holdings, and to-do notes. The fix is narrow and doesn't require an auth-system rework: each of these 7 endpoints needs to derive/validate the `client` parameter against the authenticated session's own identity, the same way the report-by-UUID/PDF endpoints and 2 sibling per-domain endpoints (`direct-private-equity`, `unsupervised/stock`) already correctly do. This is unrelated to and more severe than the finding below.
- Cycle 6 (separate, lower-priority finding): recommend an engineering audit of `GET /api/group-dataclass`'s missing authorization check, and - since this was one of the misses found in a small sample - recommend extending the same RBAC-style check across the rest of the endpoint catalog already documented in `specs/performance-sla.md`, since the fact that one endpoint was missed raises real odds that others were too. Also recommend two low-cost hardening changes with no functional impact: stop returning the raw JWTs in the login response body now that the cookies alone are confirmed sufficient, and add the `Secure` flag plus an HSTS header to the auth cookies/responses. None of these are urgent given today's actual risk profile (low-sensitivity leaked data, HTTPS-only deployment with no evident HTTP listener), but all three are inexpensive to fix and reduce defense-in-depth gaps rather than active exploits. Positive findings worth preserving as regression coverage going forward: JWT signature verification is real and correctly enforced, CORS is correctly locked to the app's own origin, and the report-by-UUID/PDF/account-by-id endpoints (as opposed to the 7 name-parameter endpoints above) are correctly tenant-scoped with no IDOR found.
