import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ExamPackageForm } from "@/components/exam-package-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getExamPackageById } from "@/lib/exam-packages/queries"

const BASE_PATH = "/dashboard/exams"

export default async function EditExamPackagePage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const pkg = await getExamPackageById(examId)

  if (!pkg) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Edit Paket Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Ubah konfigurasi paket ujian.
        </p>
      </div>

      <ExamPackageForm
        pkg={{
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          durationMinutes: pkg.durationMinutes,
          shuffle: pkg.shuffle,
          passScore: pkg.passScore,
          wrongPenalty: pkg.wrongPenalty,
        }}
      />
    </div>
  )
}
