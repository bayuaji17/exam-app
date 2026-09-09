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
import {
  ParticipantExamList,
  type ParticipantScheduleItem,
} from "@/components/exam-components/participant-exam-list"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getDashboardSession } from "@/lib/auth/session"
import { listAttemptableSchedulesForUser } from "@/lib/attempts/queries"
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
    const rawSchedules = await listAttemptableSchedulesForUser(session.user.id)
    const schedules: ParticipantScheduleItem[] = rawSchedules.map((s) => ({
      scheduleId: s.scheduleId,
      scheduleName: s.scheduleName,
      slug: s.slug,
      packageId: s.packageId,
      packageName: s.packageName,
      token: s.token,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      durationMinutes: s.durationMinutes,
      questionCount: s.questionCount,
      passScore: s.passScore,
      attemptLimit: s.attemptLimit,
      status: s.status,
      openAttemptId: s.openAttemptId,
      openDeadlineAt: s.openDeadlineAt?.toISOString() ?? null,
      submittedCount: s.submittedCount,
      lastScore: s.lastScore,
    }))

    const ongoingCount = schedules.filter((s) => s.status === "ongoing").length
    const upcomingCount = schedules.filter((s) => s.status === "upcoming").length
    const completedCount = schedules.filter((s) => s.submittedCount > 0).length

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Halo, {session.user.name}!</h1>
          <p className="text-sm text-muted-foreground">
            Selamat datang di Portal Ujian. Berikut adalah daftar ujian yang dapat Anda ikuti.
          </p>
        </div>

        {/* Participant Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Sedang Berlangsung</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{ongoingCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Jadwal Mendatang</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{upcomingCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Selesai Dikerjakan</p>
            <p className="text-2xl font-bold text-foreground mt-1">{completedCount}</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Daftar Ujian Anda</h2>
          </div>
          <ParticipantExamList schedules={schedules} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan aktivitas platform.
        </p>
      </div>

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
