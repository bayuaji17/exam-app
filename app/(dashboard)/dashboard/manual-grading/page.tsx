import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { GradingSearch } from "@/components/grading-search"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
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
import { listUngradedAttemptsPage } from "@/lib/grading/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/grading/table-params"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/manual-grading"

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function UngradedTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listUngradedAttemptsPage>>
  params: TableParams
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ujian</TableHead>
              <TableHead>Peserta</TableHead>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="submittedAt"
                params={params}
              >
                Dikumpulkan
              </DataTableSortHeader>
              <TableHead>Belum Dinilai</TableHead>
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
                    ? "Tidak ada hasil untuk filter ini."
                    : "Tidak ada pengerjaan yang menunggu penilaian."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((item) => (
                <TableRow key={item.attemptId}>
                  <TableCell className="font-medium">{item.scheduleName}</TableCell>
                  <TableCell>
                    {item.participantName}
                    <span className="block text-xs text-muted-foreground">
                      {item.participantEmail}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(item.submittedAt)}
                  </TableCell>
                  <TableCell>{item.pendingCount}</TableCell>
                  <TableCell>
                    <Link
                      className="underline underline-offset-4 hover:no-underline"
                      href={`${BASE_PATH}/${item.attemptId}`}
                    >
                      Nilai
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

export default async function ManualGradingPage({
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
  const result = await listUngradedAttemptsPage(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Penilaian Manual</h1>
        <p className="text-sm text-muted-foreground">
          {result.total} pengerjaan dengan soal manual yang belum dinilai.
        </p>
      </div>

      <GradingSearch basePath={BASE_PATH} params={params} />
      <UngradedTable params={params} result={result} />
    </div>
  )
}
