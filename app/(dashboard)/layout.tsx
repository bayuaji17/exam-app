import { Suspense } from "react"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardBreadcrumb } from "@/components/dashboard-components/dashboard-breadcrumb"
import { HydrationMarker } from "@/components/hydration-marker"
import { AppSidebarSlot } from "@/components/dashboard-components/sidebar-dashboard-slot"
import { DashboardProfileMenuSlot } from "@/components/dashboard-components/dashboard-profile-menu-slot"
import {
  SidebarSkeleton,
  ProfileMenuSkeleton,
} from "@/components/dashboard-components/skeletons"

export default function LayoutDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebarSlot />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DashboardBreadcrumb />
          <div className="ml-auto flex shrink-0 items-center">
            <Suspense fallback={<ProfileMenuSkeleton />}>
              <DashboardProfileMenuSlot />
            </Suspense>
            <HydrationMarker />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
