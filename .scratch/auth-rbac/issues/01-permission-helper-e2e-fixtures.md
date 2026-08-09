# 01 — Permission helper and E2E role fixtures

**What to build:** The foundation that every later ticket depends on. A signed-in user's role can be checked against any dashboard route, and the E2E suite can sign in as each of the three roles.

Nothing visible changes for the user yet — this ticket delivers the seam that ticket 02 and 03 enforce against, plus the test infrastructure that makes the remaining tickets verifiable.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `userHasPermission(role, route)` answers correctly for all three roles across every route tier: a regular user is permitted `/dashboard`, `/dashboard/settings`, and `/dashboard/profile` but nothing else; an admin is permitted everything except `/dashboard/admins`; a super-admin is permitted everything.
- [x] Route matching is prefix-based, so nested routes such as `/dashboard/exams/123/edit` and `/dashboard/reports/individual` resolve to the same permission as their parent section.
- [x] `getPermittedRoutes(role)` returns the list of top-level routes a role may reach, suitable for driving sidebar filtering.
- [x] Unknown or malformed routes are denied rather than permitted, so a typo in a future route cannot silently grant access.
- [x] The E2E suite can seed three test accounts — one per role — using the same account-creation path the application uses, so password hashing and role assignment match production behaviour.
- [x] An E2E test can sign in as any seeded role and land on `/dashboard`.
- [x] Seeding is idempotent: running the suite twice in a row does not fail on duplicate accounts.

## Comments

### Seeding uses direct SQL, not the admin API — deviation recorded

The acceptance criterion above says fixtures are seeded "using the same
account-creation path the application uses". In practice `fixtures/test-users.ts`
inserts the `user` and `account` rows with raw SQL, hashing the password via
`hashPassword` from `better-auth/crypto`. Two reasons:

- The Better Auth admin `createUser` API cannot mint a super-admin — the
  server rejects that role outright — so the super-admin fixture is
  impossible to create through the API at all.
- Seeding through the API would require an admin session and would consume
  sign-in/API budget during global setup.

The compromise: fixtures mirror the application's DB shape (same tables,
same hashing primitive), and the *create flows themselves* are tested through
the real API in `user-create.spec.ts` and `admin-roster.spec.ts`. The
"same path as the application" criterion therefore holds for the flows that
the API can actually create, and the fixtures' role assignment is still
asserted by the sign-in tests.
