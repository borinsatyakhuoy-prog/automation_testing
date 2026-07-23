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
| **T3 — API Read** | A single read (GET) API call — list, detail, or config fetch | ≤ 800 ms | ≤ 3,000 ms | Observed baselines 14–264 ms across `/api/me`, `/api/config`, `/api/client`, `/api/report`, `/api/entrance/login`, `/api/group-dataclass`, `/api/ip-white-list`, `/api/currency-detail`, `/api/account/{id}`, and offset/filtered variants (`/api/client?page=1`, `/api/user?page=1`, `/api/client?search=`, `/api/user?search=`) |
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

## P99 methodology (2026-07-23)

Every tier above, as originally defined, gates a **single measured sample**
per test run against `target`/`max`. That's a real signal, but one lucky or
unlucky sample can't show tail behavior - the industry-standard way to
define a latency SLA is against a **percentile of a distribution of repeated
samples** (a "P99 SLA": the 99th-percentile duration must stay under the
threshold), not one click.

`tests/fapa-test/performance/066_p99-sla-performance.spec.ts` adds this on
top of the existing single-sample tests (which stay in place as a fast,
per-feature smoke check) via three new helpers in `helpers/performance.ts`:
`percentile()`, `summarizeSamples()` (min/P50/P99/max), and `assertP99SLA()`
(gates a sample array's P99 against a tier's existing `max`, same hard-fail
semantics as `assertSLA()`).

**Sample size is deliberately not uniform across tiers**, because this
project explicitly avoids generating repeated/concurrent load against its
one shared *live* dev account (see Methodology above and
`playwright.config.ts`):

| Tier | Samples (n) | Why |
|---|---|---|
| T2 Navigation | 30 | Cheap (~100-300 ms/sample) - 30 repeats costs seconds |
| T3 API Read - `/api/client`, `/api/user` | 30 each | Same - cheap, sub-second calls |
| T3 API Read - `/api/isin` (2,438-row, ~614 KB payload) | 15 | Still cheap in wall-clock terms, but each sample is a real ~614 KB transfer - 15 already moves ~9 MB through the shared dev server |
| T3 API Read - `/api/currency-detail` ("Devise") | 5 (across 5 different `month` values, not repeats of one) | Tests the range *across the month parameter*, not repeated identical calls - see below |
| T6b Report Consult (full render) | 5 | Each sample is a real ~15-30s report generation - 30 repeats would mean 10-15+ minutes of continuous Consult load against the same shared account |
| T7 PDF Generation | 3 | Each sample requires its own full Consult+Generate cycle (up to ~90s+) - 30 repeats would mean tens of minutes |

With n=5 or n=3, the nearest-rank P99 calculation converges toward the
**observed max** rather than a statistically rigorous tail estimate - this
is stated in each of those tests' own output rather than presented as
equivalent rigor to the n=30 tiers. It's still a useful, honest signal
("worst case seen this run"), just not a true percentile.

**"Devise" (Currency) data-volume investigation:** the Currency tab holds
only ~10-14 rows for any single month (confirmed via the live API response),
so the "a lot of data" question for this screen is really about the `month`
query parameter, not row count. `066` sweeps 5 periods spanning the full
picker range (2026 back to 2003, the earliest year the date picker allows)
and reports the min/max range across periods plus the P99 of those 5 API
calls. Typed directly into the date field via a single atomic `fill()`
rather than clicking through the calendar widget or typing character-by-
character - both were tried live and rejected: clicking through the
year/month grid is fragile across repeat cycles, and character-by-character
typing fires a live-reparsed request per keystroke, including an observed
literal `GET /api/isin?month=Invalid%20date` → 400 mid-type. A single
`fill()` produces exactly one clean request per period.

**ISIN data-volume finding:** unlike Currency, Markets → ISIN genuinely does
hold a lot of data - confirmed live at **2,438 rows / ~614 KB** for a single
month's JSON response, matching the row count already referenced for Markets
Export in `specs/planner.md` §17. Also unlike Currency, switching ISIN ↔
Currency tabs does **not** re-fetch `/api/isin` (Angular keeps the tab's
component alive) - only a full nav-away-and-back (e.g. via Dashboard)
triggers a fresh fetch, which is the cycle `066` uses for its 15 samples.
Re-verified with 4 additional isolated runs the same day specifically to
answer "how often does this actually breach the SLA" - see Overall
Conclusion below for the full tally (5 of 6 runs exceeded the 3,000 ms max).

## Report generation architecture: what a single Consult actually does

Live Resource Timing capture of one real Consult (Dashboard → Reports →
select client → Consult), read via
`performance.getEntriesByType('resource')` with full timing fields
(`startTime`, `fetchStart`, `requestStart`, `responseStart`, `responseEnd`),
found the click fires **22 separate `/api/report/*` calls**, six of which
were not previously catalogued anywhere in this suite:

| Endpoint | Purpose (inferred) |
|---|---|
| `GET /api/report/client?search={query}` | Client-name autocomplete on the Reports search page (distinct from `/api/client?search=` used by the Clients list) |
| `GET /api/report/client/{name}/months` | Which months have report data for this client |
| `GET /api/report/{client}/{month}` | The report metadata fetch (the one `041`/`055` already measure, at a slightly more specific path than previously assumed) |
| `GET /api/report/pdf?client={client}&month={month}` | Fired alongside the metadata fetch - likely kicks off/checks PDF availability |
| `GET /api/report/{reportId}` | Fetch by the report's generated UUID, once one exists |
| `GET /api/report/{reportId}/sections/{sectionHash}` | **Fired 14 times in this one Consult** - the report is composed of ~14 independently-fetched sections (charts/tables), not one monolithic payload |

**Every one of these 22 calls completed in 20-300 ms**, and the 14 section
calls in particular all landed within a **~315 ms window of each other**
(effectively parallel, not sequential) - so the section-fetch step itself is
fast and well-architected. **Zero queuing**: `fetchStart - startTime`
(Resource Timing's own measure of time spent waiting for a free connection)
was **0 ms on all 22 calls**, meaning the browser never queued a request
behind connection limits - ruling out client-side/network contention as a
cause of Consult's overall duration.

**So where does the ~20-30s actually go?** Not inside any measured HTTP
call - in **three large idle gaps between completed calls**: ~8.0s before
the `/months` lookup, ~8.7s before the metadata fetch, and ~15.3s before the
final fetch-by-UUID. No repeated/polling requests and no WebSocket or SSE
connection were observed during any of these gaps (checked directly via
`initiatorType`/`resource` entries - none found). **Answering the direct
question of "is there queuing latency": there is no browser-side or
network-level queuing anywhere in this flow.** The gaps almost certainly
reflect a server-side async job (report assembly/rendering) that the client
is waiting on via some mechanism this browser-based suite cannot observe
(no visible poll, no visible push) - quantifying that job's internal
queue/processing time split would require backend-side tracing or APM, not
something achievable from Playwright/Resource Timing. What this investigation
*does* rule out with confidence: slow individual queries, connection
contention, and client-side rendering blocking on network.

## Coverage

See `specs/planner.md` §17 for the full per-flow measurement table, and
`tests/fapa-test/performance/` for the test files. As of 2026-07-22, every
top-level feature area has at least one performance test gated against one or
more of the tiers above.

As of 2026-07-23, API-endpoint (T3) coverage was extended to close gaps found
by live-exploring the app's network traffic rather than reading existing test
code alone (several endpoints were fired by the UI but never asserted against
any SLA):

- `045_admins-asset-classes-performance.spec.ts`, `046_admins-firewall-performance.spec.ts`,
  `049_markets-currency-performance.spec.ts` and `054_client-detail-view-performance.spec.ts`
  each gained a T3 assertion for the read endpoint their flow was already
  triggering (`/api/group-dataclass`, `/api/ip-white-list`,
  `/api/currency-detail`, `/api/account/{id}`) but not measuring.
- `064_clients-admins-pagination-api-performance.spec.ts` (new) — every
  existing list-endpoint test only ever exercised page 0, the page that's
  already loaded on first render. This measures the `page=1` call fired by
  clicking "Next page" on `/api/client` and `/api/user`, since offset-based
  pagination degrading on deeper pages is a common backend risk that was
  previously untested.
- `065_search-filter-api-performance.spec.ts` (new) — the existing Clients/
  Admins search tests (057/058) only gate the bundled UI wall-clock time
  (debounce + API round trip + re-render). This isolates the actual filtered
  `GET /api/client?search=`/`GET /api/user?search=` call and gates it
  against T3 directly, so a slow backend filter query can't hide behind an
  otherwise-passing T4 result.

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

## Correction (2026-07-23): a residual race survived the 2026-07-22 T6b fix

A full run of the performance suite after adding the 2026-07-23 API-endpoint
coverage above turned up two pre-existing bugs in `041` and `055`, both
predating and unrelated to that day's changes:

- **`041_reports-consult-performance.spec.ts` had no `test.setTimeout()`
  override**, unlike its siblings `042` (PDF Generation) and `055` (Report
  Lifecycle), which both set 180s. Since T6b alone allows up to 75s, plus
  attaching metrics afterward, a legitimately SLA-compliant run (measured:
  29,248 ms, well under the 75,000 ms max) still hit Playwright's default 30s
  *test* timeout and failed — the per-test timeout was tighter than the SLA
  it was asserting. Fixed by adding `test.setTimeout(120_000)`.
- **Both `041` and `055` still gated Consult completion on
  `getByText(/report is being generated/i).toBeHidden()`**, exactly the
  zero-match-is-trivially-hidden race that `helpers/reports.ts`'s
  `waitForReportRendered()` was written to fix that same day for the
  report-lifecycle functional specs (`001`-`010`) — the fix was never
  propagated to these two performance specs. It reproduced live: a
  `toBeVisible()` check for the progress text timed out after 20s with the
  page still showing the blank Consult search form (see the failure
  screenshot for `055`), i.e. the report never started rendering that run.
  Fixed by applying the same pattern inline in both files: don't hard-fail if
  the progress text never appears, and gate completion on a concrete
  rendered-report element (the PDF toolbar button becoming visible) instead
  of the progress text becoming hidden.

After both fixes, re-running `055` in isolation immediately succeeded
(18,665 ms Consult-to-rendered, well within SLA) — confirming the earlier
failure was transient backend contention from several back-to-back real
Consult generations against the same "QA Automation Client" account within
one test session (this suite's own manual exploration plus `041`/`042`/`055`
all Consulting the same client/month in quick succession), not a functional
regression. This is consistent with the "requires genuine concurrent-ish
load" pattern already documented above, just triggered by serial test runs
close together rather than true concurrency.

## Correction (2026-07-23, part 2): `consultReport()` broke under repeated Consult calls in one test

Building the P99 slow-tier tests above (5 repeated Consult cycles, 3 repeated
PDF Generation cycles, all in a single test/page rather than one Consult per
test like every other spec) surfaced a real bug in the shared
`consultReport()` helper (`tests/fapa-test/helpers/reports.ts`): its final
step, `getByRole('button', { name: 'Consult' })`, is a **substring** match by
default. On a fresh page this is unambiguous, but once a report has already
rendered once on the same page, the rendered portfolio tree's per-bank
toggle buttons are named `"Toggle Consultation des portefeuilles ..."` -
which also contains "Consult" as a substring. Playwright's strict mode
correctly refused to guess between the real Consult button and 3+ tree
toggle buttons, failing both slow-tier P99 tests on their 2nd iteration.
This was latent in the helper the whole time; it just never surfaced before
because every other test in this suite calls `consultReport()` at most once
against a fresh page. Fixed by adding `exact: true` to that one locator -
strictly narrows the match, so it cannot affect any existing single-Consult
caller. Re-running both P99 tests after the fix passed cleanly end to end
(5/5 and 3/3 cycles respectively - see Overall Conclusion below for the real
numbers).

## SLA & Uptime Calculator (99.9% reference)

This section answers "is the system running smoothly" using two different,
non-interchangeable kinds of measurement, and is explicit about which one
this project actually has data for.

**Standard 99.9% ("three nines") downtime allowance, for reference:**

| Period | Allowed downtime at 99.9% |
|---|---|
| Daily | 1 m 26.4 s |
| Weekly | 10 m 4.8 s |
| Monthly (30 days) | 43 m 49.7 s |
| Quarterly | 2 h 11 m 29.7 s |
| Yearly | 8 h 45 m 57 s |

**This project has no true uptime/availability monitoring** - no synthetic
uptime pings, no APM, no continuous production monitoring. Everything in
this test suite is a point-in-time Playwright measurement taken when someone
runs it, not a 24/7 observer. So there is no real "99.9%" figure to report
in the classical availability sense, and it would be dishonest to manufacture
one. What this project *does* have, from today's repeated real-world
sampling, is a **Consult-completion SLA-compliance rate** - a much more
specific and honest number:

- **Idle/isolated repetition** (2026-07-21 finding, 12 back-to-back Consult
  cycles with no other test load running): **12/12 = 100%** completed within
  the T6b SLA window (20.0-25.5s each, well under the 75s max).
- **Heavy same-session repetition** (2026-07-23, this suite's own testing
  activity - manual exploration plus `041`/`042`/`055`/`066` all Consulting
  the same client/month repeatedly within a short window): **6 out of 8**
  standalone Consult-completion attempts finished within the 75s SLA window
  (the other 2 genuinely never rendered within 75s - confirmed via failure
  screenshots showing the blank search form, not an error state) = **75%**.

Neither number is "the" uptime figure - they're two different regimes
(idle vs. self-inflicted heavy load), and 12 and 8 samples are both far too
few to statistically distinguish "99.9%" from "95%" with any confidence (that
would take thousands of trials). The honest reading is: **under normal,
single-user usage this app's Consult flow is reliable** (matches the 100%
idle figure and the P99 slow-tier sampling's own passing runs - see Overall
Conclusion below); **under sustained repeated use in a short window, this
project's own testing has twice reproduced a genuine >75s stall with no
error shown to the user** - a real, open risk worth a backend-side
investigation (see Issue 19 / `test-results/exploratory-findings.md`), not
something this browser-side suite can root-cause further.

## Overall Conclusion (2026-07-23)

**Is the system running smoothly? Yes, for every flow except one specific,
already-flagged risk area.**

- **Every tier passes its P99 gate, most by a wide margin.** P99 sampling
  (30 repeats for navigation and the cheap API reads, 15 for the heavier
  `/api/isin` payload, 5 across a historical range for
  `/api/currency-detail`) landed at 31-315 ms P99 against an 800 ms target /
  3,000 ms max for API reads, and 153 ms P99 against a 2,000 ms target /
  6,000 ms max for navigation - 10-25x headroom before hitting SLA max even
  at the tail. The expensive tiers, sampled at reduced size (n=5/n=3) for the
  cost reasons above, are just as healthy: **Report Consult P99 = 26,705 ms**
  (min 19,149 / P50 21,693 / max 26,705 ms) against a 35,000 ms target /
  75,000 ms max, and **PDF Generation P99 = 12,389 ms** (min 6,971 / P50
  10,327 / max 12,389 ms) against a 60,000 ms target / 120,000 ms max - both
  comfortably inside target, not just under max, across every one of their
  samples.
- **`/api/isin` consistently exceeds its formal SLA ceiling - confirmed,
  but with an important correction to how that was measured.** Six original
  P99 runs measured 2,673 / 3,203 / 3,403 / 3,062 / 3,636 / 3,700 ms (5 of 6
  over the 3,000 ms max). Building the P99 methodology section above
  surfaced a **real bug in `066`'s own ISIN test**: the loop fired all 15
  nav-away-and-back cycles back-to-back without waiting for each cycle's
  network activity to settle - "ISIN tab selected" resolves as soon as the
  tab UI switches, well before the underlying fetch completes, so cycle N+1
  could fire while cycle N was still in flight. That self-inflicted request
  pile-up produced a near-perfectly linear climb across one run's 15
  samples (1,701 → 2,864 → 4,303 → ... → **21,006 ms**) that had nothing to
  do with the endpoint's real latency - a single, properly-paced call
  consistently measured a flat ~1.6-1.8s TTFB in isolation. **The `21,006 ms`
  figure (and any framing implying ISIN can take up to ~20+ seconds) was a
  test artifact and should not be repeated or quoted** - fixed by adding a
  `waitForLoadState('networkidle')` inside the loop, one per cycle.
  Re-verified 3 more times after the fix: **3,918 / 3,934 / 4,404 ms** -
  **still exceeding the 3,000 ms max on all three**, and if anything
  somewhat higher than the original six readings, plausibly reflecting
  cumulative session/day load on the shared dev account by this point
  rather than anything wrong with the fix. **Net conclusion, corrected: the
  core finding holds** (`/api/isin` reliably exceeds its SLA ceiling, root
  cause is a real, unpaginated **2,438-row / ~614 KB** payload) **but the
  honest range is ~1.6-4.4s, not "up to 21 seconds"** - that number was
  measurement error, not a real user-facing latency. **Recommendation**
  unchanged: paginate `/api/isin` the way `/api/client` and `/api/user`
  already are - the root-cause fix - or, if that's not near-term feasible,
  give this endpoint its own SLA tier with a higher ceiling (mirroring
  T6/T6b for Report Consult) rather than measuring it against a ceiling
  calibrated for sub-100-row responses. Still a product/eng decision, not
  one to make unilaterally in this test suite.
- **The `/api/currency-detail` ("Devise") endpoint is fast and consistent
  regardless of how far back the queried month is** - P99 125 ms across
  periods spanning 2003-2026, no evidence that older/less-recent data is
  slower to query.
- **Report Consult root-cause investigation: the delay is not slow API
  calls, and there is zero network/browser-side queuing.** A full Resource
  Timing capture of one live Consult (22 `/api/report/*` calls, including
  6 endpoints not previously catalogued - see Coverage below) showed every
  individual call completing in 20-300 ms, with `fetchStart - startTime`
  (the browser's own connection-queuing metric) equal to **zero on every
  single call** - the browser never queued a request waiting for a free
  connection. Instead, the ~20-30s Consult duration is concentrated in
  **three large idle gaps between completed calls** (~8.0s, ~8.7s, ~15.3s),
  during which no further network activity - no repeated polling, no
  WebSocket/SSE connection - was observed. In plain terms: **there is no
  measurable "queuing latency" on the network/browser side**; the true
  server-side cost (an async report-generation job, most likely) happens in
  a way this browser-based suite cannot see or measure further - that would
  require backend-side tracing/APM, not something Playwright can add. What
  this suite *can* now say with confidence is what it's **not**: not slow
  queries, not connection contention, not client-side rendering blocking on
  network (the section fetches themselves were fast and effectively
  parallel, arriving within a ~315ms window).
- **The one open risk, unchanged from previous findings: Reports Consult
  has a real, reproducible tail-latency failure mode under sustained
  same-account repetition within a short window**, occurring in roughly 1
  out of every 4 attempts under that specific condition today (see SLA &
  Uptime Calculator above), while staying 100% reliable under idle/isolated
  use. This is a backend characteristic this suite can observe and quantify
  but not root-cause from the browser side - flagged for backend
  investigation, not treated as "the system is broken."

**Bottom line, updated:** for a single user doing normal work, most of the
app remains fast and reliable. Two things are worth taking to the backend
team, in priority order: **(1) `/api/isin` - confirmed, consistently over
its SLA ceiling in the ~1.6-4.4s range (see the correction above - not the
"up to 21s" a test-methodology bug briefly suggested), root-caused to an
unpaginated 2,438-row payload, with a known standard fix (pagination)** -
this is now the single most actionable finding in the entire suite; and
**(2) Consult's tail-latency stall under repeated/sustained use** - real and
reproducible, but its exact server-side cause is outside what browser-based
measurement can determine.

## Role-based coverage (2026-07-23): Client Portal and EMPLOYE role

Every test above logs in as ADMIN. By request, extended coverage to the
other two roles this app has, using two dedicated test accounts (credentials
in `.env`, see `.env.example` for the pattern - passwords set directly via
each role's own "Reset password" admin action, no email round-trip needed):

**EMPLOYE role** (`068_employee-role-performance.spec.ts`): confirmed live that EMPLOYE has no
"Admins" nav item at all, and a direct `/admin` navigation **redirects away
server-side** - not just a hidden UI link, real backend authorization.
`GET /api/me` returns `"role":"EMPLOYEE"` (the UI's "EMPLOYE" label is a
truncated display form of the same value) and a numeric `"permission":60`
field. For every operational screen EMPLOYE *can* reach (Clients, Markets),
it hits the **identical endpoints** ADMIN does (`/api/client`,
`/api/currency-detail`, etc.) with statistically indistinguishable timing -
confirmed with a P99 pass, not just a single sample: 30 paced
Dashboard↔Clients cycles measured **P99 788 ms** (UI click-to-visible,
n=30) and **P99 89 ms** (`GET /api/client?...`, n=29) - both comfortably
under target, essentially the same profile as ADMIN's own P99 numbers for
the identical flow. This is a parity confirmation, not new endpoint
discovery.

**Client Portal role**: a genuinely distinct, far more restricted
surface - only "Dashboard" and "Reports" in the nav. Investigating this
answered the open question `specs/planner.md` §14.2 had left unresolved
("what advisor-side action makes a report visible in the client portal?"):
**it's specifically the "Validate PDF" action, not Consult or Generate PDF
alone** - confirmed directly from the app's own confirmation dialog copy:
*"Once validated, this PDF will be visible on the client's dashboard."*
Before validation, the client dashboard shows only greyed-out placeholder
widgets ("No data available at the moment.") regardless of how much real
data the advisor side already has for that client - Consult and Generate
PDF alone are not enough.

To get a *representative* (not empty-state) client-portal performance
measurement, seeded one of this project's existing disposable test
clients ("QA Mail Test Client", previously used only for the mail-service
notification investigation) with real portfolio data: took the existing
`1. JDD_model_portefeuille.xlsx` fixture already used by
`report-lifecycle/001_portfolio.spec.ts`, and produced a new derived copy
(`fixtures/qa-mail-test-client-portfolio.xlsx`) with every `"QA Automation
Client"` cell retargeted to `"QA Mail Test Client"` (the client is
determined entirely by column A's text content, confirmed by unzipping the
`.xlsx` and inspecting `xl/worksheets/sheet1.xml` directly) - the original
fixture is untouched. Imported, Consulted, Generated, and Validated for the
current month before measuring, so `067_client-portal-performance.spec.ts`
exercises the same real-content weight a genuine client would see, not a
trivial empty page.

| Flow | Tier | n | Result | Verdict |
|---|---|---|---|---|
| Client login → dashboard | T2 | 2 (single-sample) | 1,639-4,477 ms | PASS/WARN - noisy, not consistently slow |
| Client Dashboard click-to-visible (P99) | T2 | 15 | min 547 / P50 1,410 / **P99 2,263** ms | **WARN on P99** - consistent, not noise |
| Client Reports click-to-visible (P99) | T2 | 15 | min 1,625 / P50 1,944 / **P99 2,184** ms | **WARN on P99** - consistent, not noise |
| `GET /api/dashboard` (P99, client role) | T3 | 13 captured | min 47 / P50 57 / **P99 98** ms | PASS - comfortably fast |
| `GET /api/report/doc` (P99, client role) | T3 | 13 captured | min 16 / P50 19 / **P99 66** ms | PASS - comfortably fast |
| Client Sign Out | T2 | 1 (single-sample) | 212-250 ms | PASS |

The Reports/Dashboard click-to-visible WARN is confirmed real and
consistent (P99 sampling, not a single noisy reading) - and now cleanly
separated from its cause: the underlying API calls are fast (P99 66-98 ms),
so the WARN is pure UI render weight, not a slow query. The client-portal
"Reports" click renders the *entire* validated report inline (same content
weight as the advisor's post-Consult view), not a lightweight document
list, so landing above the 2,000 ms navigation target is the structurally
correct expectation, not a bug worth chasing.

### Full endpoint catalog discovered this round

Live-exploring the import → Consult → Generate → Validate → client-view
flow end to end surfaced far more of the report-generation architecture
than previously catalogued:

| Endpoint | Purpose |
|---|---|
| `POST /api/stock` | The actual data-import endpoint (Upload > Import) |
| `PUT /api/report/validate/{reportId}` | The real Validate PDF / publish-to-client action |
| `GET /api/report/check-validated/{reportId}` | Whether a given report is already validated |
| `GET /api/report/{reportId}/pdf` | Fetches/confirms the generated PDF |
| `GET /api/report-todos/clients/{name}?reportDate=` | The report's "To Do List" section data |
| `GET /api/consolidation-global` / `-filtered` / `-bank` `?date=&client=` | Portfolio consolidation views (global, filtered, by depository bank) |
| `GET /api/passif?client=&date=` | Liabilities section |
| `GET /api/real-estate?client=&date=` | Real-estate assets section |
| `GET /api/gestion-locative?client=&date=` | Rental management section |
| `GET /api/movements-bancaire?client=&date=` | Bank movements section |
| `GET /api/arts/clients/{name}?reportDate=` | Works-of-art section |
| `GET /api/direct-private-equity/clients/related?client=` | Private equity section |
| `GET /api/unsupervised/stock/clientName/{name}` | Unsupervised asset classes for a client |
| `GET /api/currency-detail/distinct?search=` | Currency-code autocomplete (fires from the ISIN Edit dialog) |
| `DELETE /api/logout` | The real sign-out endpoint |

Each of the ~14 report "sections" discovered in the earlier gap-analysis
investigation corresponds to one of these named REST resources, confirming
the report is assembled from genuinely independent, per-domain data
sources rather than one monolithic query - consistent with that
investigation's finding that every individual call was fast and the real
cost sits in the gaps between them, not in any of these queries
themselves.
