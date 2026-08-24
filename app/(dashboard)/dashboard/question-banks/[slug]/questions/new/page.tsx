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

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/question-banks"

export default async function NewQuestionPage({
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

  const [bank, categories] = await Promise.all([
    getQuestionBankBySlug(slug),
    listCategories(),
  ])

  if (!bank) {
    notFound()
  }

  if (slug !== bank.slug && slug === bank.id) {
    redirect(`${BASE_PATH}/${bank.slug}/questions/new`)
  }

  const bankId = bank.id
  const bankSlug = bank.slug

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
                  Tambah Soal
                </h1>
                <Badge variant="secondary" className="font-normal">
                  {bank.name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Tuliskan pertanyaan, atur rumus matematika, dan tentukan opsi
                jawaban untuk bank soal.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={`${BASE_PATH}/${bankSlug}`} className="gap-2">
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
            mode="create"
          />
        </div>
      </div>
    </div>
  )
}
