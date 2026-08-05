# 02 — Route guard for role-restricted dashboard routes

**What to build:** Visiting a dashboard route you are not permitted to see sends you to a forbidden page instead of rendering the content. A regular user who types `/dashboard/users` into the address bar lands on a clear "you do not have access" page; an admin who tries `/dashboard/admins` gets the same treatment.

The guard lives at the route-group level so every current and future page beneath it inherits protection by construction, rather than each page remembering to check.

**Blocked by:** 01 — needs the permission helper.

**Status:** ready-for-agent

- [ ] A signed-in user visiting a route their role does not permit is redirected to a forbidden page rather than seeing the route's content.
- [ ] A signed-in user visiting a route their role does permit sees that route normally.
- [ ] The forbidden page explains that access is denied and offers a way back to the dashboard.
- [ ] The existing unauthenticated-visitor redirect to `/login` still works and takes precedence: signing out and visiting an admin route sends you to login, not to forbidden.
- [ ] Guarding applies to nested routes, so a deep path under a restricted section is equally protected.
- [ ] No dashboard content leaks in the response body of a forbidden request.
