# 05 — Tests, ADR, and documentation

**Status:** done

**Blocked by:** 04 — (exam) routes and components.

## What to build

- E2E (`attempts.spec.ts` + `seeded-attempts.ts` fixture + teardown wiring): happy path (intro → start → answer single/scored/manual → reload resumes → submit → review), limit=1 blocks second start, limit=0 allows retake, ineligible blocked, window-closed blocked, expired deadline (DB-manipulated) auto-finalizes, admin limit field.
- ADR-0010: resumable server-authoritative attempts; attempt-limit semantics (0 = unlimited, counting by rows); one open attempt; per-attempt results; lazy finalization.
- CONTEXT.md: promote *Attempt* from future domains; add *Attempt Limit*, *Deadline*, *Open Attempt*. DATABASE.md and AGENT_CONTEXT.md updates.

## Definition of done

- Full E2E suite green against a production build; docs consistent.
