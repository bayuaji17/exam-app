# 04 — User list page (read-only)

**What to build:** Admins and super-admins can visit `/dashboard/users` and see every account that exists. The list shows email, role, when they joined, whether they are banned, and an edit link. Regular users who try to open this page are redirected by the guard from ticket 02.

This is the starting point for all user-management flows — the place admins land before creating or editing.

**Blocked by:** 02 — needs the route guard so unauthorized visitors cannot reach the page.

**Status:** ready-for-agent

- [ ] An admin visiting `/dashboard/users` sees a table listing all users, sorted by creation date (newest first).
- [ ] Each row shows the user's email, role (rendered as "User", "Admin", or "Super Admin"), creation date, and banned status.
- [ ] A banned user's row includes the ban reason if one exists.
- [ ] Each row has an "Edit" link leading to the edit page for that user.
- [ ] The table includes column headers and empty-state messaging when no users exist.
- [ ] A regular user attempting to visit `/dashboard/users` is redirected to the forbidden page.
- [ ] The page uses a server component fetching directly from the database, so it reflects the current state without a separate API route.
