# 07 — Session management (view and revoke)

**What to build:** Any signed-in user can visit a sessions page, see every device and browser where they are currently logged in, and remotely sign out from a session they no longer trust. Each session shows its IP address, user agent, and when it was created. The user's current session is marked so they do not accidentally revoke it.

This is a security and transparency feature available to all three roles.

**Blocked by:** None — this ticket is independent of user management and can be implemented in parallel with ticket 01.

**Status:** done

- [x] Any user visiting `/dashboard/settings/sessions` sees a table listing every active session belonging to them.
- [x] Each row shows IP address, user agent (browser and OS if parsable), creation date, and a "Revoke" button.
- [x] The user's current session is marked with a "Current" badge and has no revoke button or a disabled one.
- [x] Clicking "Revoke" on another session deletes that session from the database and (if the other device is online) forces it to redirect to `/login`.
- [x] After revoking a session, the table refreshes and that session no longer appears.
- [x] If the `impersonatedBy` column is populated for a session, the UI shows who is impersonating: "Impersonated by [email]".
- [x] A user with only one session sees their current session and a message like "This is your only active session."
- [x] The page is accessible to all roles — user, admin, and super-admin.

## Comments

### The signed cookie nearly derailed the "current session" marking

Better Auth signs its session cookie as `<token>.<signature>` — the database
stores the bare 32-character token, the browser holds the signed value. Naively
comparing the cookie against the listed tokens marks nothing. The page now
takes everything before the first dot. This is the same split Hono's
signed-cookie helpers use, since that is what Better Auth builds on.

### The E2E "other device" had to sign its own cookie

A test context acting as a second device inserts a session row directly and
sets its cookie — no sign-in, so the suite stays under the rate limit. That
cookie must be the *signed* form or the server refuses the session. The
fixture reproduces the signature (base64 of HMAC-SHA256 over the token with
`BETTER_AUTH_SECRET`), so the "revoke ends the other device" test is real:
the device is genuinely authenticated, and after the revoke its next request
lands on `/login`.

### Stale sessions accumulated across test runs

Every E2E run's global setup signs the three fixture users in, and each
sign-in left a row behind — after many runs the user fixture had 75 sessions
and the page was drowning in them. Global setup now deletes all sessions
before signing in afresh, so fixtures always start clean.

### No new primitives

The page uses the existing Table, Button, and FieldError components. The only
new code beyond the page is `describeUserAgent` (browser and OS from a user
agent string, unit tested) and two thin queries.

### Browser/OS parsing

No UA-parsing library was added. A small regex-based helper identifies
Chrome, Firefox, Safari, Edge and Opera, plus Windows, macOS, Linux, Android
and iOS — "Chrome · Windows" or just "Windows" when only the platform is
recognisable. Rows that resolve to neither show "Perangkat tidak dikenal".
