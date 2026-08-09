# 02 — Shared data-table components

**What to build:** The composable pieces every admin table renders: a toolbar with debounced search and filter selects, sortable column headers that link to updated params, and a pagination bar rendered entirely from links. No page consumes them yet — that is the next ticket — so they are built against fixtures and proven by unit tests where pure and by composition in the next ticket.

**Blocked by:** 01 — the components render from the parsed parameters.

**Status:** ready-for-agent

- [ ] The toolbar is the only client component: a debounced search input (~300 ms), role and status selects, and a reset control that clears every parameter.
- [ ] Toolbar changes push updated params in a transition, and the table visibly dims while the request is in flight.
- [ ] Changing search or any filter resets the page parameter to 1.
- [ ] Sortable headers are server-rendered links that flip the sort direction for their column and show an arrow for the active direction.
- [ ] The pagination bar is server-rendered links: previous, next, numbered pages, and a page-size selector (10/25/50). No client JavaScript.
- [ ] Pagination hides itself when there is only one page of results.
- [ ] The empty state distinguishes "no data at all" from "nothing matched these filters".
- [ ] All text is Indonesian and uses theme tokens, consistent with the existing pages.
