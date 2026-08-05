# 01 — Permission helper and E2E role fixtures

**What to build:** The foundation that every later ticket depends on. A signed-in user's role can be checked against any dashboard route, and the E2E suite can sign in as each of the three roles.

Nothing visible changes for the user yet — this ticket delivers the seam that ticket 02 and 03 enforce against, plus the test infrastructure that makes the remaining tickets verifiable.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `userHasPermission(role, route)` answers correctly for all three roles across every route tier: a regular user is permitted `/dashboard`, `/dashboard/settings`, and `/dashboard/profile` but nothing else; an admin is permitted everything except `/dashboard/admins`; a super-admin is permitted everything.
- [ ] Route matching is prefix-based, so nested routes such as `/dashboard/exams/123/edit` and `/dashboard/reports/individual` resolve to the same permission as their parent section.
- [ ] `getPermittedRoutes(role)` returns the list of top-level routes a role may reach, suitable for driving sidebar filtering.
- [ ] Unknown or malformed routes are denied rather than permitted, so a typo in a future route cannot silently grant access.
- [ ] The E2E suite can seed three test accounts — one per role — using the same account-creation path the application uses, so password hashing and role assignment match production behaviour.
- [ ] An E2E test can sign in as any seeded role and land on `/dashboard`.
- [ ] Seeding is idempotent: running the suite twice in a row does not fail on duplicate accounts.
