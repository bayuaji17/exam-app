import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ExamPackageDelete } from "@/components/exam-package-delete"
import { PackageQuestionActions } from "@/components/package-question-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listCategories } from "@/lib/question-banks/category-queries"
import {
  getExamPackageById,
  listPackageQuestions,
} from "@/lib/exam-packages/queries"
import { QUESTION_TYPE_LABELS } from "@/lib/question-banks/format"
import type { QuestionType } from "@/lib/question-banks/question-validation"

const BASE_PATH = "/dashboard/exams"

export default async function ExamPackageDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const [pkg, questions, categories] = await Promise.all([
    getExamPackageById(examId),
    listPackageQuestions(examId),
    listCategories(),
  ])

  if (!pkg) {
    notFound()
  }

  const categoryName = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ?? "—"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href={BASE_PATH}
          >
            ← Kembali ke Paket Ujian
          </Link>
          <h1 className="text-2xl font-semibold">{pkg.name}</h1>
          <p className="text-sm text-muted-foreground">
            {pkg.description ?? "Tanpa deskripsi"} ·{" "}
            {pkg.durationMinutes ? `${pkg.durationMinutes} menit` : "tanpa batas waktu"} ·{" "}
            {pkg.shuffle ? "acak urutan" : "urutan tetap"} ·{" "}
            {pkg.passScore ? `nilai lulus ${pkg.passScore}` : "tanpa nilai lulus"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExamPackageDelete examId={examId} />
          <Button asChild>
            <Link href={`${BASE_PATH}/${examId}/questions`}>Kelola Soal</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">
          Susunan Soal ({questions.length})
        </h2>

        {questions.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada soal di paket ini.
            </p>
            <Button asChild className="mt-4">
              <Link href={`${BASE_PATH}/${examId}/questions`}>
                Pilih Soal dari Bank Soal
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Soal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-sm">{item.searchText || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {QUESTION_TYPE_LABELS[item.type as QuestionType] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryName(item.categoryId)}</TableCell>
                    <TableCell>
                      <PackageQuestionActions
                        examId={examId}
                        position={index}
                        questionId={item.questionId}
                        total={questions.length}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
