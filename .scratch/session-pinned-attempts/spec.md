# Spec: Session-Pinned Exam Attempts, Exam Tokens & Single-Active Exam Invariant

**Status:** ready-for-agent

## Problem Statement

Currently, participants can access open exam attempts concurrently from multiple devices or browser sessions, opening severe cheating vectors. Furthermore, participants can potentially open multiple exam attempts across different schedules at the same time, and exam schedules lack a proctored access gate (token) or a synchronized waiting room before the official start time.

## Solution

A multi-layered examination security subsystem providing:
1. **Exam Session Tokens:** Administrator-configured or auto-generated 6-character access tokens on `exam_schedule`, rate-limited on verification against brute-force attacks (5 failed attempts/min per student, 60s cooldown) and expiring strictly at `endsAt`.
2. **Waiting Room & Live Countdown:** A staging interface on `/exam/[slug]` displaying instructions, inline token entry and validation, and a live countdown to `startsAt`.
3. **Session Pinning & Logout Guard:** Open attempts are pinned to the active login session (`startedSessionId`). Foreign active sessions are blocked across all surfaces (*"Sedang Dikerjakan di Perangkat Lain"*). Mid-exam explicit sign-out is disabled in the UI while an attempt is open (`submittedAt IS NULL`), with blocked attempts logged.
4. **Audited Session Recovery Protocol (Takeover):** Legitimate crash recovery on a new device requires re-verifying against the **current active `exam_schedule.token`** (rate-limited), explicit confirmation, atomic force-revocation of the previous session, and structured audit logging (`attempt_session_transfer`).
5. **Database-Enforced Single Active Exam Invariant:** A PostgreSQL partial unique index on `attempt(participantId)` `WHERE "submittedAt" IS NULL` preventing concurrent active attempts across any schedules, with Postgres `23505` translation and lazy pre-cleanup of expired attempts.
6. **Hard End-Time Clamping & Audit Submissions:** `deadlineAt` clamped to `min(startedAt + durationMinutes, endsAt)`, `submissionType` (`participant` | `system`) tracked on `attempt`, pre-write deadline validation in `saveAttemptAnswerAction`, and dual lazy + periodic sweep finalization.

## User Stories

1. As an Exam Administrator, I want each exam schedule to have an access token, so that I can control entry into the exam room.
2. As an Exam Administrator, I want to regenerate an exam token if leaked, without interrupting students who have already started.
3. As a Student, I want to enter the waiting room before the exam starts, enter my token, and see a live countdown to start time.
4. As a Student, I want the "Mulai Ujian" button to activate automatically at start time once my token is verified.
5. As a Student, I want to reload my browser or recover from a network glitch on the same device without losing my attempt or re-entering my token.
6. As a Student whose device crashed, I want to recover my open attempt by re-entering the room's current session token and confirming takeover, without waiting for the old session TTL to expire.
7. As a System Proctor, I want participants blocked from opening an ongoing exam on a secondary device, hopping devices by signing out, or opening two exams simultaneously.
8. As an Auditor / Grader, I want a complete forensic audit log of all session takeovers and to see whether an attempt was submitted manually by the student or auto-finalized by the system upon deadline.

## Implementation Decisions

- **Schema:**
  - `exam_schedule.token`: varchar/text (6 chars uppercase, default auto-generated).
  - `attempt.startedSessionId`: text referencing Better Auth `session.id`.
  - `attempt.submissionType`: text (`participant` | `system`).
  - `attempt_session_transfer`: table tracking `{ id, attemptId, participantId, previousSessionId, newSessionId, ipAddress, userAgent, transferredAt, reason }`.
  - Partial Unique Index: `attempt_participant_open_uidx` on `attempt(participantId)` `WHERE "submittedAt" IS NULL`.
- **Token Verification:** Server action with sliding window rate limiting per `(participantId, scheduleId)`.
- **Session Verification & Recovery:** Checked across `/exam`, `/exam/[slug]`, `/exam/[slug]/attempt`, and attempt actions. Takeovers force-revoke the old session atomically.
- **Deadline:** Clamped to `endsAt`; `saveAttemptAnswerAction` validates time before writing.
- **Sweeper:** `sweepExpiredAttempts()` helper for periodic cleanup.
