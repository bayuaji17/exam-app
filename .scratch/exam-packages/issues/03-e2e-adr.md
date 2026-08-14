# 03 — E2E coverage and eligibility ADR

**What to build:** The slice's E2E suite and documentation: full-flow specs (CRUD, composition, eligibility, ordering, deletion), the seeded-packages fixture with teardown integration, and ADR-0008 recording the explicit ordered-composition decision.

**Blocked by:** 02 — Composition and selection.

**Status:** done

- [x] exam-packages.spec.ts: 7 tests, parallel-safe
- [x] Fixture + teardown ordering (packages → questions → banks → categories → media)
- [x] ADR-0008
- [x] Gate: 225 unit, 118 E2E ×2 consecutive clean; released v0.4.0
