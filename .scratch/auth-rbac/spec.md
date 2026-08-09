# Complete Role-Based Authorization

## Problem Statement

All authenticated users currently see the same dashboard regardless of their role (`super-admin`, `admin`, or `user`). The sidebar displays 21 routes, and every route under `(dashboard)/` is accessible to anyone with a session. There are no route guards checking role permissions, no UI filtering based on what a user should be allowed to access, and no administrative interfaces for managing users or viewing sessions.

This creates several concrete problems:
- Regular users can navigate to `/dashboard/admins` or `/dashboard/users` — routes that should be restricted to administrators
- The sidebar shows links to routes users have no business accessing, creating confusion
- Admins have no way to create, edit, or manage users through the UI — all user creation happens via a seed script
- Super-admins have no way to promote users to admin or demote admins back to user
- Users cannot see their active sessions or remotely sign out from another device
- The application's security posture relies entirely on not linking to sensitive routes, rather than enforcing access control

## Solution

Implement role-based access control at three enforcement points:

1. **Route guards** — check the user's role before rendering any `(dashboard)/` page; redirect to `/dashboard/forbidden` if unauthorized
2. **Role-filtered sidebar** — show only menu items the user's role is permitted to access
3. **Administrative UIs** — pages for user management (admins), admin management (super-admins), and session management (all users)

The existing auth foundation (Better Auth with role enum and creation hooks) remains unchanged. A permission helper (`userHasPermission`) encodes the role → route mapping, and both the layout guard and sidebar filtering call it.

## User Stories

1. As a **user**, I want to see only the dashboard routes I'm allowed to access, so I don't waste time clicking links that will reject me.
2. As a **user**, I want to access `/dashboard` (overview), `/dashboard/settings`, and `/dashboard/profile`, so I can view my basic dashboard and manage my account.
3. As a **user**, I want to be redirected to `/dashboard/forbidden` if I manually navigate to an admin-only route, so I understand I don't have permission.
4. As a **user**, I want to see my active sessions with IP address and user agent, so I know which devices are signed in.
5. As a **user**, I want to remotely sign out from a specific session, so I can revoke access if I left a device signed in.
6. As an **admin**, I want to see a user list with email, role, and creation date, so I know which accounts exist.
7. As an **admin**, I want to create a new user with email, password, and role `user`, so I can onboard new people.
8. As an **admin**, I want to be prevented from creating users with role `admin` or `super-admin`, so the role hierarchy is enforced.
9. As an **admin**, I want to edit an existing user's ban status and reason, so I can suspend accounts when needed.
10. As an **admin**, I want to access all exam management routes (question banks, exams, schedules, sessions, grading, monitoring, reports), so I can administer the platform.
11. As an **admin**, I want to be redirected to `/dashboard/forbidden` if I try to access `/dashboard/admins`, so I understand only super-admins can manage the admin roster.
12. As an **admin**, I want the sidebar to show all groups except "Admin" under "Manajemen Pengguna", so I see exactly what I can access.
13. As a **super-admin**, I want to see all 21 routes in the sidebar, so I have full visibility into the platform.
14. As a **super-admin**, I want to access `/dashboard/admins` and see a list of all admin and super-admin users, so I know the admin roster.
15. As a **super-admin**, I want to promote a `user` to `admin`, so I can delegate platform administration.
16. As a **super-admin**, I want to demote an `admin` back to `user`, so I can revoke admin privileges.
17. As a **super-admin**, I want to be prevented from demoting other super-admins, so the highest privilege level is protected.
18. As a **super-admin**, I want to create users with any role including `admin`, so I can onboard administrators directly.
19. As a **developer**, I want E2E tests that sign in as each role and assert route access, so role enforcement is verified at the highest seam.
20. As a **developer**, I want E2E tests that verify sidebar visibility per role, so UI filtering is covered.
21. As a **developer**, I want the permission logic centralized in a helper function, so the role → route mapping is a single source of truth.

## Implementation Decisions

### Permission Model

A **permission helper** (`lib/auth/permissions.ts`) encodes the mapping:

```typescript
export function userHasPermission(role: AppRole, route: string): boolean
export function getPermittedRoutes(role: AppRole): string[]
```

Route patterns group into 7 permission tiers:
- **Tier 0 (all roles):** `/dashboard`, `/dashboard/settings`, `/dashboard/profile`
- **Tier 1 (admin + super-admin):** 4 routes under "Manajemen Pengguna" except `/dashboard/admins`
- **Tier 2 (admin + super-admin):** 6 routes under "Manajemen Ujian"
- **Tier 3 (admin + super-admin):** 3 routes under "Penilaian"
- **Tier 4 (admin + super-admin):** 3 routes under "Monitoring"
- **Tier 5 (admin + super-admin):** 3 routes under "Laporan"
- **Tier 6 (super-admin only):** `/dashboard/admins`

Implementation uses prefix matching rather than 21 individual checks.

### Route Guard

Add role check to `app/(dashboard)/layout.tsx` after the existing session check:

```typescript
const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect("/login")

const route = headers().get("x-pathname") ?? "/dashboard"
if (!userHasPermission(session.user.role, route)) {
  redirect("/dashboard/forbidden")
}
```

Server components cannot read the current pathname, so `middleware.ts` sets
the `x-pathname` header on every request (see "Why Not Middleware" below).

Create `/dashboard/forbidden/page.tsx` as a styled 403 page (not a silent redirect) so the behavior is testable.

### Sidebar Filtering

The menu data and the filtering rule live in `lib/dashboard/menu.ts` as
`DASHBOARD_MENU` and `getVisibleMenu(role)`, so the rule can be unit tested
without rendering React. Icons stay in the component, keeping `lib/` free of
React concerns.

`getVisibleMenu` drops links the role cannot open, then drops any group left
with no links, so no bare headings render.

The role is passed **from the server** — `app/(dashboard)/layout.tsx` already
resolves it for the route guard and hands it to `AppSidebar` as a prop.

> **Deviation from the original plan.** This section first said to read the
> session client-side via `authClient.useSession()`. That conflicts with the
> ticket's requirement that the sidebar render without flicker or layout
> shift: `useSession()` returns `isPending` on the first client render, so the
> sidebar would either flash unfiltered content or pop in after a skeleton.
> Passing the role from the server puts the correct menu in the first paint,
> with no pending state at all.

The account-settings link in the footer is rendered outside the menu loop, so
it is checked against the same permission helper rather than being hardcoded —
otherwise it would leak if settings ever became role-restricted.

### User Management

Three new pages under `/dashboard/users/`:

**List (`page.tsx`):**
- Server component fetching `select * from "user" order by "createdAt" desc`
- shadcn Table with columns: email, role, createdAt, banned status, actions (edit link)
- Admin + super-admin only (guarded by layout)

**Create (`create/page.tsx`):**
- Client component, react-hook-form + zod
- Fields: email (validated), password (8+ chars), role (select, filtered by actor's role)
- Calls Better Auth admin plugin `createUser`
- Enforces role-creation rules client-side (admin cannot select `admin` or `super-admin`) and server-side (Better Auth hook already does this)
- Redirects to `/dashboard/users` on success

**Edit (`[userId]/edit/page.tsx`):**
- Server component for initial fetch, client form for edits
- Fields: role (select, filtered), banned (checkbox), banReason (textarea), banExpires (date or null)
- Calls Better Auth admin plugin `updateUser`
- Super-admin can promote `user` → `admin`; admin can only change ban status

### Admin Management

New page `/dashboard/admins/page.tsx`:
- Server component fetching `select * from "user" where role in ('admin', 'super-admin')`
- Super-admin only (guarded by layout)
- Actions: "Promote User" button → modal selecting from `user` role, promoting to `admin`
- Actions: "Demote" button per admin row → confirm dialog, demote to `user`
- Super-admin rows show "Cannot demote" instead of button

### Session Management

New page `/dashboard/settings/sessions/page.tsx`:
- Server component fetching `select * from "session" where "userId" = $1 order by "createdAt" desc`
- Shows: IP address, user agent, createdAt, "Current" badge for current session, "Revoke" button for others
- Revoke action: `delete from "session" where id = $1` (or Better Auth `revokeSession` API if available)
- All roles can access (Tier 0)

### Schema Changes

None. The `user` table already has `role`, `banned`, `banReason`, `banExpires`. The `session` table already has `userId`, `ipAddress`, `userAgent`, `impersonatedBy`. No migrations needed.

### Better Auth Integration

- User creation and editing use the admin plugin's `createUser` and `updateUser` APIs
- Role-creation enforcement relies on the existing `before` hook in `lib/auth.ts:87-101`
- Session revocation uses Drizzle delete or Better Auth `revokeSession` if exposed

## Testing Decisions

### What Makes a Good Test

A good test verifies behavior through public interfaces, not implementation details. For role-based access:
- **Public interface:** sign in as a role → navigate to a route → assert what renders or where you land
- **Not the interface:** call `userHasPermission` and mock the result, or check `if` statements in the layout code

The E2E tests should read like a specification: "An admin can access `/dashboard/users`." "A regular user is redirected when visiting `/dashboard/users`."

### Which Modules Will Be Tested

**Unit tests:**
- `lib/auth/permissions.test.ts` — pure functions `userHasPermission` and `getPermittedRoutes`
- Existing `__test__/unit/auth-roles.test.ts` stays as-is (helper functions only)

**E2E tests (Playwright):**
- `__test__/e2e/dashboard-route-guard.spec.ts` — role-based route access
- `__test__/e2e/sidebar-visibility.spec.ts` — sidebar filtering:
  - As `user`, the sidebar shows 2 groups (Overview, Pengaturan) and no administrative links
  - As `admin`, the sidebar shows all 7 groups, but the `/dashboard/admins` link is hidden — the group that contains it survives on its other three links
  - As `super-admin`, the sidebar shows all 7 groups and every link
  - Create user flow (admin creates `user`, super-admin creates `admin`)
  - Edit user flow (super-admin promotes `user` to `admin`)
  - Session management (view sessions, revoke non-current session)
  - Admin management (super-admin promotes user, demotes admin)

**Test fixtures:**
- `__test__/e2e/fixtures/test-users.ts` — seed `test-user@example.com`, `test-admin@example.com`, `test-superadmin@example.com` via Better Auth API before tests run

### Prior Art

Existing E2E tests:
- `__test__/e2e/login.spec.ts` — renders `/login`, signs in, redirects to `/dashboard`
- `__test__/e2e/dashboard-auth.spec.ts` — unauthenticated redirect

The new role-access tests follow the same pattern: `page.goto(route)`, then assert on URL or visible content.

Existing unit tests:
- `__test__/unit/auth-roles.test.ts` — tests `isAppRole` and `getAppRoles` helpers
- `__test__/unit/login-page.test.tsx` — component test with mocked `authClient`

The permission helper unit tests follow the existing vitest + `@testing-library` setup in `vitest.config.mts`.

## Out of Scope

The following are intentionally deferred to future work:

1. **Self-service profile editing** — users seeing and editing their own name, email, username, displayUsername. The schema and Better Auth support this, but the UI and form validation are separate concerns.
2. **Password change for end users** — Better Auth has APIs, but the flow (current password verification, new password + confirm) is a distinct feature.
3. **Email verification flows** — the schema has `emailVerified` but no verification email sending or token handling is built.
4. **OAuth providers** — Better Auth supports them, but setup and UI are separate tickets.
5. **Ban enforcement at sign-in** — the `banned` field exists and will be editable, but whether banned users are blocked at sign-in or shown a "Your account is banned" page post-sign-in is not decided. Lean toward blocking at sign-in for security, but that's a separate ticket.
6. **Impersonation UI** — the `session.impersonatedBy` column exists, and session management will show it, but a super-admin UI to impersonate another user is out of scope.
7. **Audit logging** — recording who created/edited/banned which user. The database has `createdAt` and `updatedAt` on the `user` table but no audit trail table.
8. **Granular permissions** — this implementation is role-based (3 roles, 7 tiers). Finer-grained permissions (per-route, per-action) would require a different model.

## Further Notes

### Why E2E Tests at the Highest Seam

The TDD skill prescribes testing through public interfaces. For role-based access, the public interface is:
1. User signs in
2. User navigates
3. User sees content or a redirect

Component-level tests (mocking `userHasPermission`, asserting `redirect` was called) couple tests to implementation. If we later move the guard to middleware or add a role-check HOC, those tests break despite behavior staying correct. E2E tests survive such refactors.

Cost: E2E is slower (3–5s per test vs. <100ms for unit). Mitigation: run unit tests in watch mode during development, run E2E in the release gate.

### Why Not Middleware

> **Correction recorded during implementation.** This section originally
> claimed middleware was not used at all. A minimal `middleware.ts` *is* in
> place — it exists for one reason only: server components cannot read the
> current pathname, so the middleware forwards it as an `x-pathname` header
> for the layout guard to read. It performs no auth checks.

Next.js middleware runs on every request before rendering, which makes it a
natural place for auth checks. It is not used for them here because:
1. The existing guard in `(dashboard)/layout.tsx` already works and is tested
2. Middleware cannot call async Better Auth APIs without workarounds (middleware edge runtime limits)
3. The guard + helper pattern is easier to test and reason about for a solo developer

If performance becomes an issue (many routes, deep nesting), middleware is the natural next step — at which point the header forwarding and the auth check can merge into one pass.

### Role → Route Mapping Rationale

The 7-tier grouping matches the sidebar's visual structure. An alternative would be flat route lists per role, but that duplicates knowledge:
```typescript
// Flat (what we're NOT doing)
const USER_ROUTES = ["/dashboard", "/dashboard/settings", "/dashboard/profile"]
const ADMIN_ROUTES = [...USER_ROUTES, "/dashboard/users", ...] // duplication
```

The prefix-based approach with inheritance (`admin` gets everything `user` gets) is DRYer and mirrors the product hierarchy.

### Session Management Scope

The session list shows `impersonatedBy` if present, so users know when a super-admin is acting as them. This is transparency, not an audit feature — there's no "why was I impersonated" explanation or history. A full audit log is future work.

### Ban Status Nuance

The edit form will expose `banned`, `banReason`, and `banExpires` (nullable timestamp). A banned user with a non-null `banExpires` in the past is implicitly unbanned. The form should handle this:
- "Ban indefinitely" → `banned: true`, `banExpires: null`
- "Ban until [date]" → `banned: true`, `banExpires: <timestamp>`
- "Unban" → `banned: false`, `banReason: null`, `banExpires: null`

Enforcement (blocking at sign-in or post-sign-in) is deferred.

### Test User Seeding

E2E fixtures will create test users via Better Auth's `createUser` API rather than direct Drizzle inserts, so password hashing and Better Auth's internal consistency are respected. Cleanup after tests: either delete test users in `afterAll`, or use a separate test database that gets wiped between runs.

The existing `scripts/seed-super-admin.mjs` creates a super-admin from env vars. E2E should create `test-superadmin@example.com` with a known password (`Test1234!` or similar) so tests can sign in predictably.
