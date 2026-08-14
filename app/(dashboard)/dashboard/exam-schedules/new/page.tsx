import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ExamScheduleForm } from "@/components/exam-schedule-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listExamPackagesPage } from "@/lib/exam-packages/queries"

const BASE_PATH = "/dashboard/exam-schedules"

export default async function NewExamSchedulePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const packagesResult = await listExamPackagesPage({
    q: "",
    sort: "name",
    order: "asc",
    page: 1,
    size: 50,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tambah Jadwal Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Jadwalkan pelaksanaan paket ujian pada rentang waktu tertentu.
        </p>
      </div>

      <ExamScheduleForm packages={packagesResult.items} />
    </div>
  )
}
