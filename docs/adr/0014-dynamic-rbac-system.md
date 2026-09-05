# 14. Dynamic Role-Based Access Control (RBAC) System

Date: 2026-08-26

## Status

Accepted

## Context

Previously, the application utilized a coarse, hardcoded 3-tier system role model (`super-admin`, `admin`, `user`) governed primarily through Better Auth's static admin plugin and route tier maps (`lib/auth-roles.ts`, `lib/auth/permissions.ts`, `user.role` enum column).

As the application scales to support institutional scenarios (teachers, exam proctors, question authors, review committees, exam coordinators), access requirements become dynamic and multifaceted:
- Different staff members require granular authority over specific subsystems (e.g., question bank authoring vs. scheduling vs. manual grading).
- Super Administrators need the ability to define custom roles and configure their exact permission matrix without modifying source code or re-deploying.
- Multi-role assignments (many-to-many) are required when a staff member holds multiple concurrent responsibilities (e.g., both a Teacher and an Exam Proctor).

## Decision

We replace the static 3-tier enum role system with a **Dynamic Role-Based Access Control (RBAC)** architecture adhering to the following structural and operational principles:

1. **Static Permission Catalog (`resource:action`):**
   - Permissions are defined strictly in the application codebase as immutable string constants in the canonical format `resource:action` (e.g., `question_banks:create`, `exams:questions_manage`, `exam_schedules:create`, `eligibility:manage`).
   - Grouping of permissions by "Module" is purely a UI presentation and organizational convenience, not part of the backend authorization key.

2. **System Roles vs. Custom Roles:**
   - `super-admin`: An immutable **System Role** (`isSystem: true`) that bypasses all explicit permission checks via wildcard access and cannot be renamed or deleted.
   - `user`: An immutable **System Default Role** (`isSystem: true`, `isDefault: true`) automatically assigned to new registrations and bulk-imported participants.
   - Custom Roles: Database-defined entities managed by Super Admins linking to specific subsets of permissions.

3. **Many-to-Many Role Assignment:**
   - Users are assigned roles via the `user_roles` join table (`userId`, `roleId`).
   - A user's effective permissions are the union of all permissions granted across all assigned roles.

4. **Cached Permission Resolution with Invalidation Tags:**
   - Session cookies remain lightweight, storing only identity and assigned role identifiers.
   - User permissions are resolved via dynamic cached queries using Next.js Cache Components (`"use cache"`, `cacheTag("permissions:user:${userId}")`).
   - When a role's permissions or a user's role assignments are modified, the respective cache tags are deterministically invalidated (`revalidateTag()`), reflecting changes immediately without requiring re-login.

5. **Privilege Escalation & Deletion Guards:**
   - Strict block on deleting any role that currently has active user assignments.
   - Strict block on assigning, modifying, or granting `super-admin` status by any non-super-admin actor.

6. **Clean Cutover Data Migration:**
   - Introduce `roles`, `permissions`, `role_permissions`, and `user_roles` tables.
   - Seed baseline system roles and default admin/teacher permission templates.
   - Migrate existing `user.role` records into `user_roles` rows, followed by dropping the obsolete `user.role` enum column.

## Consequences

### Positive
- Super Administrators have full autonomy to construct customized institutional roles.
- Fine-grained least-privilege security across all Server Actions, APIs, and dashboard views.
- Instant permission updates via granular cache invalidation without JWT bloat.

### Negative / Trade-offs
- Slight increase in database schema complexity (4 new tables).
- Requires updating authorization checks in all Server Actions from `actor.role === "admin"` to `hasPermission(actorId, "resource:action")`.
