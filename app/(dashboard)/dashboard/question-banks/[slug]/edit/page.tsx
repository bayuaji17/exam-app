import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, LayersIcon } from "lucide-react"

import { QuestionBankForm } from "@/components/question-bank-form"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getQuestionBankBySlug } from "@/lib/entity-slugs/resolvers"

const BASE_PATH = "/dashboard/question-banks"

export default async function EditQuestionBankPage({
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

  const bank = await getQuestionBankBySlug(slug)

  if (!bank) {
    notFound()
  }

  if (slug !== bank.slug && slug === bank.id) {
    redirect(`${BASE_PATH}/${bank.slug}/edit`)
  }

  // Frozen rule (Q5): archived banks are read-only until restored.
  if (bank.archivedAt) {
    return (
      <div className="mx-auto w-full py-2">
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-xs md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <LayersIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Bank Soal Diarsipkan
              </h1>
              <p className="text-sm text-muted-foreground">
                Bank soal ini sedang dalam status arsip dan tidak dapat diubah.
                Pulihkan bank dari arsip untuk dapat mengeditnya kembali.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button asChild variant="outline">
              <Link href={`${BASE_PATH}/${bank.slug}`} className="gap-2">
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
        <div className="flex items-start gap-4 border-b pb-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <LayersIcon className="size-6" />
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Edit Bank Soal
            </h1>
            <p className="text-sm text-muted-foreground">
              Perbarui informasi nama atau deskripsi bank soal.
            </p>
          </div>
        </div>

        {/* Card Body & Form */}
        <div className="pt-6">
          <QuestionBankForm
            bank={{
              id: bank.id,
              name: bank.name,
              slug: bank.slug,
              description: bank.description,
            }}
          />
        </div>
      </div>
    </div>
  )
}
