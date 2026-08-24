import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { QuestionCategoryManager } from "@/components/question-category-manager"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listCategories } from "@/lib/question-banks/category-queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/question-banks"

export default async function QuestionCategoriesPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const categories = await listCategories()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Kategori Soal
          </h1>
          <p className="text-sm text-muted-foreground">
            Kategori dipakai untuk mengelompokkan dan mencari soal lintas bank.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={BASE_PATH} className="gap-2">
            <ArrowLeftIcon className="size-4" />
            <span>Kembali ke Bank Soal</span>
          </Link>
        </Button>
      </div>

      <QuestionCategoryManager categories={categories} />
    </div>
  )
}
