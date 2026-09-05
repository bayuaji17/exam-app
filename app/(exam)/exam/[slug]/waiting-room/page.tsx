import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { WaitingRoomCard } from "@/components/exam-components/waiting-room-card"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"
import { listAttemptableSchedulesForUser } from "@/lib/attempts/queries"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"
import { scheduleStatus } from "@/lib/exam-schedules/queries"

export const instant = false

export default async function WaitingRoomPage({
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
    redirect(`/exam/${scheduleSlug}/waiting-room`)
  }

  const status = scheduleStatus(schedule.startsAt, schedule.endsAt)

  // If the schedule is already ongoing, user should bypass waiting room directly to onboarding/intro!
  if (status === "ongoing") {
    redirect(`/exam/${scheduleSlug}/intro`)
  }

  return (
    <div className="py-6 sm:py-10">
      <WaitingRoomCard
        scheduleId={schedule.scheduleId}
        scheduleSlug={scheduleSlug}
        scheduleName={schedule.scheduleName}
        packageName={schedule.packageName}
        startsAt={schedule.startsAt.toISOString()}
        endsAt={schedule.endsAt.toISOString()}
        durationMinutes={schedule.durationMinutes}
        questionCount={schedule.questionCount}
      />
    </div>
  )
}
