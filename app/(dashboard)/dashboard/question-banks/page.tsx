import Link from "next/link"

import { QuestionBanksSearch } from "@/components/question-banks-search"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
import { Button } from "@/components/ui/button"
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

const BASE_PATH = "/dashboard/question-banks"

function QuestionBanksTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listQuestionBanksPage>>
  params: TableParams
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader basePath={BASE_PATH} column="name" params={params}>
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
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {noMatches
                    ? "Tidak ada hasil untuk pencarian ini."
                    : "Belum ada bank soal."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium">{bank.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {bank.description ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {bank.createdAt.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`${BASE_PATH}/${bank.id}/edit`}
                      className="underline underline-offset-4 hover:no-underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <QuestionBanksSearch params={params} />
        </div>

        <QuestionBanksTable params={params} result={result} />
      </div>
    </div>
  )
}
