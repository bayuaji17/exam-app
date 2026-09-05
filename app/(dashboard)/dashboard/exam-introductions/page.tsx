import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ExamIntroductionsSearch } from "@/components/exam-introductions-search"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
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
import { listIntroductionSchedules } from "@/lib/exam-schedules/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/exam-schedules/table-params"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/exam-introductions"

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function HubTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listIntroductionSchedules>>
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
                Jadwal
              </DataTableSortHeader>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="startsAt"
                params={params}
              >
                Mulai
              </DataTableSortHeader>
              <TableHead>Status Petunjuk</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
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
                    ? "Tidak ada hasil untuk filter ini."
                    : "Belum ada jadwal ujian."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((item) => {
                const slug = item.slug
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(item.startsAt)}
                    </TableCell>
                    <TableCell>
                      {item.hasIntroduction ? (
                        <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
                          Terisi
                        </Badge>
                      ) : (
                        <Badge className="border-border text-muted-foreground">
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`${BASE_PATH}/${slug}`}
                      >
                        Atur
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

export default async function ExamIntroductionsPage({
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
  const result = await listIntroductionSchedules(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Introduction Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Atur teks aturan dan informasi yang ditampilkan sebelum peserta
          mengerjakan ujian.
        </p>
      </div>

      <ExamIntroductionsSearch basePath={BASE_PATH} params={params} />
      <HubTable params={params} result={result} />
    </div>
  )
}
