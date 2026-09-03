# 04 — Deadline Clamping, Pre-Write Ordering Guard & Dual Finalization

**What to build:**
1. Deadline computation clamping:
   `deadlineAt = min(startedAt + durationMinutes, endsAt)`.
2. Pre-write deadline race guard in `saveAttemptAnswerAction`:
   - Checks `now() >= deadlineAt || now() >= endsAt` *before* modifying `attempt_answer`.
   - If expired, rejects answer write, executes finalization, and sets `submissionType = 'system'`.
3. Update manual submission to set `submissionType = 'participant'`.
4. Implement `sweepExpiredAttempts()` utility function for background cron / sweep of abandoned expired attempts.

**Blocked by:** 01 — Schema & Migration

**Status:** done

- [x] Clamp `deadlineAt` to `endsAt`.
- [x] Implement pre-write deadline check in `saveAttemptAnswerAction`.
- [x] Populate `submissionType` as `'participant'` or `'system'` on finalization.
- [x] Implement `sweepExpiredAttempts()` helper.
- [x] Unit tests for deadline clamping, answer write rejection on expiration, and sweep finalization.
