# Session-pinned exam attempts, exam session tokens, and the single active exam invariant

## Context

In an online examination platform, security and fairness require strict guarantees:
1. A participant must not access an ongoing attempt concurrently from multiple devices or browser sessions (e.g., answering questions on a desktop while researching on a smartphone).
2. A participant must not deliberately hop between devices mid-exam (e.g., by logging out and logging in on another device).
3. A participant must not juggle or run multiple active exam attempts across different schedules simultaneously.
4. Proctors require an access gate (session token) to control when students may unlock an exam, with a synchronized waiting room and countdown to the official start time.
5. Attempt durations must never exceed the scheduled exam window (`endsAt`), and post-deadline answer modifications must be strictly rejected.

## Decisions

### 1. Exam Session Token & Rate-Limiting
- We add an administrator-configurable, auto-generated alphanumeric `token` (default 6 characters, uppercase) to `exam_schedule`.
- Token verification happens via a dedicated server action before starting the exam.
- **Brute-force Protection:** Token verification is rate-limited server-side (maximum 5 failed attempts per participant per schedule within a 1-minute sliding window; exceeding this triggers a 60-second cooldown).
- **Regeneration Behavior:** If an administrator regenerates a compromised token, already-started in-progress attempts remain active; only new entrants must use the new token. Regeneration events are recorded in the audit trail.
- **Expiration:** The token expires automatically and becomes unusable when `now() >= endsAt`.

### 2. Session Pinning, Logout Guard & Audited Takeover Protocol
- We add `startedSessionId` to the `attempt` table, storing the Better Auth `session.id` of the session that created the attempt.
- **Enforcement Surface:** Mismatching active sessions are blocked across all surfaces:
  - `/exam`: schedule action displays a locked badge (*"Sedang Dikerjakan di Perangkat Lain"*).
  - `/exam/[slug]`: start button is disabled with a locked session callout.
  - `/exam/[slug]/attempt`: attempt runner blocks question rendering and displays a locked device screen.
  - Server Actions (`startAttemptAction`, `saveAttemptAnswerAction`, `submitAttemptAction`): reject with `SESSION_LOCKED` error.
- **Same-Device Reloads:** Refreshing the page or navigating on the same session matches `startedSessionId` and resumes seamlessly without re-verification.
- **Mid-Exam Logout Guard:** The application UI disables and blocks explicit "Keluar / Sign Out" while an attempt is open (`submittedAt IS NULL`), logging blocked attempts.
- **Session Recovery Protocol (Crash Recovery):**
  If a student's session is lost due to a crash, power loss, or cookie wipe, the student logs in and enters the recovery screen on `/exam/[slug]`. To resume, the student must:
  1. Re-enter the **current active `exam_schedule.token`** (proving physical presence in the room, even if regenerated). Failed token attempts flow through the same 5-attempt/min rate-limiter.
  2. Explicitly confirm device takeover (*"Pindahkan Sesi Ujian ke Perangkat Ini"*).
- **Atomic Takeover & Force-Revocation:**
  The takeover runs inside a transaction with `SELECT ... FOR UPDATE` on the attempt row. Successful re-verification force-revokes/deletes the old session from the auth database and updates `attempt.startedSessionId = currentSession.id`. If a concurrent takeover race occurs, it rolls back with `TAKEOVER_CONFLICT`.
- **Takeover Forensics & Audit Log:**
  Every takeover writes an audit record capturing `{ attemptId, participantId, previousSessionId, newSessionId, ipAddress, userAgent, transferredAt, reason }` for administrative dispute resolution.

### 3. Active Exam Invariant (Database-Enforced)
- We enforce that a participant can hold at most **one open attempt globally** across all schedules via a PostgreSQL partial unique index:
  ```sql
  CREATE UNIQUE INDEX "attempt_participant_open_uidx" 
  ON "attempt" ("participantId") 
  WHERE "submittedAt" IS NULL;
  ```
- `startAttemptAction` takes a transactional `SELECT ... FOR UPDATE` lock and lazily finalizes any expired-but-unswept attempts for that participant before evaluating open attempts.
- If a race condition occurs, the application catches Postgres `23505` (`unique_violation`) and returns a friendly error (*"Anda memiliki sesi ujian aktif yang belum selesai"*).

### 4. Hard End-Time Clamping & Submission Type
- Server-authoritative `deadlineAt` is clamped to the schedule boundary: `deadlineAt = min(startedAt + durationMinutes, endsAt)`.
- We add `submissionType` (`participant` | `system`) to `attempt` to distinguish manual submissions from auto-finalized deadline expirations during grading reviews.
- **Save Ordering Guard:** `saveAttemptAnswerAction` checks `now() >= deadlineAt || now() >= endsAt` *before* writing to `attempt_answer`. If expired, it rejects the write and finalizes the attempt.
- **Dual Finalization:** In-flight queries and actions lazily finalize expired attempts, supplemented by a `sweepExpiredAttempts()` helper for periodic sweeps of abandoned attempts.

### 5. Waiting Room & Live Countdown
- `/exam/[slug]` acts as the waiting room prior to `startsAt`.
- Participants can view instructions and enter the session token in advance.
- The "Mulai Ujian" button remains disabled with a live countdown timer until `startsAt` is reached and a valid token is entered.
