# 02 — Composition and selection

**What to build:** An admin composes a package: a detail page with the ordered question list (move up/down, remove, terminal delete with confirmation) and a selection screen browsing eligible questions (active questions in active banks) per bank, with local category/type/search filters, add-with-duplicate-marking, and the added set seeded from the existing composition.

**Blocked by:** 01 — Package list, create, and edit.

**Status:** done

- [x] Detail page: ordered list, move up/down (transactional swap), remove, delete with dialog
- [x] Selection screen: bank browser, eligible-only (query-level + server re-check), filters, duplicate marking
- [x] E2E: eligible-only selection, add order, duplicate blocked, removal, reorder, package delete keeps questions
