# 03 — Users table adoption

**What to build:** `/dashboard/users` becomes a full data table: toolbar with search, role and status filters, sortable columns, and pagination, all driven by URL parameters. The existing list content — columns, labels, edit links, create button — stays.

**Blocked by:** 02 — needs the shared components.

**Status:** done

- [x] The page reads params server-side, runs the paginated query, and renders the toolbar, sortable headers, rows, and pagination bar.
- [x] Searching by email or name narrows the list after the debounce without pressing enter.
- [x] The role filter shows only that role; the status filter shows only banned or only active accounts.
- [x] Sort headers reorder rows; the join-date default is newest first.
- [x] With more rows than the page size, page 2 shows the remainder; changing page size re-paginates.
- [x] A filter change while on page 2 returns to page 1 rather than an empty later page.
- [x] A URL with combined params (`?q=...&role=...&page=...`) renders exactly that view on load.
- [x] A regular user visiting the page is still redirected to the forbidden page.
- [x] The existing create flow keeps working from the new table.
- [x] E2E covers each behavior; the existing `user-list.spec.ts` assertions are updated to the new table.

## Comments

The page-size selector lives in the pagination bar as server-rendered links,
while search and filters live in the client toolbar. Sort headers are links as
well, so only the debounced toolbar needs client JavaScript.
