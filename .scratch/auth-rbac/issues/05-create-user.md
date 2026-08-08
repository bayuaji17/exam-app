# 05 — Create user form

**What to build:** A page where admins and super-admins can create new accounts. The form collects email, password, and role, validates them, and calls Better Auth's admin plugin to create the user. Role options are filtered by the actor's own role: admins can only create regular users, while super-admins can create users or admins.

After creating the user, the admin is sent back to the user list where the new account appears.

**Blocked by:** 04 — the create flow returns to the user list, which must exist first.

**Status:** done

- [x] Admins can visit `/dashboard/users/create` and see a form with email, password, and role fields.
- [x] An admin sees only "User" in the role dropdown; a super-admin sees "User" and "Admin".
- [x] The email field is validated as a proper email address before submission.
- [x] The password field requires at least 8 characters.
- [x] Submitting the form with valid data creates the user via Better Auth's admin API and redirects to `/dashboard/users`.
- [x] The newly-created user appears in the list.
- [x] Form errors are displayed inline: invalid email shows "Enter a valid email address", weak password shows "Password must be at least 8 characters".
- [x] Server-side enforcement prevents an admin from creating a user with role `admin` or `super-admin`, even if the form is tampered with.
- [x] A regular user attempting to visit `/dashboard/users/create` is redirected to the forbidden page.

## Comments

### A required name field was added

Better Auth's `createUser` requires `name`, and `user.name` is `notNull` in the
schema, so the three fields the criteria list are not enough to create an
account. The form asks for **Nama** first. Labels are Indonesian to match the
rest of the dashboard; validation messages stay English as the criteria specify.

### Accounts created here cannot sign in by username

The username plugin only hooks `/sign-up/email` and `/update-user`, never
`/admin/create-user`, so `username` is left null. These users sign in with their
email address, unlike the seeded fixtures which all have usernames. Accepted
deliberately for this ticket; a later ticket can add the field.

### The server-side rule was broken and is now fixed

The rule this ticket relies on already existed in `lib/auth.ts`, but it read the
session from `ctx.context.session`, which a before-hook never populates. Every
call therefore failed the `actorRoles.length === 0` check and threw
"You must be signed in to create users" — including for a legitimate
super-admin. `/admin/create-user` was unusable by anyone.

It now resolves the session with `getSessionFromCtx(ctx)`, the same way the
admin plugin does. Writing the E2E first is what surfaced this; the criteria
assumed the rule worked.

### Two test-only defects worth recording

**Cleanup raced with creation.** Deleting the created accounts in a per-file
`afterAll` looked right but runs once per worker. With `fullyParallel`, a worker
that finished early deleted rows while another was still mid-create, and because
Better Auth writes the `user` row and its `account` row as two statements, a
delete landing between them broke the account insert's foreign key and the
endpoint answered 500. Cleanup moved to `globalTeardown`, which runs once after
every worker.

**Filling raced with hydration.** The inputs are controlled by react-hook-form,
so a `fill` that lands before React hydrates is discarded by the first client
render — the form then submitted an empty name. Visible only under full-suite
load, which is why it passed when the file ran alone. The helper now retries
fill-and-verify rather than sleeping.

Both were flaky, so both were confirmed with repeated runs rather than a single
green pass: the file three times, then the full suite three times.
