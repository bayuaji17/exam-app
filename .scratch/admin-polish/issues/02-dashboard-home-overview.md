# 02 — Dashboard home overview

**What to build:** The dashboard home (`/dashboard`) replaces the placeholder heading with a real overview. Admins see stat cards (question banks, questions, packages, schedules, attempts, users) and a short list of upcoming schedules; participants see a simple role-appropriate welcome. Everything is server-rendered from lightweight count queries.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] Lightweight count queries exist for banks, questions, packages, schedules, attempts, and users (batched, no N+1)
- [ ] The admin home renders stat cards from those counts plus a list of the next upcoming schedules
- [ ] The participant home renders a role-appropriate welcome (no admin stats)
- [ ] The page stays responsive on small screens (cards wrap, no overflow)
- [ ] Unit tests cover any formatting/derivation helpers; E2E smoke asserts the overview renders per role
