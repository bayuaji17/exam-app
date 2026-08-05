# 08 — Admin management page (super-admin only)

**What to build:** A super-admin-only page listing every user with role `admin` or `super-admin`. From here, a super-admin can promote a regular user to admin or demote an existing admin back to user. Other super-admins cannot be demoted — their row shows "Cannot demote" instead of an action button.

This closes the loop on the role hierarchy: super-admins are created via seed script, super-admins create admins via this page, and admins create users via ticket 05.

**Blocked by:** 02 (route guard), 06 (edit-user patterns for role changes).

**Status:** ready-for-agent

- [ ] A super-admin visiting `/dashboard/admins` sees a table listing every user with role `admin` or `super-admin`, sorted by creation date.
- [ ] Each row shows email, role, creation date, and an action button.
- [ ] Admin rows have a "Demote to User" button; clicking it shows a confirmation dialog, then changes their role to `user` and they disappear from this list.
- [ ] Super-admin rows show "Cannot demote" text or a disabled button, and no action is possible.
- [ ] A "Promote User" button above the table opens a modal or inline form listing all users with role `user`; selecting one and confirming promotes them to `admin` and they appear in the admin list.
- [ ] After promoting or demoting, the page refreshes and the change is visible immediately.
- [ ] An admin attempting to visit `/dashboard/admins` is redirected to the forbidden page.
- [ ] A regular user attempting to visit `/dashboard/admins` is redirected to the forbidden page.
- [ ] The page uses Better Auth's admin API or direct Drizzle update to change roles, respecting the same role-creation rules enforced in ticket 05.
