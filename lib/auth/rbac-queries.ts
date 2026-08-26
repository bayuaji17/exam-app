import { eq, inArray, sql } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import {
  PERMISSION_DEFINITIONS,
  PERMISSION_MODULES,
  type PermissionModule,
} from "@/lib/auth/permissions-catalog"
import { SYSTEM_ROLES } from "@/lib/auth/seed-definitions"
import { CACHE_TAGS, getUserPermissionsTag } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { permission, role, rolePermission, userRole } from "@/lib/db/schema"

export interface UserRoleItem {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  isDefault: boolean
}

export interface RoleListItem {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
  permissionsCount: number
  userCount: number
}

/**
 * Cached query fetching the effective permission names for a user.
 * If user has super-admin role, immediately resolves to `["*"]`.
 * Otherwise aggregates unique permissions across all assigned roles.
 */
export async function getUserEffectivePermissions(
  userId: string
): Promise<string[]> {
  "use cache"
  cacheTag(getUserPermissionsTag(userId))
  cacheLife("max")

  if (!userId) {
    return []
  }

  // 1. Fetch user's assigned roles
  const userRoleRows = await db
    .select({
      roleId: role.id,
      slug: role.slug,
      isSystem: role.isSystem,
    })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(userRole.userId, userId))

  if (userRoleRows.length === 0) {
    return []
  }

  // 2. Check for wildcard Super Admin
  const hasSuperAdminRole = userRoleRows.some(
    (r) => r.isSystem && r.slug === SYSTEM_ROLES.SUPER_ADMIN
  )
  if (hasSuperAdminRole) {
    return ["*"]
  }

  // 3. Fetch permissions for all assigned role IDs
  const roleIds = userRoleRows.map((r) => r.roleId)
  const permissionRows = await db
    .select({
      name: permission.name,
    })
    .from(rolePermission)
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(inArray(rolePermission.roleId, roleIds))

  const uniquePermissions = Array.from(
    new Set(permissionRows.map((p) => p.name))
  )

  return uniquePermissions
}

/**
 * Returns all roles assigned to a specific user.
 */
export async function getUserRoles(userId: string): Promise<UserRoleItem[]> {
  if (!userId) return []

  const rows = await db
    .select({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
    })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(userRole.userId, userId))

  return rows
}

/**
 * Checks if a user is a super admin.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const permissions = await getUserEffectivePermissions(userId)
  return permissions.includes("*")
}

/**
 * Returns all roles with counts of assigned permissions and users.
 */
export async function getAllRoles(): Promise<RoleListItem[]> {
  "use cache"
  cacheTag(CACHE_TAGS.ROLES)
  cacheLife("max")

  const roles = await db
    .select({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionsCount: sql<number>`count(distinct ${rolePermission.permissionId})::int`,
      userCount: sql<number>`count(distinct ${userRole.userId})::int`,
    })
    .from(role)
    .leftJoin(rolePermission, eq(role.id, rolePermission.roleId))
    .leftJoin(userRole, eq(role.id, userRole.roleId))
    .groupBy(role.id)
    .orderBy(role.name)

  return roles
}

/**
 * Returns role detail along with assigned permission names.
 */
export async function getRoleWithPermissions(roleIdOrSlug: string) {
  const roleRecord = await db
    .select()
    .from(role)
    .where(
      sql`${role.id} = ${roleIdOrSlug} or ${role.slug} = ${roleIdOrSlug}`
    )
    .limit(1)

  if (roleRecord.length === 0) {
    return null
  }

  const currentRole = roleRecord[0]

  const permRows = await db
    .select({
      name: permission.name,
      id: permission.id,
    })
    .from(rolePermission)
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(eq(rolePermission.roleId, currentRole.id))

  return {
    ...currentRole,
    permissions: permRows.map((p) => p.name),
  }
}

/**
 * Returns all permissions grouped by UI module for the role permissions matrix.
 */
export function getAllPermissionsGrouped() {
  const grouped: Record<
    PermissionModule,
    Array<(typeof PERMISSION_DEFINITIONS)[number]>
  > = {
    users: [],
    user_groups: [],
    roles: [],
    question_banks: [],
    question_categories: [],
    exams: [],
    exam_schedules: [],
    grading: [],
    results: [],
    reports: [],
    system: [],
  }

  for (const moduleName of PERMISSION_MODULES) {
    grouped[moduleName] = PERMISSION_DEFINITIONS.filter(
      (p) => p.module === moduleName
    )
  }

  return grouped
}
