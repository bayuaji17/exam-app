# 05 — Create user form

**What to build:** A page where admins and super-admins can create new accounts. The form collects email, password, and role, validates them, and calls Better Auth's admin plugin to create the user. Role options are filtered by the actor's own role: admins can only create regular users, while super-admins can create users or admins.

After creating the user, the admin is sent back to the user list where the new account appears.

**Blocked by:** 04 — the create flow returns to the user list, which must exist first.

**Status:** ready-for-agent

- [ ] Admins can visit `/dashboard/users/create` and see a form with email, password, and role fields.
- [ ] An admin sees only "User" in the role dropdown; a super-admin sees "User" and "Admin".
- [ ] The email field is validated as a proper email address before submission.
- [ ] The password field requires at least 8 characters.
- [ ] Submitting the form with valid data creates the user via Better Auth's admin API and redirects to `/dashboard/users`.
- [ ] The newly-created user appears in the list.
- [ ] Form errors are displayed inline: invalid email shows "Enter a valid email address", weak password shows "Password must be at least 8 characters".
- [ ] Server-side enforcement prevents an admin from creating a user with role `admin` or `super-admin`, even if the form is tampered with.
- [ ] A regular user attempting to visit `/dashboard/users/create` is redirected to the forbidden page.
