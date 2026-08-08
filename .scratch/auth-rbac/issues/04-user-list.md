# 04 — User list page (read-only)

**What to build:** Admins and super-admins can visit `/dashboard/users` and see every account that exists. The list shows email, role, when they joined, whether they are banned, and an edit link. Regular users who try to open this page are redirected by the guard from ticket 02.

This is the starting point for all user-management flows — the place admins land before creating or editing.

**Blocked by:** 02 — needs the route guard so unauthorized visitors cannot reach the page.

**Status:** done

- [x] An admin visiting `/dashboard/users` sees a table listing all users, sorted by creation date (newest first).
- [x] Each row shows the user's email, role (rendered as "User", "Admin", or "Super Admin"), creation date, and banned status.
- [x] A banned user's row includes the ban reason if one exists.
- [x] Each row has an "Edit" link leading to the edit page for that user.
- [x] The table includes column headers and empty-state messaging when no users exist.
- [x] A regular user attempting to visit `/dashboard/users` is redirected to the forbidden page.
- [x] The page uses a server component fetching directly from the database, so it reflects the current state without a separate API route.

## Comments

Column headers are in Indonesian (Nama, Email, Role, Bergabung, Status, Aksi) to
match the surrounding UI, rather than the English used in the criteria above.

`components/ui/table.tsx` was added from the shadcn registry — the project had
no table primitive. No new dependency: the file is plain markup.

Three details worth recording:

- **Ordering has a secondary key.** Accounts created inside one transaction can
  share `createdAt` to the millisecond, and Postgres may return ties in any
  order, so the list would reshuffle between reloads. `listUsers` sorts by
  `createdAt DESC, id DESC` for a total order.
- **Dates are formatted in a pinned locale and timezone.** Left implicit,
  `Intl.DateTimeFormat` follows the server process timezone, so the same row
  could render a different date locally, in CI, and in production. Pinned to
  `en-GB` / UTC.
- **The edit link points at a route that does not exist yet.** Ticket 06 builds
  `/dashboard/users/[userId]/edit`; until then the link 404s. The E2E asserts
  the href shape rather than following it.

Empty-state messaging is implemented but not covered by E2E: asserting it would
mean deleting every account, which would break the rest of the suite. The branch
is small and visible in the page component.

`listUsers` has no unit test on purpose. It is a thin Drizzle wrapper, and
mocking the query builder would assert the mock rather than the query; the E2E
covers it against a real database.
