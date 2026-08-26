# 03: Super Admin Role Management Server Actions & Invariant Validation

**What to build:** Server Actions accessible exclusively by Super Administrators to list, create, update, and delete roles, synchronize permission matrices, protect immutable system roles, and strictly block deletion of roles assigned to active users.

**Blocked by:** 02: Authorization Engine, Cached Permission Resolver & Privilege Guards

**Status:** ready-for-agent

- [ ] Implement `listRoles()` returning all roles with metadata, system flags, assigned user counts, and permission IDs.
- [ ] Implement `createRole({ name, description, permissionIds })` guarded strictly for `super-admin`.
- [ ] Implement `updateRole(roleId, { name, description, permissionIds })` preventing changes to system role identities.
- [ ] Implement `deleteRole(roleId)` that rejects deletion of system roles and rejects deletion of any role with `assignedUsersCount > 0` with a descriptive error.
- [ ] Ensure role mutations trigger `revalidateRolePermissions(roleId)` and `revalidateTag("roles")`.
- [ ] Unit tests verify all CRUD actions, validation errors, system role protection, and user-in-use deletion blocking.
