import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { QuestionListToolbar } from "@/components/question-list-toolbar"
import { QuestionBankActions } from "@/components/question-bank-actions"
import { QuestionRowActions } from "@/components/question-row-actions"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
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
import { getQuestionBankById } from "@/lib/question-banks/queries"
import {
  getQuestionBankStats,
  listQuestionsPage,
} from "@/lib/question-banks/question-queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/question-banks/question-table-params"
import { QUESTION_TYPE_LABELS } from "@/lib/question-banks/format"
import type { QuestionType } from "@/lib/question-banks/question-validation"

const QUESTION_BANKS_PATH = "/dashboard/question-banks"

function QuestionTypeBadge({ type }: { type: string }) {
  return <Badge>{QUESTION_TYPE_LABELS[type as QuestionType] ?? type}</Badge>
}

function QuestionsTable({
  result,
  params,
  bankId,
  bankArchived,
  categories,
}: {
  result: Awaited<ReturnType<typeof listQuestionsPage>>
  params: TableParams
  bankId: string
  bankArchived: boolean
  categories: Awaited<ReturnType<typeof listCategories>>
}) {
  const categoryName = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ?? "—"

  const noMatches =
    result.total === 0 &&
    Boolean(params.q || params.categoryId || params.type || params.status)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Soal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {noMatches
                    ? "Tidak ada soal yang cocok dengan filter ini."
                    : "Belum ada soal di bank ini."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-sm">{item.searchText || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <QuestionTypeBadge type={item.type} />
                  </TableCell>
                  <TableCell>{categoryName(item.categoryId)}</TableCell>
                  <TableCell>
                    {item.archivedAt ? (
                      <Badge>Diarsipkan</Badge>
                    ) : (
                      <span className="text-muted-foreground">Aktif</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {!bankArchived && !item.archivedAt ? (
                        <Link
                          className="underline underline-offset-4 hover:no-underline"
                          href={`${QUESTION_BANKS_PATH}/${bankId}/questions/${item.id}/edit`}
                        >
                          Edit
                        </Link>
                      ) : null}
                      <QuestionRowActions
                        bankArchived={bankArchived}
                        archived={Boolean(item.archivedAt)}
                        questionId={item.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        basePath={`${QUESTION_BANKS_PATH}/${bankId}`}
        page={result.page}
        pageSize={result.pageSize}
        params={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </>
  )
}

export default async function QuestionBankDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bankId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { bankId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, QUESTION_BANKS_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const [bank, stats, categories, pageParams] = await Promise.all([
    getQuestionBankById(bankId),
    getQuestionBankStats(bankId),
    listCategories(),
    parseTableParams(await searchParams),
  ])

  if (!bank) {
    notFound()
  }

  const bankArchived = Boolean(bank.archivedAt)
  const pageResult = await listQuestionsPage(bankId, pageParams)

  return (
    <div className="flex flex-col gap-6">
      {bankArchived ? (
        <p className="rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-sm">
          Bank ini sedang diarsipkan dan hanya bisa dibaca. Pulihkan bank
          untuk mengedit soal.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href={QUESTION_BANKS_PATH}
          >
            ← Kembali ke Bank Soal
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{bank.name}</h1>
            {bankArchived ? <Badge>Diarsipkan</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {stats.total} soal · {stats.active} aktif · {stats.archived} diarsipkan ·{" "}
            {stats.byType.single} pilihan · {stats.byType.scored} berbasis skor ·{" "}
            {stats.byType.manual} manual
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QuestionBankActions archived={bankArchived} bankId={bankId} />
          {!bankArchived ? (
            <Button asChild>
              <Link href={`${QUESTION_BANKS_PATH}/${bankId}/questions/new`}>
                Tambah Soal
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <QuestionListToolbar
        basePath={`${QUESTION_BANKS_PATH}/${bankId}`}
        categories={categories}
        params={pageParams}
      >
        <QuestionsTable
          bankArchived={bankArchived}
          bankId={bankId}
          categories={categories}
          params={pageParams}
          result={pageResult}
        />
      </QuestionListToolbar>
    </div>
  )
}
