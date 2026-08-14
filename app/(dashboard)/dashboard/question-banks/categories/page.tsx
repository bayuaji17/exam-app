import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { QuestionCategoryManager } from "@/components/question-category-manager"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listCategories } from "@/lib/question-banks/category-queries"

export default async function QuestionCategoriesPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, "/dashboard/question-banks")) {
    redirect("/dashboard/forbidden")
  }

  const categories = await listCategories()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Kategori Soal</h1>
        <p className="text-sm text-muted-foreground">
          Kategori dipakai untuk mengelompokkan dan mencari soal lintas bank.
        </p>
      </div>

      <QuestionCategoryManager categories={categories} />
    </div>
  )
}
