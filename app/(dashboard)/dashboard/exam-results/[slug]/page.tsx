import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

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
import { listScheduleResultsPage } from "@/lib/grading/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/grading/table-params"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"

const BASE_PATH = "/dashboard/exam-results"

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ResultsTable({
  result,
  params,
  scheduleSlug,
}: {
  result: Awaited<ReturnType<typeof listScheduleResultsPage>>
  params: TableParams
  scheduleSlug: string
}) {
  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${scheduleSlug}`}
                column="name"
                params={params}
              >
                Peserta
              </DataTableSortHeader>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${scheduleSlug}`}
                column="submittedAt"
                params={params}
              >
                Dikumpulkan
              </DataTableSortHeader>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${scheduleSlug}`}
                column="score"
                params={params}
              >
                Skor
              </DataTableSortHeader>
              <TableHead>Status</TableHead>
              <TableHead>Lulus</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada pengerjaan yang dikumpulkan.
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((item) => (
                <TableRow key={item.attemptId}>
                  <TableCell className="font-medium">
                    {item.participantName}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {item.participantEmail}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(item.submittedAt)}
                  </TableCell>
                  <TableCell>
                    {item.score !== null ? Number(item.score).toLocaleString("id-ID") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className="border-border text-muted-foreground">
                      {item.fullyGraded ? "Lengkap" : "Menunggu"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.passing === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge
                        className={
                          item.passing
                            ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-destructive/15 text-destructive"
                        }
                      >
                        {item.passing ? "LULUS" : "TIDAK"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      className="underline underline-offset-4 hover:no-underline"
                      href={`/dashboard/manual-grading/${item.attemptId}`}
                    >
                      Detail
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        basePath={`${BASE_PATH}/${scheduleSlug}`}
        page={result.page}
        pageSize={result.pageSize}
        params={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </>
  )
}

export default async function ScheduleResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

  const schedule = await getExamScheduleBySlug(slug)

  if (!schedule) {
    notFound()
  }

  if (slug !== schedule.slug && slug === schedule.id) {
    redirect(`${BASE_PATH}/${schedule.slug}`)
  }

  const scheduleId = schedule.id
  const scheduleSlug = schedule.slug
  const pageParams = parseTableParams(await searchParams)
  const result = await listScheduleResultsPage(scheduleId, pageParams)

  return (
    <div className="flex flex-col gap-4">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        href={BASE_PATH}
      >
        ← Kembali ke Hasil Ujian
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Hasil · {schedule.name}</h1>
        <p className="text-sm text-muted-foreground">
          {result.total} pengerjaan dikumpulkan.
        </p>
      </div>

      <ResultsTable
        params={pageParams}
        result={result}
        scheduleSlug={scheduleSlug}
      />
    </div>
  )
}
