import Link from "next/link"
import { Pencil } from "lucide-react"

import { QuestionBanksToolbar } from "@/components/question-banks-toolbar"
import { QuestionBankRowActions } from "@/components/question-bank-row-actions"
import { TableDescriptionTooltip } from "@/components/table-description-tooltip"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
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
import { listQuestionBanksPage } from "@/lib/question-banks/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/question-banks/table-params"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/question-banks"

function QuestionBanksTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listQuestionBanksPage>>
  params: TableParams
}) {
  const noMatches = result.total === 0 && Boolean(params.q || params.status)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="name"
                params={params}
              >
                Nama
              </DataTableSortHeader>
              <TableHead>Deskripsi</TableHead>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="createdAt"
                params={params}
              >
                Dibuat
              </DataTableSortHeader>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
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
                    ? "Tidak ada hasil untuk filter ini."
                    : "Belum ada bank soal."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((bank) => {
                const slug = bank.slug
                return (
                  <TableRow key={bank.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`${BASE_PATH}/${slug}`}
                      >
                        {bank.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate md:max-w-md">
                      <TableDescriptionTooltip description={bank.description} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {bank.createdAt.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {bank.archivedAt ? (
                        <Badge variant="muted">Diarsipkan</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button asChild>
                          <Link href={`${BASE_PATH}/${slug}/edit`}>
                            <Pencil />
                            Edit
                          </Link>
                        </Button>
                        <QuestionBankRowActions
                          bankId={bank.id}
                          archived={Boolean(bank.archivedAt)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        basePath={BASE_PATH}
        page={result.page}
        pageSize={result.pageSize}
        params={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </>
  )
}

export default async function QuestionBanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = parseTableParams(await searchParams)
  const result = await listQuestionBanksPage(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Bank Soal</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} bank soal terdaftar.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href={`${BASE_PATH}/categories`}>Kelola Kategori</Link>
          </Button>
          <Button asChild>
            <Link href={`${BASE_PATH}/new`}>Tambah Bank</Link>
          </Button>
        </div>
      </div>

      <QuestionBanksToolbar basePath={BASE_PATH} params={params}>
        <QuestionBanksTable params={params} result={result} />
      </QuestionBanksToolbar>
    </div>
  )
}
