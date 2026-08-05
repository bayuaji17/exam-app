import { AppSidebar } from "@/components/dashboard-components/sidebar-dashboard"
import { DashboardProfileMenu } from "@/components/dashboard-components/dashboard-profile-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })

  if (!session) {
    redirect("/login")
  }

  const pathname = requestHeaders.get("x-pathname") ?? "/dashboard"
  const [role] = getAppRoles(session.user.role)

  // A session whose role is missing or unrecognised is broken rather than
  // merely unauthorised: send it back to sign in instead of to the forbidden
  // page, which would bounce forever because it also requires a valid role.
  if (!role) {
    redirect("/login")
  }

  if (!userHasPermission(role, pathname)) {
    redirect("/dashboard/forbidden")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex shrink-0 items-center">
            <DashboardProfileMenu />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
