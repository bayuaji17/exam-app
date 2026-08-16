# 03 — Settings profile & security

**What to build:** The settings pages become functional. Profile lets the participant edit their display name (and optional username, with the app's username rules); Security lets them change their password with current-password verification; System stays a stub with a clear "coming soon" note instead of a bare heading.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] Profile page renders a form for display name (+ username when unset), pre-filled from the session, saving through the auth client and reflecting the change immediately
- [ ] Profile validation matches the existing account rules (name required; username 3–30 chars, allowed charset) and shows server errors
- [ ] Security page renders a change-password form (current password + new password) with correct-password verification and validation
- [ ] A changed password actually works for the next sign-in; wrong current password is rejected
- [ ] System page shows a "coming soon" note instead of a bare heading
- [ ] E2E covers: profile save reflects, username validation, password change + re-sign-in, wrong current password rejected
