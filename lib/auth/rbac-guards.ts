import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import type { AppPermission } from "@/lib/auth/permissions-catalog"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"

export const WILDCARD_PERMISSION = "*"

export function hasPermission(
  userPermissions: readonly string[] | Set<string>,
  requiredPermission: AppPermission | string
): boolean {
  if (userPermissions instanceof Set) {
    return (
      userPermissions.has(WILDCARD_PERMISSION) ||
      userPermissions.has(requiredPermission)
    )
  }
  return (
    userPermissions.includes(WILDCARD_PERMISSION) ||
    userPermissions.includes(requiredPermission)
  )
}

export function hasAnyPermission(
  userPermissions: readonly string[] | Set<string>,
  requiredPermissions: readonly (AppPermission | string)[]
): boolean {
  if (requiredPermissions.length === 0) return true
  const permSet =
    userPermissions instanceof Set
      ? userPermissions
      : new Set(userPermissions)

  if (permSet.has(WILDCARD_PERMISSION)) return true

  return requiredPermissions.some((p) => permSet.has(p))
}

export function hasAllPermissions(
  userPermissions: readonly string[] | Set<string>,
  requiredPermissions: readonly (AppPermission | string)[]
): boolean {
  const permSet =
    userPermissions instanceof Set
      ? userPermissions
      : new Set(userPermissions)

  if (permSet.has(WILDCARD_PERMISSION)) return true

  return requiredPermissions.every((p) => permSet.has(p))
}

/**
 * Authenticates the current caller in Server Actions or Server Components.
 * Redirects to /login if unauthenticated.
 */
export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  return session
}

/**
 * Ensures the authenticated caller has the specified permission.
 * Redirects to /dashboard/forbidden if permission check fails.
 */
export async function requirePermission(
  requiredPermission: AppPermission | string
) {
  const session = await requireSession()
  const permissions = await getUserEffectivePermissions(session.user.id)

  if (!hasPermission(permissions, requiredPermission)) {
    redirect("/dashboard/forbidden")
  }

  return {
    session,
    user: session.user,
    permissions,
  }
}

/**
 * Ensures the authenticated caller has at least one of the specified permissions.
 */
export async function requireAnyPermission(
  requiredPermissions: readonly (AppPermission | string)[]
) {
  const session = await requireSession()
  const permissions = await getUserEffectivePermissions(session.user.id)

  if (!hasAnyPermission(permissions, requiredPermissions)) {
    redirect("/dashboard/forbidden")
  }

  return {
    session,
    user: session.user,
    permissions,
  }
}

/**
 * Ensures the authenticated caller has all of the specified permissions.
 */
export async function requireAllPermissions(
  requiredPermissions: readonly (AppPermission | string)[]
) {
  const session = await requireSession()
  const permissions = await getUserEffectivePermissions(session.user.id)

  if (!hasAllPermissions(permissions, requiredPermissions)) {
    redirect("/dashboard/forbidden")
  }

  return {
    session,
    user: session.user,
    permissions,
  }
}

/**
 * Ensures the authenticated caller is a super-admin.
 */
export async function requireSuperAdmin() {
  const session = await requireSession()
  const permissions = await getUserEffectivePermissions(session.user.id)

  if (!permissions.includes(WILDCARD_PERMISSION)) {
    redirect("/dashboard/forbidden")
  }

  return {
    session,
    user: session.user,
    permissions,
  }
}
