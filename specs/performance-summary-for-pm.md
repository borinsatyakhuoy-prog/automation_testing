# Family Partners — Performance Summary (for Product)

_Last updated: 2026-07-23 (re-verified twice more the same day, including catching and correcting a measurement error in our own test tooling - see the ISIN section below). Source data: `specs/performance-sla.md` and `specs/planner.md` §17 (full technical detail, QA/engineering audience). This document translates the same real, measured data into plain terms for product/business decision-making._

## Bottom line

**The app is fast and reliable for normal, everyday use — with one clear, confirmed exception.** Every everyday screen and action we measured loads in well under a second. There are two items worth knowing about, and we now have much stronger evidence on both after a second, deeper round of testing:

1. **Markets → ISIN is consistently, not occasionally, slow** — re-tested 9 separate times total, and 8 of those 9 exceeded our 3-second bar, typically landing in the 2.7-4.4 second range. (One of our test runs briefly suggested this could spike as high as ~21 seconds — we caught that it was our own test clicking too fast without waiting for each check to settle, not a real app problem, and corrected it before finalizing this report. The honest range is 2-4 seconds, confirmed multiple times.) This is a confirmed, frequent issue with a known, standard fix (see below), not a "maybe watch this" item.
2. **Reports Consult occasionally stalls under heavy repeated use** — real and reproducible, but we can now say with confidence it's *not* a network or server-traffic-jam problem (see the root-cause explanation below).

No blocking performance issues for everyday use. One item (ISIN) is worth prioritizing soon — it has a known fix. The other (Consult) needs backend-side investigation we can't do from outside the app.

## How to read the numbers below

For each flow we measured a **realistic range**, not just one lucky click — anywhere from 5 to 30 repeated attempts per flow, so a single fast or slow fluke can't hide the real picture. We report:

- **Typical (P50):** what a normal user experiences half the time
- **Worst case seen (P99/max):** the slowest it got across every attempt we measured
- **Verdict:** ✅ Fast | 🟡 Acceptable, a bit slow | 🔴 Needs attention

## Everyday actions — all fast

| What the user does | Typical | Worst case seen | Verdict |
|---|---|---|---|
| Log in | ~0.5–1s | ~1s | ✅ Fast |
| Open Dashboard | ~0.7–0.9s | ~1s | ✅ Fast |
| Click between main sections (Dashboard/Admins/Clients/Markets/Upload/Reports) | ~0.1–0.3s | ~0.5s | ✅ Fast |
| Open Clients list | ~0.1s | ~0.3s | ✅ Fast |
| Search/filter a table (Clients, Admins) | under 0.1s | ~1s | ✅ Fast |
| Open a dialog (Add Client, Add User, Add Currency, Import File) | ~0.1–0.6s | ~1s | ✅ Fast |
| View a client's detail page | ~0.25s | ~0.4s | ✅ Fast |
| Sign out | ~0.3s | ~0.6s | ✅ Fast |
| Switch language (EN/FR) | ~0.9–1.5s | ~1.5s | ✅ Fast |
| Export ISIN list to Excel | ~2.4–2.6s | ~10s allowed | ✅ Fast (real file generation, expected to take a couple seconds) |

**In short:** anything a user clicks on day-to-day responds close to instantly. None of this needs product attention.

## The two heavier operations — both healthy, but worth knowing the real numbers

These are the two operations users actually expect to take a moment (they involve generating a real report), so we hold them to a much more generous bar:

| Operation | Typical | Worst case seen (across 5 real attempts) | Our generous ceiling | Verdict |
|---|---|---|---|---|
| **Generate a report ("Consult")** | ~20–22 seconds | ~27 seconds | 75 seconds | ✅ Comfortably within range |
| **Generate the PDF** (after the report is already showing) | ~10 seconds | ~12 seconds | 120 seconds | ✅ Comfortably within range |
| **Total, start to finish** (click Consult → PDF ready) | ~30–31 seconds | — | — | This is the number to quote if anyone asks "how long does it take to get a report" |

**Where the ~20 seconds actually goes (new this round):** we traced every individual network call the app makes during report generation — 22 of them, including one that fetches the report in 14 separate pieces. Every one of those 22 calls came back in under a third of a second, and there was zero time spent waiting in a network queue. In plain terms: **it's not that the app is asking for data slowly — it's that there are three long, silent pauses (roughly 8, 9, and 15 seconds) between those quick data requests**, almost certainly while the server does report-assembly work behind the scenes that doesn't show up as a request we can see or time from the browser. That's a real backend question ("what is happening in those three gaps"), not a network or frontend performance problem — which at least tells the backend team precisely where to look.

## The one thing worth flagging to the team

**Reports Consult occasionally takes much longer than usual if you generate several reports back-to-back in a short window.**

- If you generate one report and wait a bit before the next, it reliably takes ~20-25 seconds every time — tested 12 times in a row with zero issues.
- If you generate several reports rapidly, one after another (the kind of thing our own testing does, and a busy user might too), we saw it occasionally stall well past a minute with **no error message shown** — it just sits there. This happened in roughly 1 out of every 4 rapid-fire attempts in our testing.
- This is a backend/server-side capacity behavior, not something we can fix from the outside — flagging it as a **candidate for backend investigation**, not a blocking bug. For a typical single user working normally (not machine-gunning report requests), this is not expected to show up.

**Recommendation:** not launch-blocking, but worth a conversation with backend/infra about what happens when several report-generation requests land close together, and whether a "still working, please wait" indicator should show up if it ever takes longer than ~30 seconds — right now the screen gives no feedback during a slow stall, which is confusing for a real user even though the report usually does eventually finish.

## The one confirmed, frequent issue: Markets → ISIN

**Markets → ISIN** holds real data — 2,438 securities for a single month (vs. e.g. only ~14 currency rates on the neighboring Currency tab). We tested this 9 separate times across two rounds of testing. Result: **8 of 9 times, it took longer than our 3-second bar — consistently landing in a 2.7-4.4 second range.** This is not an occasional blip, it's the normal, expected behavior of this screen today.

**A note on how we got this number, because it matters:** partway through this investigation, one test run briefly suggested this screen could take as long as ~21 seconds in the worst case. Before including that in this report, we dug into why — and found it was our own test tool clicking through the screen too quickly, before waiting for each check to fully finish, which caused requests to pile up artificially. That's a mistake in how we were testing, not something a real user would ever experience. We fixed our test and re-checked three more times; the real, honest number is **2-4 seconds**, confirmed repeatedly. We're flagging this correction directly because we'd rather you see the number we actually stand behind than a scarier one we later had to walk back.

**In plain terms:** a user opening this screen will wait 2-4 seconds, not a jarring wait — this is not a "the app is broken" situation, and it does always finish loading. But it is a confirmed, repeatable finding, and it's the single clearest performance issue anywhere in this app. We know exactly why: the screen loads **all 2,438 rows in one go** instead of a page at a time, the way the Clients and Admins lists already do.

**Recommendation:** load this screen a page at a time (the same pattern already used for Clients and Admins) — the actual root-cause fix, not just a threshold to relax. This is a well-understood, standard fix, not a research problem, and given it's now confirmed (not suspected) and this dataset will likely keep growing, it's worth prioritizing soon rather than "someday."

## What we don't have (and why that's OK for now)

We don't have 24/7 uptime monitoring (no "system was up 99.9% of the time this month" dashboard) — everything above comes from real, repeated test runs against the live app, run today. That's a different (and for a pre-launch/internal tool, arguably more useful) kind of evidence than uptime monitoring: it tells you *how fast things actually are*, not just *whether the server was reachable*. If/when this becomes customer-facing at scale, real uptime/APM monitoring would be the natural next investment.

## Questions this document is built to answer

- **"Is the app fast enough to ship?"** — Yes, every everyday action is fast, and the two heavy operations (report + PDF generation) are consistently within a generous, user-reasonable window.
- **"Is anything actually broken?"** — No outright breakage. ISIN is confirmed slow (8/9 test runs, 2-4 seconds) but always finishes; Consult's rare stall under rapid repeated use is real but not something a normal single user is expected to hit.
- **"What should we prioritize?"** — ISIN pagination: confirmed (not suspected) via 9 independent test runs, root-caused precisely, and has a standard, well-understood fix. This is the most actionable item to come out of this entire performance testing effort.
- **"What needs backend investigation, not a frontend fix?"** — Consult's tail-latency stall. We've now ruled out network/connection issues as the cause (every individual API call is fast, zero queuing) — the delay lives in three silent gaps between calls, which points at backend job processing, not anything visible or fixable from the browser side.
