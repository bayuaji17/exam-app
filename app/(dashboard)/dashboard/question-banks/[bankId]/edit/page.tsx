import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { QuestionBankForm } from "@/components/question-bank-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getQuestionBankById } from "@/lib/question-banks/queries"

export default async function EditQuestionBankPage({
  params,
}: {
  params: Promise<{ bankId: string }>
}) {
  const { bankId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, "/dashboard/question-banks")) {
    redirect("/dashboard/forbidden")
  }

  const bank = await getQuestionBankById(bankId)

  if (!bank) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Edit Bank Soal</h1>
        <p className="text-sm text-muted-foreground">
          Ubah nama atau deskripsi bank soal.
        </p>
      </div>

      <QuestionBankForm
        bank={{ id: bank.id, name: bank.name, description: bank.description }}
      />
    </div>
  )
}
