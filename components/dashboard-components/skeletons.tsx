import { Skeleton } from "@/components/ui/skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function SidebarSkeleton() {
  return (
    <div
      data-slot="sidebar-skeleton"
      aria-busy="true"
      aria-label="Loading sidebar navigation"
      className="h-full"
    >
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex h-12 items-center gap-3 px-2 py-1.5">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {[1, 2, 3].map((group) => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>
                <Skeleton className="h-3 w-20" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[1, 2, 3].map((item) => (
                    <SidebarMenuItem key={item}>
                      <div className="flex h-8 items-center gap-3 px-2 py-1">
                        <Skeleton className="size-4 rounded" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                  \n{" "}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </div>
  )
}

export function ProfileMenuSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading user profile"
      className="flex size-10 items-center justify-center rounded-full md:w-auto md:gap-2 md:px-2"
    >
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="hidden h-4 w-20 md:inline-block" />
    </div>
  )
}

export function StatsCardsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard statistics"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border p-4">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading table data"
      className="w-full space-y-3 rounded-lg border p-4"
    >
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        <div className="flex gap-4 border-b pb-2">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 py-2">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function UpcomingSchedulesSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading upcoming schedules"
      className="space-y-3 rounded-lg border p-4"
    >
      <Skeleton className="h-6 w-40" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b py-2 last:border-b-0"
          >
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BankDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading question bank details"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}
