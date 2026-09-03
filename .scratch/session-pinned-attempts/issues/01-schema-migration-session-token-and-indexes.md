# 01 — Schema & Migration: Session Token, Started Session ID, and Partial Unique Index

**What to build:**
1. Add `token` (varchar/text, nullable or default 6-char generator) to `exam_schedule`.
2. Add `startedSessionId` (text, nullable) and `submissionType` (text, nullable with values `'participant' | 'system'`) to `attempt`.
3. Add PostgreSQL partial unique index on `attempt`:
   ```ts
   uniqueIndex("attempt_participant_open_uidx")
     .on(table.participantId)
     .where(sql`"submittedAt" IS NULL`)
   ```
4. Generate and verify the Drizzle migration.

**Blocked by:** None

**Status:** done

- [x] Add columns to `lib/db/schema.ts`.
- [x] Add partial unique index for single active attempt constraint.
- [x] Run `pnpm run db:generate`.
- [x] Add unit tests verifying schema definitions and constraints.
