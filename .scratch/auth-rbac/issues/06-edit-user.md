# 06 — Edit user (role and ban status)

**What to build:** A page where admins and super-admins can change an existing user's role and ban status. Super-admins can promote a user to admin or demote an admin to user. Admins can only adjust ban fields — marking someone as banned, setting a reason and expiration, or lifting a ban.

The form pre-fills with the user's current values so the admin knows what they are changing.

**Blocked by:** 05 — the edit page shares validation and form patterns established by the create page.

**Status:** ready-for-agent

- [ ] An admin visiting `/dashboard/users/[userId]/edit` sees a form pre-filled with that user's current role, banned status, ban reason, and ban expiration.
- [ ] A super-admin can change the role dropdown to promote a user to admin or demote an admin to user.
- [ ] An admin sees the role field as read-only or hidden, since they cannot change roles.
- [ ] Any admin can toggle "Banned", fill in a ban reason, and optionally set a ban expiration date.
- [ ] Submitting the form updates the user via Better Auth's admin API and redirects to `/dashboard/users`.
- [ ] The updated fields appear in the user list.
- [ ] Super-admins cannot edit other super-admin accounts — the form shows a message like "Super-admins cannot be edited" or redirects.
- [ ] Admins cannot change their own role or ban status to prevent self-promotion or accidental lockout.
- [ ] Server-side enforcement prevents an admin from submitting a role change, even if the form is tampered with.
