import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { QuestionBankForm } from "@/components/question-bank-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

export default async function NewQuestionBankPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, "/dashboard/question-banks")) {
    redirect("/dashboard/forbidden")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tambah Bank Soal</h1>
        <p className="text-sm text-muted-foreground">
          Buat wadah untuk mengelola soal-soal ujian.
        </p>
      </div>

      <QuestionBankForm />
    </div>
  )
}
