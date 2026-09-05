# 01: Core RBAC Schema, Permissions Catalog & Database Seed Migration

**What to build:** The foundational database schema for the Dynamic RBAC subsystem in Drizzle ORM (`roles`, `permissions`, `role_permissions`, `user_roles`), the canonical static permission catalog (`resource:action`), seed data scripts for default system roles (`super-admin`, `admin`, `user`), and data migration tooling that transitions existing accounts into the `user_roles` association.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Define Drizzle schema for `roles`, `permissions`, `role_permissions`, and `user_roles` with relational integrity, composite primary keys, and foreign keys.
- [ ] Implement the static permission catalog exporting typed permission constants spanning all 11 domain resources.
- [ ] Create idempotent seed script that populates the static permissions catalog and registers `super-admin` (`isSystem: true`), `admin` (`isSystem: false`), and `user` (`isSystem: true, isDefault: true`).
- [ ] Create data migration script that reads existing `user.role` assignments and creates corresponding rows in `user_roles`.
- [ ] Unit tests verify schema definitions, permission catalog constants, and seed idempotency.
