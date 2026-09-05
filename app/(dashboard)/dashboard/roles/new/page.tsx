import { redirect } from "next/navigation"

import { RoleForm } from "@/components/roles/role-form"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { hasPermission } from "@/lib/auth/rbac-guards"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { getDashboardSession } from "@/lib/auth/session"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function NewRolePage() {
  const { session } = await getDashboardSession()

  if (!session) {
    redirect("/login")
  }

  const permissions = await getUserEffectivePermissions(session.user.id)
  const authorized = hasPermission(permissions, PERMISSIONS.ROLES_CREATE)
  if (!authorized) {
    redirect("/dashboard/forbidden")
  }

  return <RoleForm />
}
