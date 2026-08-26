import { eq, inArray } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"

import { PERMISSION_DEFINITIONS } from "@/lib/auth/permissions-catalog"
import {
  DEFAULT_ROLE_DEFINITIONS,
  SYSTEM_ROLES,
  getInitialPermissionsForRole,
} from "@/lib/auth/seed-definitions"
import * as schema from "@/lib/db/schema"
import {
  permission,
  role,
  rolePermission,
  user,
  userRole,
} from "@/lib/db/schema"

export type DatabaseClient = NodePgDatabase<typeof schema>

/**
 * Seeds static permissions catalog, system roles, and baseline role permissions idempotently.
 */
export async function seedRbac(db: DatabaseClient) {
  // 1. Seed all permissions
  for (const def of PERMISSION_DEFINITIONS) {
    const existing = await db
      .select({ id: permission.id })
      .from(permission)
      .where(eq(permission.name, def.name))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(permission).values({
        id: crypto.randomUUID(),
        resource: def.resource,
        action: def.action,
        name: def.name,
        description: def.description,
        module: def.module,
      })
    }
  }

  // 2. Seed default roles
  const roleIdMap = new Map<string, string>()

  for (const def of DEFAULT_ROLE_DEFINITIONS) {
    const existing = await db
      .select({ id: role.id })
      .from(role)
      .where(eq(role.slug, def.slug))
      .limit(1)

    let roleId: string
    if (existing.length === 0) {
      roleId = crypto.randomUUID()
      await db.insert(role).values({
        id: roleId,
        name: def.name,
        slug: def.slug,
        description: def.description,
        isSystem: def.isSystem,
        isDefault: def.isDefault,
      })
    } else {
      roleId = existing[0].id
    }
    roleIdMap.set(def.slug, roleId)
  }

  // 3. Attach initial permissions to roles (e.g. admin role)
  for (const def of DEFAULT_ROLE_DEFINITIONS) {
    const initialPermNames = getInitialPermissionsForRole(def.slug)
    if (initialPermNames.length === 0) continue

    const targetRoleId = roleIdMap.get(def.slug)
    if (!targetRoleId) continue

    // Fetch permission records for these names
    const permRows = await db
      .select({ id: permission.id, name: permission.name })
      .from(permission)
      .where(inArray(permission.name, [...initialPermNames]))

    for (const p of permRows) {
      const existingRp = await db
        .select({
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        })
        .from(rolePermission)
        .where(eq(rolePermission.roleId, targetRoleId))

      // We only insert if not already attached
      const isAlreadyAttached = existingRp.some(
        (r: { roleId: string; permissionId: string }) => r.permissionId === p.id
      )

      if (!isAlreadyAttached) {
        await db
          .insert(rolePermission)
          .values({
            roleId: targetRoleId,
            permissionId: p.id,
          })
          .onConflictDoNothing?.()
      }
    }
  }

  return { roleIdMap }
}

/**
 * Migration helper to migrate legacy `user.role` column records into `user_roles` join table.
 */
export async function migrateLegacyUserRoles(db: DatabaseClient) {
  // Ensure roles exist
  const { roleIdMap } = await seedRbac(db)

  // Fetch all users
  const allUsers = await db
    .select({
      id: user.id,
      role: user.role,
    })
    .from(user)

  let migratedCount = 0

  for (const u of allUsers) {
    const targetSlug = u.role || SYSTEM_ROLES.USER
    const targetRoleId =
      roleIdMap.get(targetSlug) || roleIdMap.get(SYSTEM_ROLES.USER)

    if (targetRoleId) {
      const existingAssignment = await db
        .select({ userId: userRole.userId })
        .from(userRole)
        .where(eq(userRole.userId, u.id))
        .limit(1)

      if (existingAssignment.length === 0) {
        await db
          .insert(userRole)
          .values({
            userId: u.id,
            roleId: targetRoleId,
          })
          .onConflictDoNothing?.()
        migratedCount++
      }
    }
  }

  return { migratedCount, totalUsers: allUsers.length }
}
