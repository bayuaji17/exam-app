import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { QuestionForm } from "@/components/question-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listCategories } from "@/lib/question-banks/category-queries"
import { getQuestionBankById } from "@/lib/question-banks/queries"

export default async function NewQuestionPage({
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

  const [bank, categories] = await Promise.all([
    getQuestionBankById(bankId),
    listCategories(),
  ])

  if (!bank) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tambah Soal</h1>
        <p className="text-sm text-muted-foreground">
          Bank: {bank.name}
        </p>
      </div>

      <QuestionForm bankId={bankId} categories={categories} mode="create" />
    </div>
  )
}
