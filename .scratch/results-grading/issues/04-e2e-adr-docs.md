# 04 — E2E, ADR, and documentation

**Status:** done

**Blocked by:** 03 — Admin UI and participant result.

## What to build

- E2E `grading.spec.ts` (+ fixture helpers): admin sees pending attempts; grades a manual answer → participant result shows "Nilai: X dari Y" + final total + LULUS/TIDAK LULUS; partial grading keeps "Menunggu"; regrade updates the total; weight default when unset; `user` blocked from `/dashboard/manual-grading`; hub + per-schedule tables; teardown wiring.
- ADR-0011: manual grading as per-answer scores on the attempt (editable, weight-bounded, total recomputed).
- CONTEXT.md: add *Manual Grade* term; DATABASE.md + AGENT_CONTEXT.md updates.

## Definition of done

- Full E2E suite green against a production build; docs consistent.
