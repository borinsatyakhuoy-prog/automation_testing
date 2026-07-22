# Family Partners (FAPA) — Performance SLA

## Purpose

Prior to 2026-07-22, this project's performance suite (`tests/fapa-test/performance/`)
rated flows GOOD/SLOW/POOR against thresholds explicitly documented as
"generous, UX-heuristic... not a formal SLA" (see `helpers/performance.ts`
history). That was a deliberate choice at the time — a readable signal, not a
gate, to avoid flakiness against this shared, documented-as-variable live
"develop" environment (see tail-latency findings, Issue 19 in
`test-results/exploratory-findings.md`).

This document defines the **formal SLA** that replaces that heuristic-only
approach: every tier below has a hard `max` that `assertSLA()`
(`tests/fapa-test/helpers/performance.ts`) enforces as a real pass/fail gate,
not just a label. A `target` is also defined per tier — the expected/healthy
figure. A result between `target` and `max` is a **WARN** (within SLA, but
degraded and worth investigating); above `max` is a **FAIL**.

## Methodology

- Measurements use the browser's own Navigation Timing Level 2 / Paint Timing
  / Resource Timing APIs, plus wall-clock timing of user-facing actions
  (click-to-visible, click-to-state-change) — real numbers from real page
  loads/actions against the live account, not a synthetic external probe or a
  load-testing tool. Generating concurrent/artificial load against this
  shared, production-like environment is explicitly out of scope (see
  `playwright.config.ts`'s note on why this suite runs single-worker).
- Every tier's `max` was set with a deliberate margin above this project's own
  observed real baselines (specs/planner.md §17) specifically so the SLA
  catches genuine regressions (e.g. a flow suddenly taking 5-10x longer)
  without becoming flaky against this environment's own already-documented
  variability under sustained load.
- All performance tests are read-only or dialog-open-then-cancel, per this
  project's real-data safety principle (see the note at the top of
  `specs/planner.md`) — no performance test performs a real write except the
  report-lifecycle SLA gate (`055_report-lifecycle-sla-performance.spec.ts`),
  which reuses the existing dedicated "QA Automation Client" and its
  already-imported data rather than importing anything new.

## SLA Tiers

| Tier | Applies to | Target | Max (hard fail) | Rationale |
|---|---|---|---|---|
| **T1 — Page Load** | Full page load (`goto` → `load` event) for an initial/unauthenticated page (Login) | ≤ 2,000 ms | ≤ 8,000 ms | Observed baseline 894 ms; 8s max still well under a user's patience threshold for a first load on a live, non-CDN-fronted app |
| **T2 — Navigation** | Click a nav/tab control to its section's content visible (Dashboard, Admins sub-tabs, Clients, Markets, Upload, Reports, client detail, settings) | ≤ 2,000 ms | ≤ 6,000 ms | Observed baselines 514–1,775 ms across Dashboard/Clients/Reports Consult-click |
| **T3 — API Read** | A single read (GET) API call — list, detail, or config fetch | ≤ 800 ms | ≤ 3,000 ms | Observed baselines 14–255 ms across `/api/me`, `/api/config`, `/api/client`, `/api/report`, `/api/entrance/login` |
| **T4 — Search/Filter** | Typing/selecting a filter to the filtered result rendering (table search, autocomplete) | ≤ 1,500 ms | ≤ 5,000 ms | No prior baseline; set conservatively relative to T2 since search re-renders a table client-side or via a debounced API call |
| **T5 — Dialog Open** | Opening a dialog/wizard (Add Client, Add Currency, Import File, etc.) | ≤ 1,000 ms | ≤ 4,000 ms | Dialogs are local UI state, not typically network-bound; tighter target than T2/T4 |
| **T6 — Report Consult** | Click Consult to the async "report is being generated" state appearing | ≤ 3,000 ms | ≤ 10,000 ms | Observed baseline 1,775 ms typical, but Issue 19 documents tail latency under sustained load — max set well above the isolated baseline to absorb that documented variance without masking a real regression |
| **T7 — PDF Generation** | Click Generate PDF to completion (success toast or settled network fallback) | ≤ 60,000 ms | ≤ 120,000 ms | Observed baseline 35,645 ms (35.6s), the app's one clear, known bottleneck (AC5, report-lifecycle's own 180s test timeouts); target set comfortably above the observed baseline, max at 2 minutes — beyond that is a genuine regression worth escalating, not normal variance |

## Verdicts

- **PASS** — measured value ≤ `target`. Healthy.
- **WARN** — `target` < measured value ≤ `max`. Within SLA but degraded; logged and attached to the test report for trend-watching, does not fail the test.
- **FAIL** — measured value > `max`. Hard test failure via `assertSLA()`.

## Coverage

See `specs/planner.md` §17 for the full per-flow measurement table, and
`tests/fapa-test/performance/` for the test files. As of 2026-07-22, every
top-level feature area has at least one performance test gated against one or
more of the tiers above.
