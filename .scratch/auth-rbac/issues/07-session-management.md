# 07 — Session management (view and revoke)

**What to build:** Any signed-in user can visit a sessions page, see every device and browser where they are currently logged in, and remotely sign out from a session they no longer trust. Each session shows its IP address, user agent, and when it was created. The user's current session is marked so they do not accidentally revoke it.

This is a security and transparency feature available to all three roles.

**Blocked by:** None — this ticket is independent of user management and can be implemented in parallel with ticket 01.

**Status:** ready-for-agent

- [ ] Any user visiting `/dashboard/settings/sessions` sees a table listing every active session belonging to them.
- [ ] Each row shows IP address, user agent (browser and OS if parsable), creation date, and a "Revoke" button.
- [ ] The user's current session is marked with a "Current" badge and has no revoke button or a disabled one.
- [ ] Clicking "Revoke" on another session deletes that session from the database and (if the other device is online) forces it to redirect to `/login`.
- [ ] After revoking a session, the table refreshes and that session no longer appears.
- [ ] If the `impersonatedBy` column is populated for a session, the UI shows who is impersonating: "Impersonated by [email]".
- [ ] A user with only one session sees their current session and a message like "This is your only active session."
- [ ] The page is accessible to all roles — user, admin, and super-admin.
