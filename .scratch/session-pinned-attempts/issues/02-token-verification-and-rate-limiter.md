# 02 — Token Generation, Verification & Sliding Window Rate-Limiter

**What to build:**
1. A token generation helper (6-character uppercase alphanumeric e.g. `generateExamToken()`).
2. A rate-limiter helper (`validateTokenAttemptRate(participantId, scheduleId)`) enforcing max 5 failed attempts per minute with a 60-second cooldown window.
3. Server Action `verifyExamScheduleTokenAction({ scheduleId, token })`:
   - Validates user eligibility.
   - Enforces rate-limiting on failed attempts.
   - Verifies against `exam_schedule.token` and checks `now() < endsAt`.
4. Token regeneration action in schedule management (`regenerateScheduleTokenAction`) with audit logging.

**Blocked by:** 01 — Schema & Migration

**Status:** done

- [x] Implement `generateExamToken()` and token validator.
- [x] Implement sliding window rate-limiter for failed token submissions.
- [x] Implement `verifyExamScheduleTokenAction` server action.
- [x] Implement `regenerateScheduleTokenAction` with audit logging.
- [x] Unit tests for token generation, validation, brute-force lockout, and regeneration.
