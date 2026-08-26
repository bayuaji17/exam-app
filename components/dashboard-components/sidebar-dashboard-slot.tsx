import { redirect } from "next/navigation"
import { getDashboardSession } from "@/lib/auth/session"
import { getAppRoles } from "@/lib/auth-roles"
import { canAccessRoute } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { AppSidebar } from "./sidebar-dashboard"

export async function AppSidebarSlot() {
  const { session, pathname } = await getDashboardSession()

  if (!session) {
    redirect("/login")
    return null
  }

  const [role] = getAppRoles(session.user.role)

  if (!role) {
    redirect("/login")
    return null
  }

  const permissions = await getUserEffectivePermissions(session.user.id)

  if (!canAccessRoute(permissions, pathname)) {
    redirect("/dashboard/forbidden")
    return null
  }

  return <AppSidebar permissions={Array.from(permissions)} role={role} />
}
