# 04: User-to-Roles Assignment Actions & Bulk Import Support

**What to build:** Server Actions enabling authorized actors (`roles:assign`) to assign/unassign multiple roles to user accounts, preventing non-super-admins from granting the `super-admin` role, and ensuring automatic default role assignment during self-registration and Excel bulk participant imports.

**Blocked by:** 02: Authorization Engine, Cached Permission Resolver & Privilege Guards

**Status:** ready-for-agent

- [ ] Implement `assignUserRoles(targetUserId, roleIds)` guarded by `requirePermission("roles:assign")`.
- [ ] Enforce privilege escalation invariant: actors who are not `super-admin` cannot assign or remove the `super-admin` role.
- [ ] Invalidate the target user's permission cache tag `permissions:user:${targetUserId}` on assignment mutations.
- [ ] Update user creation Server Action (`createUser`) to support assigning multiple initial roles.
- [ ] Update Excel participant bulk import (`applyParticipantImport`) to automatically attach the default `user` system role to all newly imported accounts.
- [ ] Unit tests verify multi-role assignments, privilege escalation prevention, user cache invalidation, and bulk import role attachment.
