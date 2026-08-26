import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, HelpCircleIcon } from "lucide-react"

import { QuestionForm } from "@/components/question-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getQuestionBankBySlug } from "@/lib/entity-slugs/resolvers"
import { listCategories } from "@/lib/question-banks/category-queries"
import { getQuestionWithOptions } from "@/lib/question-banks/question-queries"
import { QUESTION_TYPE_LABELS } from "@/lib/question-banks/format"
import type { TipTapDoc } from "@/lib/content-policy"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ slug: string; questionId: string }>
}) {
  const { slug, questionId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, "/dashboard/question-banks")) {
    redirect("/dashboard/forbidden")
  }

  const [bank, categories, questionWithOptions] = await Promise.all([
    getQuestionBankBySlug(slug),
    listCategories(),
    getQuestionWithOptions(questionId),
  ])

  if (!bank || !questionWithOptions || questionWithOptions.bankId !== bank.id) {
    notFound()
  }

  if (slug !== bank.slug && slug === bank.id) {
    redirect(
      `/dashboard/question-banks/${bank.slug}/questions/${questionId}/edit`
    )
  }

  const bankId = bank.id
  const bankSlug = bank.slug

  // Frozen rule (Q5): archived content is read-only until restored.
  if (questionWithOptions.archivedAt || bank.archivedAt) {
    return (
      <div className="mx-auto w-full py-2">
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-xs md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <HelpCircleIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Soal Diarsipkan
              </h1>
              <p className="text-sm text-muted-foreground">
                Soal ini sedang dalam status arsip dan tidak dapat diubah.
                Pulihkan soal dari arsip untuk mengeditnya.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button asChild variant="outline">
              <Link
                href={`/dashboard/question-banks/${bankSlug}`}
                className="gap-2"
              >
                <ArrowLeftIcon className="size-4" />
                <span>Kembali ke {bank.name}</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full py-2">
      <div className="rounded-2xl border bg-card p-6 shadow-xs md:p-8">
        {/* Card Header */}
        <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <HelpCircleIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  Edit Soal
                </h1>
                <Badge variant="secondary" className="font-normal">
                  {bank.name}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {QUESTION_TYPE_LABELS[questionWithOptions.type]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Perbarui pertanyaan, rumus, atau pilihan jawaban untuk butir
                soal ini.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link
              href={`/dashboard/question-banks/${bankSlug}`}
              className="gap-2"
            >
              <ArrowLeftIcon className="size-4" />
              <span>Kembali ke Bank Soal</span>
            </Link>
          </Button>
        </div>

        {/* Card Body & Form */}
        <div className="pt-6">
          <QuestionForm
            bankId={bankId}
            bankSlug={bankSlug}
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
      </div>
    </div>
  )
}
