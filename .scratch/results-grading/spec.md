# Results & Manual Grading — Slice Spec

**Status:** done

## Problem Statement

Attempts store auto scores (single/scored) but manual questions are never graded, so results stay incomplete: the participant result page always shows "Menunggu penilaian manual", totals exclude manual questions, and admins have no way to grade or see results.

## Solution

Manual scores live on the answer row (`attempt_answer.manualScore`), graded by an admin through a dedicated workbench, with the attempt total recomputed transactionally on every grade: `attempt.score = Σ autoScore + Σ manualScore`. Pass/fail appears once every manual question of the attempt is graded. Admin-facing results: a work list of attempts needing grading, a per-schedule participant table, and a schedule hub with submitted counts, averages, and pass rates.

## User Stories

1. As an admin, I want a work list of submitted attempts with pending manual questions, so that grading is prioritized.
2. As an admin, I want to grade each manual answer with a score within the question's weight (0..`exam_question.score`, default 1), and clear a grade, so that grading is bounded and correctable.
3. As an admin, I want the attempt total and pass/fail to update as I grade, so that results are always current.
4. As an admin, I want a schedule hub and a per-schedule participant table, so that results are reviewable without opening each attempt.
5. As a participant, I want my result to show each graded manual question ("Nilai: X dari Y") and, once fully graded, my final total and LULUS/TIDAK LULUS.

## Implementation Decisions

- Schema 0010: `attempt_answer` gains `manualScore numeric(8,2)?`, `gradedBy text FK user?`, `gradedAt timestamp?`. No new tables.
- The grade is bounded by the question's weight: `exam_question.score` for the schedule's package, default `DEFAULT_POINTS` (1) — the weight ADR-0001/0008 and `lib/scoring/scoring.ts` reserved for this slice.
- `saveManualScoreAction` is the only grading mutation: MANAGEMENT tier guard, verifies the attempt is submitted and the question is `manual` and belongs to the attempt, then upserts the grade (or clears it with null) and recomputes `attempt.score` in the same transaction. Grading is editable; no finalization lock.
- Pass/fail uses the recomputed total against the package `passScore`; shown only when no manual question of the attempt is ungraded.
- Routes already reserved in permissions + sidebar: `/dashboard/manual-grading` (work list + `[attemptId]` workbench) and `/dashboard/exam-results` (hub + `[scheduleId]` per-schedule table). The workbench doubles as the read view.

## Out of Scope

Dedicated `/dashboard/reports/individual` and `/dashboard/reports/sessions` pages, CSV/Excel export, report deletion, grading locks/permission levels, scheduled auto-grading, attempt reset tooling.

## Further Notes

Released as v0.9.0. Ticket files: `.scratch/results-grading/issues/01-*.md` – `04-*.md`.
