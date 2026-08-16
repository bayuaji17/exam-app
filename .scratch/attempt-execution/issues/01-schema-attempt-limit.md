# 01 — Schema and attempt-limit configuration

**Status:** done

**Blocked by:** None — can start immediately.

## What to build

- Schema 0009: `exam_schedule.attemptLimit` (int, nullable), `attempt` (scheduleId FK restrict, participantId FK cascade, startedAt, deadlineAt?, submittedAt?, questionOrder jsonb, score numeric?, createdAt, updatedAt, idx(scheduleId, participantId), no unique), `attemptAnswer` (attemptId FK cascade, questionId FK restrict, answer jsonb, autoScore numeric?, updatedAt, UNIQUE(attemptId, questionId)); generate + run migration.
- `examScheduleSchema` + form: `attemptLimit` (empty/NULL = tak terbatas, 0 = tak terbatas, positive = max); schedule list shows the limit.
- Unit tests for the schema's optional-int parsing.

## Definition of done

- Migration applied; admin can set/clear the attempt limit on a schedule; schedule delete blocked once attempts exist (friendly message).
