import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { LayersIcon } from "lucide-react"

import { QuestionBankForm } from "@/components/question-bank-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/question-banks"

export default async function NewQuestionBankPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
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
              Tambah Bank Soal
            </h1>
            <p className="text-sm text-muted-foreground">
              Buat wadah baru untuk mengelola kumpulan butir soal ujian.
            </p>
          </div>
        </div>

        {/* Card Body & Form */}
        <div className="pt-6">
          <QuestionBankForm />
        </div>
      </div>
    </div>
  )
}
