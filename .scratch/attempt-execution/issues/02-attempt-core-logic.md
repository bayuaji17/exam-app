# 02 — Attempt core logic (pure modules)

**Status:** done

**Blocked by:** 01 — Schema and attempt-limit configuration.

## What to build

- `lib/attempts/order.ts` — seeded Fisher–Yates (`shuffleOrder(ids, seed)`); `buildQuestionOrder(ids, shuffle, seed?)` (shuffle ? shuffled : as-is).
- `lib/attempts/timer.ts` — `resolveDuration(scheduleMinutes, packageMinutes)`, `deadlineFor(startedAt, duration)`, `isExpired(deadline, now)`.
- `lib/attempts/limits.ts` — `attemptsRemaining(limit, count)` (0/NULL → Infinity), `canStartAttempt(limit, count, openAttemptId)`.
- `lib/attempts/validation.ts` — answer payload schemas: single/scored `{ chosenOptionId: string | null }`, manual `{ text: string }` ≤ 4000; `validateAnswerForType`.
- Unit tests covering all pure functions (seeded determinism, set preservation, boundary cases).

## Definition of done

- Pure modules unit-tested and green.
