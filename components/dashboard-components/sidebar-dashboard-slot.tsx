import { redirect } from "next/navigation"
import { getDashboardSession } from "@/lib/auth/session"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
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

  if (!userHasPermission(role, pathname)) {
    redirect("/dashboard/forbidden")
    return null
  }

  return <AppSidebar role={role} />
}
