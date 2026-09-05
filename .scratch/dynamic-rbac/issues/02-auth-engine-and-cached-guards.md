# 02: Authorization Engine, Cached Permission Resolver & Privilege Guards

**What to build:** The core authorization engine that resolves a user's effective permissions across all assigned roles using Next.js Cache Components (`cacheTag("permissions:user:${userId}")`), provides synchronous/asynchronous guard helpers (`hasPermission`, `requirePermission`), and enforces privilege escalation invariants.

**Blocked by:** 01: Core RBAC Schema, Permissions Catalog & Database Seed Migration

**Status:** ready-for-agent

- [ ] Implement `getUserEffectivePermissions(userId)` that calculates the union of permissions across all roles assigned to a user, cached with `"use cache"` and tagged with `permissions:user:${userId}`.
- [ ] Implement `hasPermission(userId, permission)` supporting automatic wildcard bypass for users holding the `super-admin` role.
- [ ] Implement `requirePermission(permission)` Server Action guard helper that retrieves the session and throws a structured `ForbiddenError` when unauthorized.
- [ ] Implement cache invalidation utilities `revalidateUserPermissions(userId)` and `revalidateRolePermissions(roleId)`.
- [ ] Unit tests verify permission resolution, multi-role union calculation, wildcard bypass for super-admins, and deterministic cache invalidation contracts.
