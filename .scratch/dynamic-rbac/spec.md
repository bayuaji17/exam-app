# Spec: Dynamic Role-Based Access Control (RBAC) System

Status: ready-for-agent

## Problem Statement

Currently, the application relies on a hardcoded 3-tier system role enum (`super-admin`, `admin`, `user`) configured statically via Better Auth and route tier maps. This static model cannot accommodate modern institutional requirements where organizations need custom administrative roles (such as Subject Teachers, Exam Authors, Proctors, and Reviewers) with precise, fine-grained access control.

Furthermore, users cannot hold multiple concurrent operational roles (e.g., a Teacher who is also assigned as an Exam Proctor), and Super Administrators cannot customize or grant permissions dynamically through the management UI without modifying source code and redeploying the application.

## Solution

A complete, database-backed **Dynamic Role-Based Access Control (RBAC)** subsystem providing:
1. **Static Permission Catalog (`resource:action`):** Immutable capability identifiers defined in application code representing discrete, enforceable backend operations.
2. **System Roles & Custom Dynamic Roles:**
   - `super-admin` (Immutable System Role) with wildcard bypass across all operations, exclusive authority to create and modify roles, and protection against removal or alteration.
   - `user` (Immutable Default System Role) assigned to regular participants upon registration and bulk Excel import.
   - Custom Roles created, configured with arbitrary permission sets, and managed by Super Administrators.
3. **Many-to-Many Role Assignment:** Users can hold multiple roles simultaneously via the `user_roles` association; effective permissions are evaluated as the union of all permissions granted across assigned roles.
4. **Cached Invalidation & High Performance:** Permission evaluations leverage Next.js Cache Components with deterministic tag invalidation (`permissions:user:${userId}`), ensuring zero token/cookie bloat and instantaneous permission propagation upon administrative updates.
5. **Robust Privilege Escalation & Deletion Guards:** Strict domain invariant enforcement preventing unauthorized role delegation, privilege escalation, or deletion of in-use roles.
6. **Super Administrator Management UI:** A clean permission matrix organized by domain modules allowing intuitive checkbox assignment of capabilities per role.

---

## User Stories

1. As a Super Administrator, I want to view a list of all existing roles (both system and custom roles) along with their assigned user counts, so that I have complete visibility into system access.
2. As a Super Administrator, I want to create a new custom role with a unique name and description, so that I can model specific institutional responsibilities (e.g., "Guru Matematika", "Pengawas Ruang 01").
3. As a Super Administrator, I want to select permissions for a role using an organized checkbox matrix grouped by module, so that I can configure least-privilege access accurately and quickly.
4. As a Super Administrator, I want to edit the permission matrix of an existing custom role, so that I can adapt staff permissions as responsibilities change.
5. As a Super Administrator, I want to delete an unused custom role, so that the role catalog stays tidy.
6. As a Super Administrator, I want the system to block the deletion of any role currently assigned to active users, so that user permissions are never silently invalidated or left in an inconsistent state.
7. As a Super Administrator, I want system roles (`super-admin` and `user`) to be permanently protected from renaming, deletion, or permission stripping, so that platform stability and core access are guaranteed.
8. As a Super Administrator, I want full wildcard access to every action and route in the system without needing manual assignment of individual permissions, so that I never get locked out.
9. As an Administrator with `roles:assign` permission, I want to assign or unassign one or multiple roles to a user account, so that users have the exact permissions required for their tasks.
10. As an Administrator, I want the system to prevent me from assigning the `super-admin` role to anyone unless I am already a Super Administrator, so that privilege escalation is prevented.
11. As a Staff Member with multiple assigned roles (e.g., Teacher + Proctor), I want my account to possess the combined union of all permissions from all my assigned roles, so that I can perform all my duties seamlessly without switching accounts.
12. As a Staff Member, I want any changes made by an administrator to my assigned roles or permissions to take effect immediately on my next action, so that I do not need to log out and log back in.
13. As a Staff Member, I want the navigation sidebar and dashboard action buttons to dynamically show only the menus and features I have permission to access, so that the UI remains uncluttered and relevant.
14. As an Unauthorized User, I want the backend to reject any Server Action or direct API request that violates my permissions with a clear forbidden error, so that security is enforced regardless of UI tampering.
15. As a System Participant registering a new account or being imported via `.xlsx`, I want my account to automatically receive the default system `user` role, so that I can participate in exams immediately.
16. As an Administrator, I want bulk participant imports to complete without breaking role constraints, so that student onboarding remains fast and reliable.

---

## Implementation Decisions

### 1. Database Schema & Migration Architecture
- Four dedicated relational tables will be introduced:
  - **`roles`**: `id` (text/UUID PK), `name` (unique text), `slug` (unique text), `description` (text, nullable), `isSystem` (boolean default false), `isDefault` (boolean default false), `createdAt`, `updatedAt`.
  - **`permissions`**: `id` (text/UUID PK), `resource` (text), `action` (text), `name` (text, unique e.g. `resource:action`), `description` (text, nullable), `module` (text for UI grouping), `createdAt`.
  - **`role_permissions`**: `roleId` (FK to `roles.id` on delete cascade), `permissionId` (FK to `permissions.id` on delete cascade), Composite PK `(roleId, permissionId)`.
  - **`user_roles`**: `userId` (FK to `user.id` on delete cascade), `roleId` (FK to `roles.id` on delete restrict), Composite PK `(userId, roleId)`.
- **Migration Strategy:** Clean cutover migration script.
  - Create the 4 tables.
  - Seed canonical permissions and seed baseline roles: `super-admin` (`isSystem: true`), `admin` (`isSystem: false`), and `user` (`isSystem: true, isDefault: true`).
  - Migrate all existing records from the legacy `user.role` column into corresponding entries in `user_roles`.
  - Drop the legacy `user.role` column and obsolete `app_role` PostgreSQL enum.

### 2. Static Permission Taxonomy
The static permission catalog defines capabilities strictly in the format `resource:action`:
- **`users`**: `users:create`, `users:read`, `users:update`, `users:delete`, `users:ban`, `users:import`
- **`user_groups`**: `user_groups:create`, `user_groups:read`, `user_groups:update`, `user_groups:delete`
- **`roles`**: `roles:create`, `roles:read`, `roles:update`, `roles:delete`, `roles:assign`
- **`question_banks`**: `question_banks:create`, `question_banks:read`, `question_banks:update`, `question_banks:delete`
- **`question_categories`**: `question_categories:create`, `question_categories:read`, `question_categories:update`, `question_categories:delete`
- **`exams`**: `exams:create`, `exams:read`, `exams:update`, `exams:delete`, `exams:questions_manage`
- **`exam_schedules`**: `exam_schedules:create`, `exam_schedules:read`, `exam_schedules:update`, `exam_schedules:delete`, `eligibility:manage`
- **`grading`**: `grading:read`, `grading:evaluate`
- **`results`**: `results:read`
- **`reports`**: `reports:export`
- **`system`**: `system_settings:read`, `system_settings:update`, `activity_logs:read`

### 3. Decoupled Authorization Seam & Cache Architecture
- **Better Auth Boundary:** Better Auth handles authentication, session token issuance, and password verification. Better Auth is decoupled from dynamic permission checking.
- **Permission Guard Engine:**
  - `getUserEffectivePermissions(userId)`: Resolves all permission strings for a user across all assigned roles. Cached with `"use cache"` tagged with `permissions:user:${userId}`.
  - `hasPermission(userId, permission)`: Checks if user possesses the specific permission or holds `super-admin` status.
  - `requirePermission(permission)`: Server Action guard helper that retrieves the authenticated session, checks permission, and throws `ForbiddenError` if unauthorized.
  - `revalidateUserPermissions(userId)` and `revalidateRolePermissions(roleId)`: Invalidate relevant cache tags whenever roles or assignments are updated.

### 4. Privilege Escalation & Business Rules
- Only actors with `super-admin` system role may invoke `roles:create`, `roles:update`, or `roles:delete`.
- Actors with `roles:assign` may only assign or remove non-system roles to other users. Attempting to assign `super-admin` without being a Super Admin throws `UnauthorizedError`.
- Deleting a role that has 1 or more assigned users in `user_roles` is rejected with `RoleInUseError`.
- System roles (`isSystem: true`) cannot be edited in name or deleted.

### 5. UI Presentation & Navigation
- **Role Management Surface (`/dashboard/roles`):**
  - Listing view showing Role Name, Type (System / Custom), Assigned Users Count, and Action buttons.
  - Create / Edit Role views presenting the Permission Matrix table grouped by module with select-all conveniences.
- **Dynamic Navigation Filter:** App sidebar and dashboard navigation menus filter visible items by evaluating the user's effective permissions.

---

## Testing Decisions

### What makes a good test
- Tests must verify external authorization behavior and invariants, not internal SQL query constructions.
- Server Action tests must confirm that actions succeed when permissions are present, and fail with expected error status/messages when permissions are missing.
- Tests must verify that `super-admin` bypasses all restrictions, while custom roles respect exact permission boundaries.
- Cache invalidation tests must ensure tag revalidation is triggered on mutations and omitted on validation failures.

### Modules Tested
1. **RBAC Guard Unit Tests:** `hasPermission`, `requirePermission`, wildcard super-admin resolution, multi-role union resolution.
2. **Role Management Server Action Tests:** CRUD operations on roles, permission matrix synchronization, system role immutability enforcement, in-use role deletion blocking.
3. **User Role Assignment Tests:** Assigning single/multiple roles, privilege escalation guards against assigning `super-admin`.
4. **Existing Domain Server Action Guards:** Verifying updated guards on Question Banks, Exams, Schedules, User creation/edit, and Manual Grading.
5. **Route Permission Resolver Tests:** Verifying dashboard route matching against dynamic permissions.

### Prior Art
- `__test__/unit/auth-permissions.test.ts`: Route access validation.
- `__test__/unit/category-actions-cache.test.ts`: Server action authorization & cache tag revalidation testing.
- `__test__/unit/users-create.test.ts` & `__test__/unit/users-edit.test.ts`: Actor-target permission verification.

---

## Out of Scope

1. **Row-level / Tenant-level Permissions:** (e.g., "Teacher A can only edit Question Banks they personally created"). Permissions in this phase are functional/capability-based across the domain.
2. **Time-bounded Role Assignments:** Temporary roles that expire automatically after a specific date/time.
3. **Dynamic Custom Permissions via UI:** Defining novel permission strings from the UI. Permission catalog remains strictly defined in code.
4. **Student Portal Access Control:** Participant exam taking (`/exam/**`) is governed by Exam Schedule Eligibility, not administrative RBAC permissions.

---

## Further Notes

- The data migration must be verified with automated unit tests before applying schema drop operations.
- Seed scripts must be idempotent so that running them multiple times during CI/CD does not duplicate roles or permissions.
