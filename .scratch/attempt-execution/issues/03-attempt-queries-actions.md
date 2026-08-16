# 03 — Attempt queries and actions

**Status:** done

**Blocked by:** 02 — Attempt core logic (pure modules).

## What to build

- `lib/attempts/queries.ts`:
  - `listAttemptableSchedulesForUser(userId)` — eligible schedules (v0.7 conditions) with window status, duration, question count, and per-schedule attempt state (open attempt id, submitted count, limit, last score).
  - `getAttemptForParticipant(attemptId, userId)` — attempt + answers + deadline state.
  - `listAttemptQuestions(attemptId)` — resolve `questionOrder` snapshot → question content + options.
  - `countParticipantAttempts(scheduleId, userId)`.
- `lib/attempts/actions.ts` (all untrusted-entry-point guarded: session, role `user`, `isUserEligibleForSchedule`, window open, ownership, not submitted, not expired):
  - `startAttemptAction(scheduleId)` — create attempt (deadline from resolved duration, question order snapshot); rejects when an open attempt exists or the limit is reached.
  - `saveAnswerAction(attemptId, questionId, answer)` — upsert; option id must belong to the question.
  - `submitAttemptAction(attemptId)` — lazy-finalize when expired; compute scores via v0.6 `scoring.ts`, store `autoScore` per answer and `attempt.score`.

## Definition of done

- Actions behave per spec; unit tests for pure gate helpers feeding the actions.
