# Attempt Execution — Slice Spec

**Status:** done

## Problem Statement

Participants can be granted eligibility (v0.7), but there is no participant-facing experience: no list of available exams, no way to take one, and no results. The v0.6 scoring module and the v0.7 eligibility gate exist but are unconsumed.

## Solution

A participant-facing `(exam)` route group: an exam list of attemptable schedules, an intro page, an attempt page (server-authoritative timer, per-type answer controls, autosave, submit), and a per-attempt result page with full review. Attempts are resumable server-side records; answers live in the database, the deadline is stored server-side, and a deadline that passes while the participant is away lazy-finalizes the attempt.

Attempt limits are configured per schedule: `exam_schedule.attemptLimit` where `NULL`/`0` means unlimited. Every attempt is always recorded, so the limit is enforced by counting rows and history stays auditable. One open attempt per (schedule, participant); starting while one is open resumes it; a fresh attempt is possible only after submit and only when under the limit.

## User Stories

1. As a participant, I want to see the exams I am eligible for, with their window, duration, and my attempt state, so that I know what I can take.
2. As a participant, I want to read the intro (duration, question count, pass score, attempts used) and start the exam.
3. As a participant, I want to answer single, scored, and manual questions, move between questions, and see my answers persist across reloads and disconnects.
4. As a participant, I want a countdown that matches the server deadline, and I want the attempt submitted automatically when time runs out.
5. As a participant, I want to submit and see my score, pass/fail, and a full per-question review ("belum dinilai" for manual questions).
6. As a participant, I want to resume an in-progress attempt, and start a new attempt only when allowed by the limit.
7. As an admin, I want to set an attempt limit per schedule (0 = unlimited), so that retakes are controlled.
8. As the future grading slice, I want per-answer auto scores stored at submit time, so that manual grading and reports can build on them.

## Implementation Decisions

- Schema 0009: `exam_schedule.attemptLimit` (int, nullable, 0/NULL = unlimited); `attempt` (scheduleId FK restrict, participantId FK cascade, startedAt, deadlineAt?, submittedAt?, questionOrder jsonb snapshot, score numeric?, no unique constraint — history by design); `attemptAnswer` (attemptId FK cascade, questionId FK restrict, answer jsonb, autoScore numeric? set at submit, UNIQUE(attemptId, questionId)). See ADR-0010.
- Duration resolution: `schedule.durationMinutes ?? package.durationMinutes`; `deadlineAt = startedAt + duration`; NULL duration = no deadline (manual submit only).
- Question order is snapshotted into `attempt.questionOrder` at start (seeded Fisher–Yates when `package.shuffle`, package order otherwise), so later package edits cannot change a running attempt.
- Answers: `chosenOptionId` for single/scored (validated to belong to the question), plain text (≤ 4000 chars) for manual. Upsert on change plus a debounced autosave; the deadline can finalize with whatever exists.
- Lazy finalization: any interaction on an in-progress attempt whose deadline passed first finalizes it (submits with stored answers, computes scores).
- Scoring on submit uses the v0.6 scoring module; per-question auto scores are stored on `attemptAnswer.autoScore` and the total on `attempt.score`. Pass/fail is shown only when no manual question is pending (v0.9 adds grading).
- All attempt actions re-verify session, role `user`, eligibility (`isUserEligibleForSchedule`), the window, ownership, submitted state, and the deadline.
- Question content is rendered server-side (`renderContentHtml` + sanitizer) with media keys resolved, and KaTeX typeset client-side.

## Out of Scope

Exam introduction editor (static default text), anti-cheat/activity tracking, attempt media (ADR-0007), admin attempt reset/retake tooling, manual grading UI and mixed pass/fail with pending manual questions (v0.9), result-visibility configuration.

## Further Notes

Released as v0.8.0. Ticket files: `.scratch/attempt-execution/issues/01-*.md` – `05-*.md`.
