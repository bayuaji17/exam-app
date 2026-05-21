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
  MonitorCheckIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserCogIcon,
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
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const sidebarMenuLinkClassName =
  "hover:bg-accent/70 hover:text-accent-foreground focus-visible:ring-ring active:bg-accent active:text-accent-foreground data-active:bg-accent data-active:text-accent-foreground data-active:font-medium [&_svg]:text-current my-1"

const dashboardMenu = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: GaugeIcon,
      },
    ],
  },
  {
    title: "Manajemen Pengguna",
    items: [
      {
        title: "Peserta",
        url: "/dashboard/users",
        icon: UsersIcon,
      },
      {
        title: "Grup Peserta",
        url: "/dashboard/user-groups",
        icon: UserCogIcon,
      },
      {
        title: "Admin",
        url: "/dashboard/admins",
        icon: ShieldCheckIcon,
      },
      {
        title: "Role & Hak Akses",
        url: "/dashboard/roles",
        icon: KeyRoundIcon,
      },
    ],
  },
  {
    title: "Manajemen Ujian",
    items: [
      {
        title: "Bank Soal",
        url: "/dashboard/question-banks",
        icon: BookOpenIcon,
      },
      {
        title: "Paket Ujian",
        url: "/dashboard/exams",
        icon: FileQuestionIcon,
      },
      {
        title: "Jadwal Ujian",
        url: "/dashboard/exam-schedules",
        icon: CalendarClockIcon,
      },
      {
        title: "Sesi Ujian",
        url: "/dashboard/exam-sessions",
        icon: MonitorCheckIcon,
      },
      {
        title: "Aturan Akses",
        url: "/dashboard/exam-access-rules",
        icon: ListChecksIcon,
      },
      {
        title: "Introduction Ujian",
        url: "/dashboard/exam-introductions",
        icon: ScrollTextIcon,
      },
    ],
  },
  {
    title: "Penilaian",
    items: [
      {
        title: "Penilaian Manual",
        url: "/dashboard/manual-grading",
        icon: ClipboardCheckIcon,
      },
      {
        title: "Aturan Penilaian",
        url: "/dashboard/scoring-rules",
        icon: ListChecksIcon,
      },
      {
        title: "Hasil Ujian",
        url: "/dashboard/exam-results",
        icon: BarChart3Icon,
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        title: "Activity Tracking",
        url: "/dashboard/activity-tracking",
        icon: ActivityIcon,
      },
      {
        title: "Anti-cheat",
        url: "/dashboard/anti-cheat",
        icon: ShieldCheckIcon,
      },
      {
        title: "Riwayat Pengerjaan",
        url: "/dashboard/attempt-history",
        icon: ClipboardCheckIcon,
      },
    ],
  },
  {
    title: "Laporan",
    items: [
      {
        title: "Laporan Hasil Ujian",
        url: "/dashboard/reports/exam-results",
        icon: BarChart3Icon,
      },
      {
        title: "Laporan Individu",
        url: "/dashboard/reports/individual",
        icon: GraduationCapIcon,
      },
      {
        title: "Laporan Per Sesi",
        url: "/dashboard/reports/sessions",
        icon: MonitorCheckIcon,
      },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      {
        title: "Konfigurasi Global",
        url: "/dashboard/settings",
        icon: SettingsIcon,
      },
    ],
  },
]

function isActiveRoute(pathname: string, url: string) {
  if (url === "/dashboard") {
    return pathname === url
  }

  return pathname === url || pathname.startsWith(`${url}/`)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

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
        {dashboardMenu.map((group) => (
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
                      const Icon = item.icon

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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={cn(sidebarMenuLinkClassName)}
              isActive={isActiveRoute(pathname, "/dashboard/settings")}
            >
              <Link href="/dashboard/settings">
                <SettingsIcon />
                <span>Pengaturan Akun</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
