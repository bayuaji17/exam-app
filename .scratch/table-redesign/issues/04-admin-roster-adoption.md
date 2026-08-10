# 04 — Admin roster adoption

**What to build:** `/dashboard/admins` gets the same treatment: toolbar, role filter (admin vs super-admin), sortable columns, pagination, driven by the same URL params. The promote and demote dialogs keep working.

**Blocked by:** 03 — follows the proven pattern and its E2E conventions.

**Status:** done

- [x] The roster page uses the shared pattern: server component, paginated roster query, toolbar, sortable headers, pagination.
- [x] The role filter narrows the roster to admins only or super-admins only.
- [x] Search narrows the roster by name or email.
- [x] The promote button sits in the toolbar area and the promote/demote dialogs keep working: after a promotion, the promoted user appears in the roster without a full reload.
- [x] Super-admin rows still show "Tidak dapat diturunkan" and cannot be demoted.
- [x] Admins and regular users are still redirected to the forbidden page.
- [x] E2E covers search, filter, sort, and pagination on the roster, plus the promote flow through the new toolbar.
- [x] The existing `admin-roster.spec.ts` assertions are updated to the new table.

## Comments

The roster table keeps its promote/demote dialogs as client components, while
the page, query, toolbar, sortable headers, and pagination remain server-driven.
The promote assertion searches for the promoted account after mutation so it
remains deterministic when parallel tests have seeded enough rows to create
multiple pages.
