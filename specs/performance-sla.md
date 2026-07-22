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
| **T6 — Report Consult (progress state)** | Click Consult to the async "report is being generated" state appearing | ≤ 3,000 ms | ≤ 10,000 ms | Observed baseline 1,545–1,775 ms typical. **This is not the whole Consult flow** — see T6b. Kept only as a sub-metric of how fast the app acknowledges the click |
| **T6b — Report Consult (full render)** | Click Consult all the way through to the report actually rendering (progress bar gone, data visible) — the real, user-facing completion of "Consult" | ≤ 35,000 ms | ≤ 75,000 ms | Observed baseline 20,004–25,464 ms across 12 back-to-back isolated repeats (avg ~23.6s), plus 21,741 / 22,646 / 22,940 ms in the formal SLA runs — all consistent, no degradation trend under repetition alone. Previously **unmeasured**: every test in this suite (including T7 below) stopped watching at T6's progress-bar-appears moment, so this ~20-25s render wait was invisible in every report. Issue 19 documents tail latency under sustained *concurrent* load specifically (not repetition) — max set with margin to absorb that without masking a real regression |
| **T7 — PDF Generation** | Click Generate PDF to completion, **starting only once the report has already rendered** (T6b complete) | ≤ 60,000 ms | ≤ 120,000 ms | Re-baselined 2026-07-22 after T6b was split out: true click-to-completion is now 7,153–8,416 ms, much lower than the previously reported 20,082–35,645 ms. Those earlier numbers were most likely inflated by leftover report-render time bleeding into this timer — `waitForLoadState('networkidle')` (which ran before the old timer started) doesn't reliably guarantee the report has *visually* finished rendering, so Playwright's own actionability wait on the PDF button's click could silently absorb whatever render time was left over, with the split between "invisible before the old timer" and "hidden inside the old timer" varying run to run. Target/max left unchanged (wide margin) pending more samples of the now-isolated number |
| **TOTAL — Consult click → PDF ready** | The real end-to-end wait a user experiences clicking Consult then Generate PDF | ≤ 95,000 ms | ≤ 195,000 ms (T6b max + T7 max) | Observed 30,093 / 31,062 ms in the formal SLA runs. This is the number that should be quoted if asked "how long does Consult+PDF take", not T6 or T7 in isolation |

## Verdicts

- **PASS** — measured value ≤ `target`. Healthy.
- **WARN** — `target` < measured value ≤ `max`. Within SLA but degraded; logged and attached to the test report for trend-watching, does not fail the test.
- **FAIL** — measured value > `max`. Hard test failure via `assertSLA()`.

## Coverage

See `specs/planner.md` §17 for the full per-flow measurement table, and
`tests/fapa-test/performance/` for the test files. As of 2026-07-22, every
top-level feature area has at least one performance test gated against one or
more of the tiers above.

## Correction (2026-07-22): "Consult" was being measured incompletely

A user manually checking Consult observed it taking minutes, which didn't
match the ~1.6-1.8s baseline documented under T6. Investigation
(`tests/fapa-test/performance/041_reports-consult-performance.spec.ts`,
`042_pdf-generation-performance.spec.ts`, `055_report-lifecycle-sla-performance.spec.ts`)
found that **every** Consult-related test — performance and functional alike —
stopped watching the instant the "report is being generated" progress bar
appeared. None waited for it to disappear and the actual report content to
render, so the true click-to-rendered-report duration (~20-25s) had never
been measured anywhere; it was either invisible (swallowed by an untimed
`waitForLoadState('networkidle')` call) or silently inflating the PDF
Generation timer next to it, depending on timing luck. This is now split out
explicitly as T6b above, and 041/042/055 all measure and assert it.

Separately, 12 back-to-back isolated Consult repeats (no other load) stayed
flat at 20.0-25.5s with no degradation trend — the multi-minute case a user
reported was **not** reproduced by repetition alone in an idle session. It
most likely requires genuine concurrent load on the shared account, the same
condition under which Issue 19's tail latency was originally found (see
`test-results/exploratory-findings.md`), not serial repeated clicks from one
session. This remains a documented open risk, not a reproduced/confirmed one.
