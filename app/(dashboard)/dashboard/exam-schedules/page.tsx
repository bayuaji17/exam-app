import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { ExamSchedulesToolbar } from "@/components/exam-schedules-toolbar"
import { ScheduleTokenCell } from "@/components/schedule-token-cell"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
import { TableSkeleton } from "@/components/dashboard-components/skeletons"
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
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getDashboardSession } from "@/lib/auth/session"
import { listExamSchedulesPage } from "@/lib/exam-schedules/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/exam-schedules/table-params"

const BASE_PATH = "/dashboard/exam-schedules"

const STATUS_LABELS = {
  upcoming: "Akan Datang",
  ongoing: "Berlangsung",
  ended: "Selesai",
} as const

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ExamSchedulesTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listExamSchedulesPage>>
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
              <TableHead>Paket</TableHead>
              <TableHead>Token</TableHead>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="startsAt"
                params={params}
              >
                Mulai
              </DataTableSortHeader>
              <TableHead>Selesai</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
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
                    <TableCell className="max-w-md truncate">
                      {item.packageName}
                    </TableCell>
                    <TableCell>
                      <ScheduleTokenCell
                        scheduleId={item.id}
                        initialToken={item.token}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(item.startsAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(item.endsAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.durationMinutes
                        ? `${item.durationMinutes} menit`
                        : "Ikut paket"}
                    </TableCell>
                    <TableCell>
                      <Badge>{STATUS_LABELS[item.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`${BASE_PATH}/${slug}/edit`}
                          className="underline underline-offset-4 hover:no-underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`${BASE_PATH}/${slug}/eligibility`}
                          className="underline underline-offset-4 hover:no-underline"
                        >
                          Aturan Akses
                        </Link>
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

async function ExamSchedulesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { session } = await getDashboardSession()

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const params = parseTableParams(await searchParams)
  const result = await listExamSchedulesPage(params)

  return (
    <ExamSchedulesToolbar basePath={BASE_PATH} params={params}>
      <ExamSchedulesTable params={params} result={result} />
    </ExamSchedulesToolbar>
  )
}

export default function ExamSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Jadwal Ujian</h1>
          <p className="text-sm text-muted-foreground">
            Kelola sesi dan jadwal pelaksanaan ujian.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/new`}>Tambah Jadwal</Link>
        </Button>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
        <ExamSchedulesContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
