import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeftIcon,
  CalendarIcon,
  HelpCircleIcon,
  LayersIcon,
  Pencil,
  Plus,
} from "lucide-react"

import { QuestionListToolbar } from "@/components/question-list-toolbar"
import { QuestionBankActions } from "@/components/question-bank-actions"
import { QuestionRowActions } from "@/components/question-row-actions"
import { TableDescriptionTooltip } from "@/components/table-description-tooltip"
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function QuestionTypeBadge({ type }: { type: string }) {
  const label = QUESTION_TYPE_LABELS[type as QuestionType] ?? type
  if (type === "single") {
    return <Badge variant="secondary">{label}</Badge>
  }
  if (type === "scored") {
    return <Badge variant="default">{label}</Badge>
  }
  return <Badge variant="outline">{label}</Badge>
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
              <TableHead className="w-[140px] text-center">Aksi</TableHead>
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
                  <TableCell className="max-w-xs md:max-w-md">
                    <TableDescriptionTooltip
                      description={item.searchText || "—"}
                    />
                  </TableCell>
                  <TableCell>
                    <QuestionTypeBadge type={item.type} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {categoryName(item.categoryId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.archivedAt ? (
                      <Badge variant="muted">Diarsipkan</Badge>
                    ) : (
                      <Badge variant="success">Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!bankArchived && !item.archivedAt ? (
                        <Button asChild size="sm">
                          <Link
                            href={`${QUESTION_BANKS_PATH}/${bankId}/questions/${item.id}/edit`}
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Link>
                        </Button>
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
        <div className="rounded-xl border border-amber-600/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-semibold">Perhatian:</span> Bank soal ini sedang
          diarsipkan dan hanya dapat dibaca. Pulihkan bank soal untuk dapat
          mengedit atau menambah butir soal baru.
        </div>
      ) : null}

      {/* 1. Hero Group / Bank Overview Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <LayersIcon className="size-7" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 justify-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {bank.name}
                </h1>
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <HelpCircleIcon className="size-3.5 text-primary" />
                  <span>{stats.total} Soal</span>
                </Badge>
                {bankArchived ? (
                  <Badge variant="muted">Diarsipkan</Badge>
                ) : (
                  <Badge variant="success">Aktif</Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                <span>Dibuat pada {formatDate(bank.createdAt)}</span>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {bank.description || "Belum ada deskripsi untuk bank soal ini."}
              </p>

              {/* Stats Breakdown Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <strong className="text-foreground">{stats.active}</strong>{" "}
                  Aktif
                </span>
                <span className="rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <strong className="text-foreground">{stats.archived}</strong>{" "}
                  Diarsipkan
                </span>
                <span className="text-muted-foreground/50">|</span>
                <span className="rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <strong className="text-foreground">
                    {stats.byType.single}
                  </strong>{" "}
                  Pilihan Ganda
                </span>
                <span className="rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <strong className="text-foreground">
                    {stats.byType.scored}
                  </strong>{" "}
                  Berbasis Skor
                </span>
                <span className="rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <strong className="text-foreground">
                    {stats.byType.manual}
                  </strong>{" "}
                  Esai / Manual
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Button asChild variant="outline">
              <Link href={QUESTION_BANKS_PATH} className="gap-2">
                <ArrowLeftIcon className="size-4" />
                <span>Kembali</span>
              </Link>
            </Button>
            <Button asChild>
              <Link
                href={`${QUESTION_BANKS_PATH}/${bankId}/edit`}
                className="gap-2"
              >
                <Pencil className="size-4" />
                <span>Ubah Bank</span>
              </Link>
            </Button>
            <QuestionBankActions archived={bankArchived} bankId={bankId} />
            {!bankArchived ? (
              <Button asChild>
                <Link
                  href={`${QUESTION_BANKS_PATH}/${bankId}/questions/new`}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  <span>Tambah Soal</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Questions Management Section */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            Daftar Butir Soal
          </h2>
          <p className="text-xs text-muted-foreground">
            Kelola butir pertanyaan, opsi jawaban, dan kunci penilaian di dalam
            bank soal ini.
          </p>
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
    </div>
  )
}
