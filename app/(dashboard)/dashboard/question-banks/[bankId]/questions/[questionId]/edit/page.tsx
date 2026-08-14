import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { QuestionForm } from "@/components/question-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listCategories } from "@/lib/question-banks/category-queries"
import { getQuestionBankById } from "@/lib/question-banks/queries"
import { getQuestionWithOptions } from "@/lib/question-banks/question-queries"
import { QUESTION_TYPE_LABELS } from "@/lib/question-banks/format"
import type { TipTapDoc } from "@/lib/content-policy"

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ bankId: string; questionId: string }>
}) {
  const { bankId, questionId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, "/dashboard/question-banks")) {
    redirect("/dashboard/forbidden")
  }

  const [bank, categories, questionWithOptions] = await Promise.all([
    getQuestionBankById(bankId),
    listCategories(),
    getQuestionWithOptions(questionId),
  ])

  if (!bank || !questionWithOptions || questionWithOptions.bankId !== bankId) {
    notFound()
  }

  // Frozen rule (Q5): archived content is read-only until restored.
  if (questionWithOptions.archivedAt) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Soal Diarsipkan</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Soal ini sedang dalam status arsip dan tidak dapat diubah. Pulihkan
          soal dari arsip untuk mengeditnya.
        </p>
        <a
          className="text-sm text-primary underline underline-offset-4"
          href={`/dashboard/question-banks/${bankId}`}
        >
          ← Kembali ke {bank.name}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Edit Soal</h1>
        <p className="text-sm text-muted-foreground">
          Bank: {bank.name} · Tipe: {QUESTION_TYPE_LABELS[questionWithOptions.type]}
        </p>
      </div>

      <QuestionForm
        bankId={bankId}
        categories={categories}
        initial={{
          id: questionWithOptions.id,
          type: questionWithOptions.type,
          content: questionWithOptions.content as unknown as TipTapDoc,
          categoryId: questionWithOptions.categoryId,
          options: questionWithOptions.options.map((option) => ({
            content: option.content as unknown as TipTapDoc,
            isCorrect: option.isCorrect,
            score: option.score,
          })),
        }}
        mode="edit"
      />
    </div>
  )
}
