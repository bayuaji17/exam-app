import { notFound, redirect } from "next/navigation"

import { RoleForm } from "@/components/roles/role-form"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { hasPermission } from "@/lib/auth/rbac-guards"
import {
  getRoleWithPermissions,
  getUserEffectivePermissions,
} from "@/lib/auth/rbac-queries"
import { getDashboardSession } from "@/lib/auth/session"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { session } = await getDashboardSession()

  if (!session) {
    redirect("/login")
  }

  const permissions = await getUserEffectivePermissions(session.user.id)
  const authorized = hasPermission(permissions, PERMISSIONS.ROLES_UPDATE)
  if (!authorized) {
    redirect("/dashboard/forbidden")
  }

  const role = await getRoleWithPermissions(id)
  if (!role) {
    notFound()
  }

  return (
    <RoleForm
      role={{
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        isDefault: role.isDefault,
        permissions: role.permissions,
      }}
    />
  )
}
