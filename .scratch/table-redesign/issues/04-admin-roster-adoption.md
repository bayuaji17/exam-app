# 04 — Admin roster adoption

**What to build:** `/dashboard/admins` gets the same treatment: toolbar, role filter (admin vs super-admin), sortable columns, pagination, driven by the same URL params. The promote and demote dialogs keep working.

**Blocked by:** 03 — follows the proven pattern and its E2E conventions.

**Status:** ready-for-agent

- [ ] The roster page uses the shared pattern: server component, paginated roster query, toolbar, sortable headers, pagination.
- [ ] The role filter narrows the roster to admins only or super-admins only.
- [ ] Search narrows the roster by name or email.
- [ ] The promote button sits in the toolbar area and the promote/demote dialogs keep working: after a promotion, the promoted user appears in the roster without a full reload.
- [ ] Super-admin rows still show "Tidak dapat diturunkan" and cannot be demoted.
- [ ] Admins and regular users are still redirected to the forbidden page.
- [ ] E2E covers search, filter, sort, and pagination on the roster, plus the promote flow through the new toolbar.
- [ ] The existing `admin-roster.spec.ts` assertions are updated to the new table.
