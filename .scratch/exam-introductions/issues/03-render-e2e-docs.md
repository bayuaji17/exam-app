# 03 — Participant rendering, E2E, and docs

**Status:** done

**Blocked by:** 02 — Editor and admin management.

## What to build

- `IntroductionRenderer` (server render + sanitize) and the intro page fallback logic.
- E2E `exam-introductions.spec.ts`: admin writes intro → participant sees it; empty → default; edit updates; `user` blocked from the management page.
- ADR-0013, glossary *Introduction*, DATABASE.md, AGENT_CONTEXT.md.

## Definition of done

- Full E2E suite green against a production build; docs consistent.
