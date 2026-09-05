import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { QuestionSelector } from "@/components/question-selector"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getExamPackageBySlug } from "@/lib/entity-slugs/resolvers"
import { listCategories } from "@/lib/question-banks/category-queries"
import {
  listActiveBanks,
  listPackageQuestions,
} from "@/lib/exam-packages/queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/exams"

export default async function ExamPackageQuestionsPage({
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

  const [pkg, banks, categories] = await Promise.all([
    getExamPackageBySlug(slug),
    listActiveBanks(),
    listCategories(),
  ])

  if (!pkg) {
    notFound()
  }

  if (slug !== pkg.slug && slug === pkg.id) {
    redirect(`${BASE_PATH}/${pkg.slug}/questions`)
  }

  const examId = pkg.id
  const examSlug = pkg.slug
  const questions = await listPackageQuestions(examId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          href={`${BASE_PATH}/${examSlug}`}
        >
          ← Kembali ke {pkg.name}
        </Link>
        <h1 className="text-2xl font-semibold">Kelola Soal</h1>
        <p className="text-sm text-muted-foreground">
          Pilih soal dari bank soal yang tersedia. Hanya soal aktif dari bank
          aktif yang bisa dipilih.
        </p>
      </div>

      <QuestionSelector
        alreadyAdded={questions.map((item) => item.questionId)}
        banks={banks}
        categories={categories}
        examId={examId}
      />
    </div>
  )
}
