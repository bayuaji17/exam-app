import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  ParticipantExamList,
  type ParticipantScheduleItem,
} from "@/components/exam-components/participant-exam-list"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { listAttemptableSchedulesForUser } from "@/lib/attempts/queries"

export const instant = false

export default async function ExamListPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  const rawSchedules = await listAttemptableSchedulesForUser(session.user.id)

  const schedules: ParticipantScheduleItem[] = rawSchedules.map((schedule) => ({
    scheduleId: schedule.scheduleId,
    scheduleName: schedule.scheduleName,
    slug: schedule.slug,
    packageId: schedule.packageId,
    packageName: schedule.packageName,
    token: schedule.token,
    startsAt: schedule.startsAt.toISOString(),
    endsAt: schedule.endsAt.toISOString(),
    durationMinutes: schedule.durationMinutes,
    questionCount: schedule.questionCount,
    passScore: schedule.passScore,
    attemptLimit: schedule.attemptLimit,
    status: schedule.status,
    openAttemptId: schedule.openAttemptId,
    openDeadlineAt: schedule.openDeadlineAt?.toISOString() ?? null,
    submittedCount: schedule.submittedCount,
    lastScore: schedule.lastScore,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daftar Ujian Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih sesi ujian yang tersedia untuk memulai atau melanjutkan pengerjaan.
        </p>
      </div>

      <ParticipantExamList schedules={schedules} />
    </div>
  )
}
