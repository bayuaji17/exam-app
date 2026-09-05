import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ExamIntroStart } from "@/components/exam-components/exam-intro-start"
import { IntroductionRenderer } from "@/components/exam-components/introduction-renderer"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { attemptsRemaining } from "@/lib/attempts/limits"
import { listAttemptableSchedulesForUser } from "@/lib/attempts/queries"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"
import { scheduleStatus } from "@/lib/exam-schedules/queries"

export const instant = false

const STATUS_LABELS = {
  upcoming: "Akan Datang",
  ongoing: "Berlangsung",
  ended: "Selesai",
} as const

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    weekday: "short",
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

  // Flow Step 5 & 6: If exam has a scheduled start time that has not arrived yet,
  // the participant enters the Waiting Room with countdown and start timestamp!
  if (status === "upcoming") {
    redirect(`/exam/${scheduleSlug}/waiting-room`)
  }

  const remaining = attemptsRemaining(
    schedule.attemptLimit,
    schedule.submittedCount
  )
  const canStart = status === "ongoing" && remaining > 0

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-2">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground w-fit"
        href="/exam"
      >
        ← Kembali ke daftar ujian
      </Link>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {schedule.scheduleName}
          </h1>
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{schedule.packageName}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoRow
          label="Waktu Pelaksanaan"
          value={`${formatDateTime(schedule.startsAt)} – ${formatDateTime(schedule.endsAt)}`}
        />
        <InfoRow
          label="Durasi Pengerjaan"
          value={
            schedule.durationMinutes !== null
              ? `${schedule.durationMinutes} menit`
              : "Tanpa batas waktu"
          }
        />
        <InfoRow label="Jumlah Soal" value={`${schedule.questionCount} butir`} />
        <InfoRow
          label="Nilai KKM / Kelulusan"
          value={schedule.passScore !== null ? schedule.passScore : "Tidak ada"}
        />
        <InfoRow
          label="Kuota Percobaan"
          value={
            schedule.attemptLimit === null || schedule.attemptLimit === 0
              ? `${schedule.submittedCount} digunakan (tak terbatas)`
              : `${schedule.submittedCount}/${schedule.attemptLimit} digunakan`
          }
        />
      </div>

      <div className="rounded-xl border bg-card p-5 text-sm shadow-xs">
        <h2 className="mb-2 font-bold text-base text-foreground">
          Aturan & Petunjuk Pengerjaan Ujian
        </h2>
        {schedule.introduction ? (
          <IntroductionRenderer content={schedule.introduction} />
        ) : (
          <div className="space-y-2 text-muted-foreground">
            <p>
              Bacalah setiap butir soal dengan teliti dan pilih jawaban yang paling tepat.
            </p>
            <p>
              Jawaban Anda akan tersimpan secara otomatis ke server secara berkala. Anda juga
              dapat menekan tombol <strong>Sync</strong> untuk memastikan penyimpanan jawaban secara manual.
            </p>
            <p>
              Gunakan tombol <strong>Ragu-ragu</strong> jika Anda belum yakin dengan jawaban yang dipilih,
              sehingga Anda dapat meninjau kembali soal tersebut sebelum mengumpulkan ujian.
            </p>
            <p>
              Waktu pengerjaan akan terus berjalan sejak Anda menekan tombol <strong>Mulai Mengerjakan Ujian</strong>.
            </p>
          </div>
        )}
      </div>

      {status === "ended" ? (
        <div className="rounded-xl border border-muted bg-muted/30 p-4 text-sm text-muted-foreground font-medium text-center">
          Sesi ujian ini telah berakhir pada {formatDateTime(schedule.endsAt)}.
        </div>
      ) : remaining <= 0 && schedule.openAttemptId === null ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive font-medium text-center">
          Batas percobaan untuk ujian ini sudah tercapai.
        </div>
      ) : (
        <ExamIntroStart
          scheduleId={schedule.scheduleId}
          scheduleSlug={scheduleSlug}
          openAttemptId={schedule.openAttemptId}
          canStart={canStart}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3.5 py-2.5 shadow-xs">
      <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  )
}
