# 02 — Grading and results queries

**Status:** done

**Blocked by:** 01 — Schema and grading core.

## What to build

`lib/grading/queries.ts`:
- `listUngradedAttemptsPage(params)` — submitted attempts with ≥1 ungraded manual question (search by schedule/participant, paginated, pending count).
- `listScheduleResultsPage(scheduleId, params)` — per-schedule participant table: participant, attempts, latest score, fully-graded status, pass.
- `listResultsHubs()` — schedule hub: submitted count, average score, pass rate, pending-grading count.
- `getAttemptForGrading(attemptId)` — full review: questions, answers, autoScore, manualScore, weight, grader.

## Definition of done

- Queries feed all three admin pages; counts correct under partial grading.
