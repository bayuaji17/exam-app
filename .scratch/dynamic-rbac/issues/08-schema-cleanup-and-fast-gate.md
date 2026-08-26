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

**Status:** ready-for-agent

- [ ] Drop the legacy `user.role` column and obsolete `app_role` enum from Drizzle schema and database migrations.
- [ ] Remove obsolete helper functions in `lib/auth-roles.ts` and clean up unused imports across the codebase.
- [ ] Run full Fast Gate verification: `pnpm run lint && pnpm run typecheck && pnpm run test:unit && pnpm run build`.
- [ ] Verify that all unit test suites (47+ suites) pass cleanly and build outputs partial prerendering (`◐`) on dashboard routes without warnings.
