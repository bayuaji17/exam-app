"use server"

import { revalidateTag } from "next/cache"
import { eq, inArray, sql } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { CACHE_TAGS, getUserPermissionsTag } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { permission, role, rolePermission, userRole } from "@/lib/db/schema"
import { ensureUniqueSlug } from "@/lib/slugs"
import { roleFormSchema, type RoleFormValues } from "./validation"

export interface RoleActionResult {
  ok: true
  id: string
}

export interface RoleActionError {
  ok: false
  message: string
}

export async function roleNameTaken(
  name: string,
  excludeId?: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: role.id })
    .from(role)
    .where(sql`lower(${role.name}) = lower(${name})`)
    .limit(1)

  return Boolean(row && row.id !== excludeId)
}

async function roleSlugTaken(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.slug, slug))
    .limit(1)

  return Boolean(row)
}

/**
 * Creates a new custom role with associated permissions.
 */
export async function createRoleAction(
  values: RoleFormValues
): Promise<RoleActionResult | RoleActionError> {
  await requirePermission(PERMISSIONS.ROLES_CREATE)

  const parsed = roleFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data role tidak valid.",
    }
  }

  if (await roleNameTaken(parsed.data.name)) {
    return {
      ok: false,
      message: `Role dengan nama "${parsed.data.name}" sudah ada.`,
    }
  }

  const roleId = crypto.randomUUID()
  const slug = await ensureUniqueSlug(parsed.data.name, roleSlugTaken)

  // Fetch permission IDs for the selected permission names
  let permissionIds: string[] = []
  if (parsed.data.permissions.length > 0) {
    const permRows = await db
      .select({ id: permission.id })
      .from(permission)
      .where(inArray(permission.name, parsed.data.permissions))

    permissionIds = permRows.map((p) => p.id)
  }

  await db.transaction(async (tx) => {
    await tx.insert(role).values({
      id: roleId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      isSystem: false,
      isDefault: false,
    })

    if (permissionIds.length > 0) {
      await tx.insert(rolePermission).values(
        permissionIds.map((pId) => ({
          roleId,
          permissionId: pId,
        }))
      )
    }
  })

  revalidateTag(CACHE_TAGS.ROLES, "default")

  return { ok: true, id: roleId }
}

/**
 * Updates role metadata and updates assigned permissions.
 */
export async function updateRoleAction(
  roleId: string,
  values: RoleFormValues
): Promise<RoleActionResult | RoleActionError> {
  await requirePermission(PERMISSIONS.ROLES_UPDATE)

  const parsed = roleFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data role tidak valid.",
    }
  }

  const [existingRole] = await db
    .select()
    .from(role)
    .where(eq(role.id, roleId))
    .limit(1)

  if (!existingRole) {
    return {
      ok: false,
      message: "Role tidak ditemukan.",
    }
  }

  if (await roleNameTaken(parsed.data.name, roleId)) {
    return {
      ok: false,
      message: `Role dengan nama "${parsed.data.name}" sudah digunakan.`,
    }
  }

  // Fetch permission IDs
  let permissionIds: string[] = []
  if (parsed.data.permissions.length > 0) {
    const permRows = await db
      .select({ id: permission.id })
      .from(permission)
      .where(inArray(permission.name, parsed.data.permissions))

    permissionIds = permRows.map((p) => p.id)
  }

  // Find all assigned users to invalidate their permission caches
  const assignedUsers = await db
    .select({ userId: userRole.userId })
    .from(userRole)
    .where(eq(userRole.roleId, roleId))

  await db.transaction(async (tx) => {
    await tx
      .update(role)
      .set({
        name: parsed.data.name,
        description: parsed.data.description,
        updatedAt: new Date(),
      })
      .where(eq(role.id, roleId))

    // Remove existing role permissions and insert updated set
    await tx.delete(rolePermission).where(eq(rolePermission.roleId, roleId))

    if (permissionIds.length > 0) {
      await tx.insert(rolePermission).values(
        permissionIds.map((pId) => ({
          roleId,
          permissionId: pId,
        }))
      )
    }
  })

  // Invalidate caches
  revalidateTag(CACHE_TAGS.ROLES, "default")
  for (const u of assignedUsers) {
    revalidateTag(getUserPermissionsTag(u.userId), "default")
  }

  return { ok: true, id: roleId }
}

/**
 * Deletes a custom role if it is not a system role and has no assigned users.
 */
export async function deleteRoleAction(
  roleId: string
): Promise<{ ok: true } | RoleActionError> {
  await requirePermission(PERMISSIONS.ROLES_DELETE)

  const [existingRole] = await db
    .select()
    .from(role)
    .where(eq(role.id, roleId))
    .limit(1)

  if (!existingRole) {
    return {
      ok: false,
      message: "Role tidak ditemukan.",
    }
  }

  if (existingRole.isSystem) {
    return {
      ok: false,
      message: "Role sistem tidak dapat dihapus.",
    }
  }

  // Count assigned users
  const [userCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userRole)
    .where(eq(userRole.roleId, roleId))

  const userCount = Number(userCountResult?.count || 0)
  if (userCount > 0) {
    return {
      ok: false,
      message: `Role tidak dapat dihapus karena masih digunakan oleh ${userCount} pengguna. Pindahkan pengguna ke role lain terlebih dahulu.`,
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(rolePermission).where(eq(rolePermission.roleId, roleId))
    await tx.delete(role).where(eq(role.id, roleId))
  })

  revalidateTag(CACHE_TAGS.ROLES, "default")

  return { ok: true }
}
