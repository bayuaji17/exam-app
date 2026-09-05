import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  StatsCardsSkeleton,
  UpcomingSchedulesSkeleton,
} from "@/components/dashboard-components/skeletons"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getDashboardSession } from "@/lib/auth/session"
import { getDashboardStats, listUpcomingSchedules } from "@/lib/dashboard/stats"

const DASHBOARD_PATH = "/dashboard"

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const STAT_CARDS = [
  { key: "banks", label: "Bank Soal", href: "/dashboard/question-banks" },
  { key: "questions", label: "Soal", href: "/dashboard/question-banks" },
  { key: "packages", label: "Paket Ujian", href: "/dashboard/exams" },
  { key: "schedules", label: "Jadwal", href: "/dashboard/exam-schedules" },
  { key: "attempts", label: "Pengerjaan", href: "/dashboard/exam-results" },
  { key: "users", label: "Peserta", href: "/dashboard/users" },
] as const

async function DashboardStatsCards() {
  const stats = await getDashboardStats()

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {STAT_CARDS.map((card) => (
        <Link
          className="rounded-lg border p-4 transition-colors hover:bg-accent"
          href={card.href}
          key={card.key}
        >
          <p className="text-3xl font-semibold">{stats[card.key]}</p>
          <p className="text-sm text-muted-foreground">{card.label}</p>
        </Link>
      ))}
    </div>
  )
}

async function UpcomingSchedulesList() {
  const upcoming = await listUpcomingSchedules()

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Jadwal Mendatang</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jadwal</TableHead>
              <TableHead>Mulai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcoming.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-20 text-center text-muted-foreground"
                >
                  Belum ada jadwal mendatang.
                </TableCell>
              </TableRow>
            ) : (
              upcoming.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(schedule.startsAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

async function DashboardOverviewContent() {
  const { session } = await getDashboardSession()

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, DASHBOARD_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const isAdmin = role === APP_ROLES.ADMIN || role === APP_ROLES.SUPER_ADMIN

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Halo, {session.user.name}!</h1>
        <p className="text-muted-foreground">
          Kunjungi{" "}
          <Link
            className="underline underline-offset-4 hover:no-underline"
            href="/exam"
          >
            Ujian Saya
          </Link>{" "}
          untuk melihat ujian yang tersedia untuk Anda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<StatsCardsSkeleton />}>
        <DashboardStatsCards />
      </Suspense>

      <Suspense fallback={<UpcomingSchedulesSkeleton />}>
        <UpcomingSchedulesList />
      </Suspense>
    </div>
  )
}

export default function DashboardHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan aktivitas platform.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <StatsCardsSkeleton />
            <UpcomingSchedulesSkeleton />
          </div>
        }
      >
        <DashboardOverviewContent />
      </Suspense>
    </div>
  )
}
