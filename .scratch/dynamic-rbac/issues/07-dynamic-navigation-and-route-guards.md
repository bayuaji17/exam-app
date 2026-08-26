# 07: Dynamic Dashboard Navigation & Route Access Guard

**What to build:** Dynamic filtering for the dashboard navigation menus and application sidebar based on the authenticated user's effective permissions, along with Next.js route protection logic for all dashboard URL paths.

**Blocked by:**
- 02: Authorization Engine, Cached Permission Resolver & Privilege Guards
- 06: Role Management UI & Module Permission Matrix

**Status:** ready-for-agent

- [ ] Update `app/(dashboard)/layout.tsx` and sidebar navigation definitions to hide/show menu items dynamically according to `hasPermission(userId, requiredPermission)`.
- [ ] Update route authorization resolver (`lib/auth/permissions.ts`) to map URL path prefixes directly to required permission capabilities.
- [ ] Ensure unauthorized access to dashboard subpaths redirects gracefully to `/dashboard/forbidden` or the overview page.
- [ ] Unit tests for dynamic navigation filtering and route guard evaluations against various role/permission combinations.
