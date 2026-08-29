# 03 — Session Pinning Guard, Audited Takeover Protocol & Single Active Exam Invariant

**What to build:**
1. Helper `verifyAttemptSession(attemptId, currentSessionId)`:
   - Returns `{ ok: true }` if `attempt.startedSessionId === currentSessionId` (same-device reload).
   - If mismatch, returns `{ ok: false, reason: "SESSION_LOCKED", canRecover: true }`.
2. Server Action `recoverAttemptSessionAction({ attemptId, scheduleId, token })`:
   - Validates the token against the **current active `exam_schedule.token`** through the rate-limited tracker.
   - Executes inside a transaction with `SELECT ... FOR UPDATE` on the attempt row.
   - Force-revokes/deletes the previous session from the `session` table in Better Auth.
   - Atomically updates `attempt.startedSessionId = currentSession.id`.
   - Inserts a record into `attempt_session_transfer` audit table `{ attemptId, participantId, previousSessionId, newSessionId, ipAddress, userAgent, transferredAt, reason: "crash_recovery_token_reverified" }`.
3. Logout Guard:
   - UI disables/blocks explicit logout if participant has an open attempt (`submittedAt IS NULL`), logging blocked attempts.
4. Update `startAttemptAction`:
   - Lazily sweeps any expired-but-unswept open attempts for the student before checking active attempts.
   - Sets `startedSessionId = currentSession.id`.
   - Catches PostgreSQL `23505` `unique_violation` (partial unique index) and maps to friendly error: *"Anda memiliki sesi ujian aktif yang belum selesai."*

**Blocked by:** 01 — Schema & Migration, 02 — Token Verification

**Status:** done

- [x] Implement `verifyAttemptSession` and logout guard.
- [x] Implement `recoverAttemptSessionAction` with atomic update, force-revocation, and audit logging.
- [x] Update `startAttemptAction` with lazy pre-cleanup, session assignment, and 23505 handling.
- [x] Guard attempt queries and answer/submit actions against session mismatch.
- [x] Unit tests for same-session resume, foreign device lockout, audited recovery takeover, and single active exam race protection.
