"use server"

import { revalidateTag } from "next/cache"
import { eq, inArray } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { isSuperAdmin } from "@/lib/auth/rbac-queries"
import { SYSTEM_ROLES } from "@/lib/auth/seed-definitions"
import { CACHE_TAGS, getUserPermissionsTag } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { role, user, userRole } from "@/lib/db/schema"

export interface AssignUserRolesResult {
  ok: true
}

export interface AssignUserRolesError {
  ok: false
  message: string
}

/**
 * Assigns one or more roles to a target user.
 * Guards against privilege escalation (only super-admin can assign super-admin role).
 */
export async function assignUserRolesAction(
  userId: string,
  roleIds: string[]
): Promise<AssignUserRolesResult | AssignUserRolesError> {
  const { user: actor } = await requirePermission(PERMISSIONS.ROLES_ASSIGN)

  const [targetUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  if (!targetUser) {
    return { ok: false, message: "Pengguna tidak ditemukan." }
  }

  // Validate target roles
  let targetRoles: Array<{ id: string; slug: string; isSystem: boolean }> = []
  if (roleIds.length > 0) {
    targetRoles = await db
      .select({ id: role.id, slug: role.slug, isSystem: role.isSystem })
      .from(role)
      .where(inArray(role.id, roleIds))

    if (targetRoles.length !== roleIds.length) {
      return {
        ok: false,
        message: "Satu atau lebih role yang dipilih tidak valid.",
      }
    }
  }

  // Privilege Escalation Guard
  const hasSuperAdminRole = targetRoles.some(
    (r) => r.slug === SYSTEM_ROLES.SUPER_ADMIN
  )

  if (hasSuperAdminRole) {
    const actorIsSuper = await isSuperAdmin(actor.id)
    if (!actorIsSuper) {
      return {
        ok: false,
        message:
          "Hanya Super Administrator yang dapat menugaskan role Super Admin.",
      }
    }
  }

  // Synchronize user_role table
  await db.transaction(async (tx) => {
    await tx.delete(userRole).where(eq(userRole.userId, userId))

    if (roleIds.length > 0) {
      await tx.insert(userRole).values(
        roleIds.map((rId) => ({
          userId,
          roleId: rId,
        }))
      )
    }
  })

  // Invalidate cache tags
  revalidateTag(getUserPermissionsTag(userId), "default")
  revalidateTag(CACHE_TAGS.USERS, "default")

  return { ok: true }
}
