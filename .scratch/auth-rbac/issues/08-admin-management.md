# 08 — Admin management page (super-admin only)

**What to build:** A super-admin-only page listing every user with role `admin` or `super-admin`. From here, a super-admin can promote a regular user to admin or demote an existing admin back to user. Other super-admins cannot be demoted — their row shows "Cannot demote" instead of an action button.

This closes the loop on the role hierarchy: super-admins are created via seed script, super-admins create admins via this page, and admins create users via ticket 05.

**Blocked by:** 02 (route guard), 06 (edit-user patterns for role changes).

**Status:** done

- [x] A super-admin visiting `/dashboard/admins` sees a table listing every user with role `admin` or `super-admin`, sorted by creation date.
- [x] Each row shows email, role, creation date, and an action button.
- [x] Admin rows have a "Demote to User" button; clicking it shows a confirmation dialog, then changes their role to `user` and they disappear from this list.
- [x] Super-admin rows show "Cannot demote" text or a disabled button, and no action is possible.
- [x] A "Promote User" button above the table opens a modal or inline form listing all users with role `user`; selecting one and confirming promotes them to `admin` and they appear in the admin list.
- [x] After promoting or demoting, the page refreshes and the change is visible immediately.
- [x] An admin attempting to visit `/dashboard/admins` is redirected to the forbidden page.
- [x] A regular user attempting to visit `/dashboard/admins` is redirected to the forbidden page.
- [x] The page uses Better Auth's admin API or direct Drizzle update to change roles, respecting the same role-creation rules enforced in ticket 05.

## Comments

### This ticket rode on groundwork already laid

The route guard from ticket 02 already restricts `/dashboard/admins` to
super-admins, and the before-hook from ticket 06 already enforces every
role-change rule (no super-admin targets, no self, no minting super-admin).
The API layer needed no new enforcement — this ticket is two queries, one
table, and two dialogs.

Promote and demote both call `set-role` with a different target role, and
both rely on the same hook rules. A new E2E case seeds a second super-admin
and attempts to demote it via the API, confirming the "another super-admin"
pair is blocked, not just the self case.

### Dialog primitive added

`components/ui/dialog.tsx` from the shadcn registry (Radix, no new
dependency). Used for both the demote confirmation and the promote picker,
per the decision recorded in the ticket discussion.

### Refresh after a mutation

Both dialogs call `router.refresh()` after a successful role change. This is
the intended use of refresh — re-fetch the current page's server data after a
mutation, with no `push()` nearby — so the push/refresh race from ticket 06
does not apply and the roster updates in place.

### Deliberate decisions

- The table includes a name column even though the criteria only list
  email/role/date/action, matching the users page from ticket 04.
- The promotable list includes banned regular users: ban status and role are
  orthogonal, and a promotion does not touch the ban.
- The promotable picker is a Select inside a dialog; the promote button is
  disabled when no regular users exist. That disabled state is not E2E-tested
  because the seeded fixtures always include a regular user — same gap as the
  ticket-04 empty state.
