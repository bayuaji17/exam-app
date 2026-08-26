import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import type { AppPermission } from "@/lib/auth/permissions-catalog"
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  WILDCARD_PERMISSION,
} from "@/lib/auth/permissions-catalog"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"

export {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  WILDCARD_PERMISSION,
}

/**
 * Authenticates the current caller in Server Actions or Server Components.
 * Redirects to /login if unauthenticated.
 */
export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session || !session.user) {
    redirect("/login")
  }

  return session
}

/**
 * Ensures the authenticated user has the required dynamic permission.
 * Bypasses immediately if user has the wildcard (*) permission (e.g. super-admin).
 * Redirects to /dashboard/forbidden if unauthorized.
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
    session: session.session,
    user: session.user,
    permissions,
  }
}

/**
 * Ensures the authenticated user has at least one of the specified permissions.
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
    session: session.session,
    user: session.user,
    permissions,
  }
}

/**
 * Requires super-admin / wildcard permission (*).
 */
export async function requireSuperAdmin() {
  const session = await requireSession()
  const permissions = await getUserEffectivePermissions(session.user.id)

  const permSet =
    permissions instanceof Set ? permissions : new Set(permissions)

  if (!permSet.has(WILDCARD_PERMISSION)) {
    redirect("/dashboard/forbidden")
  }

  return {
    session: session.session,
    user: session.user,
    permissions,
  }
}
