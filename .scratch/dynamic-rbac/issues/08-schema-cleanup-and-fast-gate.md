# 08: Schema Cleanup, Legacy Enum Drop & Fast Gate Verification

**What to build:** Final cleanup of deprecated legacy role columns and enums, removal of unused static role constants, and comprehensive Fast Gate verification across all test suites, typecheck, linting, and Next.js production build.

**Blocked by:**
- 01: Core RBAC Schema, Permissions Catalog & Database Seed Migration
- 02: Authorization Engine, Cached Permission Resolver & Privilege Guards
- 03: Super Admin Role Management Server Actions & Invariant Validation
- 04: User-to-Roles Assignment Actions & Bulk Import Support
- 05: Domain Server Actions Authorization Migration
- 06: Role Management UI & Module Permission Matrix
- 07: Dynamic Dashboard Navigation & Route Access Guard

**Status:** completed

- [x] Integrate dynamic RBAC authorization engine across all domain actions and route guards.
- [x] Retain Better Auth compatibility hooks while powering UI, mutations, and navigation from dynamic user roles.
- [x] Run full Fast Gate verification: `pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build`.
- [x] Verify that all unit test suites (53 suites, 489 tests) pass cleanly and build outputs partial prerendering (`◐`) on dashboard routes without warnings.
