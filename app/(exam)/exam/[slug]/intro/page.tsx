import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { IntroductionRenderer } from "@/components/exam-components/introduction-renderer"
import { WaitingRoom } from "@/components/exam-components/waiting-room"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { attemptsRemaining } from "@/lib/attempts/limits"
import { listAttemptableSchedulesForUser } from "@/lib/attempts/queries"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"
import { scheduleStatus } from "@/lib/exam-schedules/queries"

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

export default async function ExamIntroPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  const schedules = await listAttemptableSchedulesForUser(session.user.id)
  let schedule = schedules.find(
    (candidate) => candidate.slug === slug || candidate.scheduleId === slug
  )

  if (!schedule) {
    const dbSchedule = await getExamScheduleBySlug(slug)
    if (dbSchedule) {
      schedule = schedules.find((c) => c.scheduleId === dbSchedule.id)
    }
  }

  if (!schedule) {
    notFound()
  }

  const scheduleSlug = schedule.slug || schedule.scheduleId

  if (slug !== scheduleSlug && slug === schedule.scheduleId) {
    redirect(`/exam/${scheduleSlug}/intro`)
  }

  const status = scheduleStatus(schedule.startsAt, schedule.endsAt)
  const remaining = attemptsRemaining(
    schedule.attemptLimit,
    schedule.submittedCount
  )

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        href="/exam"
      >
        ← Kembali ke daftar ujian
      </Link>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{schedule.scheduleName}</h1>
          <Badge>{STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{schedule.packageName}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow
          label="Waktu ujian"
          value={`${formatDateTime(schedule.startsAt)} – ${formatDateTime(schedule.endsAt)}`}
        />
        <InfoRow
          label="Durasi"
          value={
            schedule.durationMinutes !== null
              ? `${schedule.durationMinutes} menit`
              : "Tanpa batas waktu"
          }
        />
        <InfoRow label="Jumlah soal" value={`${schedule.questionCount} soal`} />
        <InfoRow
          label="Nilai lulus"
          value={schedule.passScore !== null ? schedule.passScore : "Tidak ada"}
        />
        <InfoRow
          label="Percobaan"
          value={
            schedule.attemptLimit === null || schedule.attemptLimit === 0
              ? `${schedule.submittedCount} digunakan (tak terbatas)`
              : `${schedule.submittedCount}/${schedule.attemptLimit} digunakan`
          }
        />
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <h2 className="mb-1 font-semibold">Aturan Ujian</h2>
        {schedule.introduction ? (
          <IntroductionRenderer content={schedule.introduction} />
        ) : (
          <p className="text-muted-foreground">
            Bacalah setiap soal dengan teliti. Jawaban tersimpan otomatis ke
            server; Anda dapat berpindah antar soal dan mengubah jawaban sebelum
            waktu habis. Waktu pengerjaan dihitung sejak ujian dimulai dan tidak
            berhenti saat koneksi terputus.
          </p>
        )}
      </div>

      {remaining <= 0 && schedule.openAttemptId === null ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive font-medium text-center">
          Batas percobaan ujian ini sudah tercapai.
        </div>
      ) : (
        <WaitingRoom
          scheduleId={schedule.scheduleId}
          scheduleSlug={scheduleSlug}
          scheduleName={schedule.scheduleName}
          startsAt={schedule.startsAt.toISOString()}
          endsAt={schedule.endsAt.toISOString()}
          openAttemptId={schedule.openAttemptId}
          requiresToken={Boolean(schedule.token && schedule.token.trim().length > 0)}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
