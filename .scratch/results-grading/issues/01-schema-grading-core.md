# 01 — Schema and grading core

**Status:** done

**Blocked by:** None — can start immediately.

## What to build

- Schema 0010: `attempt_answer` + `manualScore numeric(8,2)?`, `gradedBy text FK user?`, `gradedAt timestamp?`; generate + run migration.
- `lib/grading/validation.ts`: grade schema (finite, `0 ≤ score ≤ weight`, 2dp), weight resolution (`exam_question.score` ?? 1).
- `lib/grading/actions.ts`: `saveManualScoreAction(attemptId, questionId, score | null)` — MANAGEMENT guard; attempt submitted; question manual + belongs to attempt; bounded; transactional upsert (manualScore, gradedBy, gradedAt) + recompute `attempt.score` (Σ auto + Σ manual).
- Unit tests: bounds, default weight, null clears, recompute.

## Definition of done

- Migration applied; grading a question updates the total; clearing restores the auto-only total.
