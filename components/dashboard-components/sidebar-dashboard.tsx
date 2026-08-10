"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ActivityIcon,
  BarChart3Icon,
  BookOpenIcon,
  CalendarClockIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileQuestionIcon,
  GaugeIcon,
  GraduationCapIcon,
  KeyRoundIcon,
  ListChecksIcon,
  type LucideIcon,
  MonitorCheckIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { SystemRole } from "@/lib/auth-roles"
import { getVisibleMenu } from "@/lib/dashboard/menu"
import { cn } from "@/lib/utils"

const sidebarMenuLinkClassName =
  "hover:bg-accent/70 hover:text-accent-foreground focus-visible:ring-ring active:bg-accent active:text-accent-foreground data-active:bg-accent data-active:text-accent-foreground data-active:font-medium [&_svg]:text-current my-1"

/**
 * Icons stay with the component rather than the menu data, so `lib/dashboard`
 * has no React dependency and can be unit tested on its own.
 */
const MENU_ICONS: Record<string, LucideIcon> = {
  "/dashboard": GaugeIcon,
  "/dashboard/users": UsersIcon,
  "/dashboard/user-groups": UserCogIcon,
  "/dashboard/admins": ShieldCheckIcon,
  "/dashboard/roles": KeyRoundIcon,
  "/dashboard/question-banks": BookOpenIcon,
  "/dashboard/exams": FileQuestionIcon,
  "/dashboard/exam-schedules": CalendarClockIcon,
  "/dashboard/exam-sessions": MonitorCheckIcon,
  "/dashboard/exam-access-rules": ListChecksIcon,
  "/dashboard/exam-introductions": ScrollTextIcon,
  "/dashboard/manual-grading": ClipboardCheckIcon,
  "/dashboard/scoring-rules": ListChecksIcon,
  "/dashboard/exam-results": BarChart3Icon,
  "/dashboard/activity-tracking": ActivityIcon,
  "/dashboard/anti-cheat": ShieldCheckIcon,
  "/dashboard/attempt-history": ClipboardCheckIcon,
  "/dashboard/reports/exam-results": BarChart3Icon,
  "/dashboard/reports/individual": GraduationCapIcon,
  "/dashboard/reports/sessions": MonitorCheckIcon,
  "/dashboard/settings/profile": UserIcon,
  "/dashboard/settings/security": ShieldCheckIcon,
  "/dashboard/settings/system": SettingsIcon,
}

function isActiveRoute(pathname: string, url: string) {
  if (url === "/dashboard") {
    return pathname === url
  }

  return pathname === url || pathname.startsWith(`${url}/`)
}

export function AppSidebar({
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & { role: SystemRole }) {
  const pathname = usePathname()

  // The role arrives from the server component that renders this sidebar, so
  // the correct menu is in the first paint. Reading the session on the client
  // would leave a pending frame and shift the layout once it resolved.
  const menu = getVisibleMenu(role)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className={cn(sidebarMenuLinkClassName)}
            >
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCapIcon />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">Exam App</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menu.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="cursor-pointer hover:bg-accent/70 hover:text-accent-foreground focus-visible:ring-ring">
                  {group.title}
                  <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = MENU_ICONS[item.url] ?? GaugeIcon

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={cn(sidebarMenuLinkClassName)}
                            isActive={isActiveRoute(pathname, item.url)}
                            tooltip={item.title}
                          >
                            <Link href={item.url}>
                              <Icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
