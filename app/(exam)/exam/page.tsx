import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { listAttemptableSchedulesForUser } from "@/lib/attempts/queries"
import { attemptsRemaining } from "@/lib/attempts/limits"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const STATUS_LABELS = {
  upcoming: "Akan Datang",
  ongoing: "Berlangsung",
  ended: "Selesai",
} as const

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function ExamListPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  const schedules = await listAttemptableSchedulesForUser(session.user.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ujian Saya</h1>
        <p className="text-sm text-muted-foreground">
          Ujian yang tersedia untuk Anda, {schedules.length} jadwal.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ujian</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Soal</TableHead>
              <TableHead>Percobaan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada ujian yang tersedia untuk Anda.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => {
                const slug = schedule.slug
                const remaining = attemptsRemaining(
                  schedule.attemptLimit,
                  schedule.submittedCount
                )
                const canStart =
                  schedule.status === "ongoing" &&
                  schedule.openAttemptId === null &&
                  remaining > 0
                const actionLabel = schedule.openAttemptId
                  ? "Lanjutkan"
                  : canStart
                    ? "Mulai"
                    : schedule.submittedCount > 0
                      ? "Lihat Nilai"
                      : null

                return (
                  <TableRow key={schedule.scheduleId}>
                    <TableCell className="font-medium">
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`/exam/${slug}/intro`}
                      >
                        {schedule.scheduleName}
                      </Link>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {schedule.packageName}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDateTime(schedule.startsAt)} –{" "}
                      {formatDateTime(schedule.endsAt)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {schedule.durationMinutes !== null
                        ? `${schedule.durationMinutes} menit`
                        : "Tanpa batas"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.questionCount}
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.attemptLimit === null ||
                      schedule.attemptLimit === 0
                        ? `${schedule.submittedCount} (tak terbatas)`
                        : `${schedule.submittedCount}/${schedule.attemptLimit}`}
                    </TableCell>
                    <TableCell>
                      <Badge>{STATUS_LABELS[schedule.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {actionLabel ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/exam/${slug}/intro`}>
                            {actionLabel}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {schedule.status === "ongoing"
                            ? "Batas percobaan tercapai"
                            : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
