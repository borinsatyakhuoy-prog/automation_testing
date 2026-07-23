# Family Partners — Performance Summary (for Product)

_Last updated: 2026-07-23. Source data: `specs/performance-sla.md` and `specs/planner.md` §17 (full technical detail, QA/engineering audience). This document translates the same real, measured data into plain terms for product/business decision-making._

## Bottom line

**The app is fast and reliable for normal, everyday use.** Every screen and action we measured loads well within a comfortable range — most in a fraction of a second, none anywhere close to "user gives up and leaves" territory. There are **two specific items** worth knowing about: Reports Consult occasionally stalling under heavy repeated use (see below), and one screen (Markets → ISIN) that has now measurably crossed our own performance bar due to a real, fixable cause.

No blocking performance issues for normal use. Two items worth a backend look — one has a known, standard fix.

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

**Why report generation takes ~20 seconds at all:** this is a real, structural cost of assembling a client's full portfolio report, not something we found to be a bug or a quick fix. It's consistently in this range whether measured once or repeated many times back-to-back.

## The one thing worth flagging to the team

**Reports Consult occasionally takes much longer than usual if you generate several reports back-to-back in a short window.**

- If you generate one report and wait a bit before the next, it reliably takes ~20-25 seconds every time — tested 12 times in a row with zero issues.
- If you generate several reports rapidly, one after another (the kind of thing our own testing does, and a busy user might too), we saw it occasionally stall well past a minute with **no error message shown** — it just sits there. This happened in roughly 1 out of every 4 rapid-fire attempts in our testing.
- This is a backend/server-side capacity behavior, not something we can fix from the outside — flagging it as a **candidate for backend investigation**, not a blocking bug. For a typical single user working normally (not machine-gunning report requests), this is not expected to show up.

**Recommendation:** not launch-blocking, but worth a conversation with backend/infra about what happens when several report-generation requests land close together, and whether a "still working, please wait" indicator should show up if it ever takes longer than ~30 seconds — right now the screen gives no feedback during a slow stall, which is confusing for a real user even though the report usually does eventually finish.

## The one screen with a genuinely large dataset — and it just crossed our own bar

**Markets → ISIN** holds real data — 2,438 securities for a single month (vs. e.g. only ~14 currency rates on the neighboring Currency tab). Loading it takes **~1.8–3.2 seconds** — and in one of our two test runs, that **exceeded the 3-second ceiling** we hold every other data-loading action in the app to (everything else loads in well under 1 second).

**In plain terms:** a normal user opening this screen will still see it load in a few seconds, not a jarring wait — this is not a "the app is broken" situation. But it's the one screen in the entire app that has actually crossed our own quality bar, and now we know why: the screen loads **all 2,438 rows in one go** instead of loading them a page at a time the way the Clients and Admins lists already do.

**Recommendation:** load this screen a page at a time (the same pattern already used for Clients and Admins), the same way we'd fix any list that's grown too large to load in one request. This is the actual root-cause fix, not just a threshold to relax. Worth prioritizing as a small backend/frontend task — it's a well-understood, standard fix, not a research problem — especially since this dataset will likely keep growing and the gap will only widen.

## What we don't have (and why that's OK for now)

We don't have 24/7 uptime monitoring (no "system was up 99.9% of the time this month" dashboard) — everything above comes from real, repeated test runs against the live app, run today. That's a different (and for a pre-launch/internal tool, arguably more useful) kind of evidence than uptime monitoring: it tells you *how fast things actually are*, not just *whether the server was reachable*. If/when this becomes customer-facing at scale, real uptime/APM monitoring would be the natural next investment.

## Questions this document is built to answer

- **"Is the app fast enough to ship?"** — Yes, every everyday action is fast, and the two heavy operations (report + PDF generation) are consistently within a generous, user-reasonable window.
- **"Is anything actually broken?"** — No. One backend behavior (Consult under rapid repeated use) is worth a look, but it's an edge case, not a defect a normal user hits.
- **"What should we watch as the app grows?"** — The ISIN securities list; it's already the single slowest screen in the app, has now measurably crossed our performance bar in one of two test runs, and has a known, standard fix (pagination) that would resolve it at the root cause.
