# 06 — Edit user (role and ban status)

**What to build:** A page where admins and super-admins can change an existing user's role and ban status. Super-admins can promote a user to admin or demote an admin to user. Admins can only adjust ban fields — marking someone as banned, setting a reason and expiration, or lifting a ban.

The form pre-fills with the user's current values so the admin knows what they are changing.

**Blocked by:** 05 — the edit page shares validation and form patterns established by the create page.

**Status:** done

- [x] An admin visiting `/dashboard/users/[userId]/edit` sees a form pre-filled with that user's current role, banned status, ban reason, and ban expiration.
- [x] A super-admin can change the role dropdown to promote a user to admin or demote an admin to user.
- [x] An admin sees the role field as read-only or hidden, since they cannot change roles.
- [x] Any admin can toggle "Banned", fill in a ban reason, and optionally set a ban expiration date.
- [x] Submitting the form updates the user via Better Auth's admin API and redirects to `/dashboard/users`.
- [x] The updated fields appear in the user list.
- [x] Super-admins cannot edit other super-admin accounts — the form shows a message like "Super-admins cannot be edited" or redirects.
- [x] Admins cannot change their own role or ban status to prevent self-promotion or accidental lockout.
- [x] Server-side enforcement prevents an admin from submitting a role change, even if the form is tampered with.

## Comments

### Permissions had to change before any of this could work

Admins previously had only `user: ["create"]`, but ban, unban and role
changes check `ban` and `set-role` respectively. Admin now holds
`create`, `ban`, `delete`; `set-role` stays super-admin-only, matching the
decision recorded in this ticket's discussion.

Better Auth's permissions are rank-blind — `ban` allows banning a super
admin, and nothing in the plugin prevents it. The before-hook in
`lib/auth.ts` now answers to a rule table for `/admin/set-role`,
`/admin/ban-user` and `/admin/remove-user`:

- super admins are never targeted by any of them
- nobody targets themselves (`set-role` needed this added; the plugin
  already blocks self-ban and self-removal)
- `set-role` also may not create a super admin

### Remove / delete

The `delete` permission is granted and the guard exists, but there is no
removal UI. That is a deliberate separate ticket: removal is a distinct
destructive operation with its own confirmation flow.

### Ban expiry is a duration, and the UI says so

Better Auth's `ban-user` takes `banExpiresIn` in seconds from now; the DB
stores an absolute timestamp. The form offers Permanen (omits the field,
leaving `banExpires` null) or Sementara with presets 1 jam / 24 jam /
7 hari / 30 hari / Custom (hari), and previews the lift time live.
The preview and the stored value both format in the same pinned zone, so
they cannot disagree.

### The forms are separate concerns, as decided

Role, ban and unban are independent forms calling their own endpoint. No
submit fires multiple sequential mutations, so a partial failure cannot
leave an account half-updated.

### Two bugs found while testing

**`router.push` + `router.refresh()` races and cancels the navigation.**
`refresh()` re-fetches the *current* page's server components and can cancel
an in-flight push. Every form followed the old login-page pattern, so every
form submission silently failed to navigate — visible only in E2E. Fixed by
dropping `refresh()` (a push already fetches the destination's fresh payload)
in the create form, both edit forms, and the login page.

**Test interactions raced with hydration under parallel load.** Clicks and
fills landing before React hydrated were silently discarded, so the suite
passed alone and flaked in full runs. The interaction helpers now verify
their effect and retry, and submits wait on a hydration barrier (the profile
menu renders the user's name only after the client session resolves). Three
consecutive full-suite runs are green.
