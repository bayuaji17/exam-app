import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ExamScheduleForm } from "@/components/exam-schedule-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"
import { listExamPackagesPage } from "@/lib/exam-packages/queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/exam-schedules"

export default async function EditExamSchedulePage({
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

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const [schedule, packagesResult] = await Promise.all([
    getExamScheduleBySlug(slug),
    listExamPackagesPage({
      q: "",
      sort: "name",
      order: "asc",
      page: 1,
      size: 50,
    }),
  ])

  if (!schedule) {
    notFound()
  }

  if (slug !== schedule.slug && slug === schedule.id) {
    redirect(`${BASE_PATH}/${schedule.slug}/edit`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Edit Jadwal Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Ubah jadwal pelaksanaan ujian.
        </p>
      </div>

      <ExamScheduleForm packages={packagesResult.items} schedule={schedule} />
    </div>
  )
}
