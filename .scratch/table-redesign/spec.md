# Table Redesign — Admin Dashboards

## Problem Statement

The admin dashboard tables at `/dashboard/users` and `/dashboard/admins` render every row with no pagination, no search, no filtering, and no sorting. As accounts accumulate, the pages become long, unscannable walls of data. Admins cannot find a specific user without scrolling, cannot narrow the list to a role or ban status, and cannot sort by anything but the hardcoded newest-first order.

The two pages also render their tables differently from one another — one is a server component with an inline table, the other a client component — so there is no shared structure to reuse as more dashboard tables arrive (question banks, exams, sessions, and the other routes the sidebar already declares).

## Solution

Introduce a shared data-table pattern and apply it to both admin tables. Every control — search, filter, sort, page, page size — maps to a query parameter that the server reads. The URL is the state: refresh keeps the view, links are shareable, browser back works.

The pattern splits into three layers: a pure module that parses and validates the URL parameters, paginated query functions that translate parameters into Drizzle, and a small set of composable components (toolbar, sortable headers, pagination) that render from the same parameters.

## User Stories

1. As an **admin**, I want to search users by name or email, so I can find one account without scrolling.
2. As an **admin**, I want to filter the user list by role, so I can see only admins or only regular users.
3. As an **admin**, I want to filter by ban status, so I can see which accounts are blocked.
4. As an **admin**, I want to sort by name, email, or join date, so I can view the list in the order I need.
5. As an **admin**, I want the list paginated, so the page stays fast and scannable as accounts grow.
6. As an **admin**, I want to choose how many rows appear per page, so I can see more at once when I need to.
7. As an **admin**, I want my search and filters to survive a page refresh, so I can share a filtered view with someone else.
8. As an **admin**, I want changing a filter to return me to the first page, so I never land on an empty later page by accident.
9. As an **admin**, I want a clear message when a search or filter matches nothing, distinct from the message shown when the system has no users at all.
10. As a **super-admin**, I want the same search, filter, sort, and pagination on the admin roster, so the admin list behaves like every other management table.
11. As a **developer**, I want the table pattern to be reusable, so the next management page gets search, filter, sort, and pagination without re-solving them.

## Implementation Decisions

### URL as state

Every control maps to a query parameter: `q` (search), `role`, `status`, `sort`, `order`, `page`, `size`. The server component reads them via `searchParams` (awaited, per Next 16). Unknown or out-of-range values fall back to defaults — an unknown role is treated as absent, a negative page becomes 1, a size outside the allowed set becomes the default.

### Parameter module

A pure module (`lib/users/table-params.ts`) owns parsing, validation, and serialization:

- `parseTableParams(searchParams)` → a validated `TableParams` object
- `buildTableUrl(base, params)` → a query string for links
- Allowed page sizes: 10, 25, 50 — default 10
- Sortable columns: `name`, `email`, `createdAt` — default `createdAt` descending
- Sort cycle: a header click flips `asc ↔ desc` on the same column

The module is free of React and Drizzle so it can be unit tested in isolation.

### Paginated queries

Two functions in `lib/users/queries.ts`:

- `listUsersPage(params)` — searches `name` and `email` with `ilike` (case-insensitive, contains), filters by role and banned status, orders by a whitelisted column map, and returns `{ items, total, page, pageSize, totalPages }`. A `count(*)` query supplies the total. The `id desc` tiebreaker from the existing list is kept.
- `listAdminRosterPage(params)` — same shape, restricted to `admin` and `super-admin` roles.

### Component composition

Three pieces under `components/data-table/`:

- **Toolbar** (`data-table-toolbar.tsx`, client) — the only client component. Debounced search input (~300 ms), role and status Selects, a reset button. Each change pushes new params inside `useTransition`; `isPending` dims the table during the server round-trip.
- **Pagination** (`data-table-pagination.tsx`, server) — previous/next, numbered pages, and a page-size select rendered as Links whose hrefs carry the updated params. No client JavaScript.
- **Sortable headers** — server-rendered Links that toggle the sort order for their column. Arrow indicators (▲/▼) show current direction.

Sort and pagination need no client JavaScript: they are Links. The toolbar alone hydrates.

### Pages

Both pages become async server components that parse params, run the query, and compose the pattern:

- `/dashboard/users` — full treatment: search, role filter, status filter, sortable columns, pagination.
- `/dashboard/admins` — full treatment on the roster. It is small today; the point is the shared pattern, not the row count.

### UX details

- Changing search, a filter, or the sort resets `page` to 1.
- Empty states distinguish "Belum ada pengguna terdaftar." (no data at all) from "Tidak ada hasil untuk filter ini." (filters matched nothing).
- The table dims while a navigation is in flight.
- Indonesian UI text, theme tokens only, consistent with the existing pages.
- The per-user sessions page (`/dashboard/settings/sessions`) is unchanged; the pattern exists for it to adopt later.

## Testing Decisions

### What makes a good test

Public interfaces, not internals. For this feature the public interfaces are: a URL with parameters in, a rendered page out; and the pure parameter parsing in isolation.

### Which modules are tested

**Unit tests** — `lib/users/table-params.ts`: parsing garbage URLs (negative page, unknown role, oversized page number, out-of-range size), round-tripping through the URL builder, sort cycling. `lib/users/queries.ts` stays untested at the unit level per the established policy — it is a thin Drizzle wrapper the E2E covers against a real database.

**E2E tests** — `__test__/e2e/users-table.spec.ts` and updates to `admin-roster.spec.ts`:

- Search narrows the list to the matching email
- Role filter shows only that role; status filter shows only banned
- Sort header click reorders (join date newest ↔ oldest)
- Pagination: with more rows than the page size, page 2 shows the remainder; page size change re-paginates
- A filter change resets to page 1
- Combined parameters survive in the URL
- Admin roster gets the same treatment
- Existing users/roster flows (create, edit, promote, demote, ban) keep working through the new tables

### Prior art

Existing E2E patterns: `signInAsRole` storage-state reuse, `seedTargetUser` for test victims, `globalTeardown` cleanup, hydration-safe interaction helpers. The new tests follow them.

## Out of Scope

1. **The sessions page** (`/dashboard/settings/sessions`) — per-user self-service, unchanged.
2. **Column visibility toggles, column reordering, saved filter presets** — none requested.
3. **Server actions or API routes** — pages read directly from the database, per the existing pattern.
4. **Adopting the pattern on future tables** — question banks, exams, and the other sidebar routes get the pattern when those pages are built, not here.
5. **Server-driven search suggestions or autocomplete** — debounced input only.

## Further Notes

### Why URL parameters rather than client state

Client-side filtering is instant but loads every row into the browser and loses state on refresh. This app's data will grow — the user list already accumulates test accounts across runs — and the sidebar declares many more tables. Server-side keeps every page fast regardless of size, and the URL being the state gives shareable filtered views for free. The tradeoff — a server round-trip per interaction — is softened by the transition indicator.

### Why the toolbar is the only client component

Every other control (sort, pagination, page size) is a Link with params in the href: no hydration cost, no client state, no drift between the URL and the UI. Only the debounced input genuinely needs client code — debounce does not exist in plain HTML.

### Seeding volume for pagination tests

The pagination E2E needs more than one page of rows. The fixtures gain a `seedManyUsers(count)` helper that inserts regular users in one batch; `globalTeardown` already removes anything prefixed `e2e-created-`.
