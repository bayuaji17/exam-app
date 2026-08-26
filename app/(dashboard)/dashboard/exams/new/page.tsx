import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ExamPackageForm } from "@/components/exam-package-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/exams"

export default async function NewExamPackagePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tambah Paket Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Buat paket berisi kumpulan soal dan konfigurasi ujian.
        </p>
      </div>

      <ExamPackageForm />
    </div>
  )
}
