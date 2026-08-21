import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ExamPackageSearch } from "@/components/exam-package-search"
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
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listExamPackagesPage } from "@/lib/exam-packages/queries"
import { slugify } from "@/lib/slugs"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/exam-packages/table-params"

const BASE_PATH = "/dashboard/exams"

function ExamPackagesTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listExamPackagesPage>>
  params: TableParams
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

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
                Paket
              </DataTableSortHeader>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Soal</TableHead>
              <TableHead>Nilai Lulus</TableHead>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="createdAt"
                params={params}
              >
                Dibuat
              </DataTableSortHeader>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {noMatches
                    ? "Tidak ada hasil untuk filter ini."
                    : "Belum ada paket ujian."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((pkg) => {
                const slug =
                  (pkg as unknown as { slug?: string }).slug ||
                  slugify(pkg.name) ||
                  pkg.id
                return (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`${BASE_PATH}/${slug}`}
                      >
                        {pkg.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {pkg.description ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {pkg.durationMinutes
                        ? `${pkg.durationMinutes} menit`
                        : "—"}
                    </TableCell>
                    <TableCell>{pkg.questionCount}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {pkg.passScore ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {pkg.createdAt.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`${BASE_PATH}/${slug}/edit`}
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        Edit
                      </Link>
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

export default async function ExamPackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const params = parseTableParams(await searchParams)
  const result = await listExamPackagesPage(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Paket Ujian</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} paket ujian terdaftar.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/new`}>Tambah Paket</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ExamPackageSearch params={params} />
        </div>

        <ExamPackagesTable params={params} result={result} />
      </div>
    </div>
  )
}
