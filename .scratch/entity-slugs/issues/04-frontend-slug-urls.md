# 04 — Frontend slug URLs

**What to build:** the user-facing side. All detail/edit/nested links, breadcrumbs, and
navigation for the four entities use the slug instead of the id; detail pages read the slug
route param and resolve through the by-slug contract (against the mock while the backend
lands). Legacy id-based URLs redirect (or friendly-404) to the slug URL. No `[entity]Id`
remains in any user-facing URL for the four slugged entities.

**Blocked by:** 02 — Schema & migration: unique slug columns
*(develops in parallel with 03 — Backend resolution by slug, against the contract + mock)*

**Status:** ready-for-agent

- [x] Detail, edit, and nested routes for all four entities are slug-based
      (`question-banks/[slug]`, `user-groups/[slug]`, `exam-schedules/[slug]/*`,
      `exams/[slug]`, `exam-introductions/[slug]`, `exam-results/[slug]`, public `exam/[slug]`).
- [x] Detail pages resolve the slug param via the by-slug contract and render the entity.
- [x] Links, `router.push`, and breadcrumbs carry the slug, not the id.
- [x] Old id-URLs redirect to the slug URL (or a friendly not-found).
- [x] Existing E2E specs updated to drive slug URLs.
