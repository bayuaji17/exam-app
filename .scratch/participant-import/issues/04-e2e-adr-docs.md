# 04 — E2E, ADR, and documentation

**Status:** done

**Blocked by:** 03 — Import page UI.

## What to build

- E2E `participant-import.spec.ts` (+ fixture helpers + teardown wiring): template download; valid file → accounts + group membership + history row; one invalid row blocks the import (button disabled, errors listed); duplicate email blocks; `user` role blocked; wrong-type/oversize rejection.
- ADR-0012: all-or-nothing bulk import, dedupe-by-email, generated credentials, two-phase confirm, audit record.
- CONTEXT.md: *Import* term; DATABASE.md + AGENT_CONTEXT.md updates.

## Definition of done

- Full E2E suite green against a production build; docs consistent.
