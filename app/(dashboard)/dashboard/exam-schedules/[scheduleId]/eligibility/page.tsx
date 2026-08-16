import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { EligibilitySearch } from "@/components/eligibility-search"
import { ScheduleEligibilityManager } from "@/components/schedule-eligibility-manager"
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
import {
  listEligibleParticipantsPage,
  listGrantableGroups,
  listGrantableUsers,
  listGrantedGroups,
  listGrantedUsers,
} from "@/lib/eligibility/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/eligibility/table-params"
import { getExamScheduleById } from "@/lib/exam-schedules/queries"

const SCHEDULES_PATH = "/dashboard/exam-schedules"

function EligibleParticipantsTable({
  result,
  params,
  basePath,
}: {
  result: Awaited<ReturnType<typeof listEligibleParticipantsPage>>
  params: TableParams
  basePath: string
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader basePath={basePath} column="name" params={params}>
                Nama
              </DataTableSortHeader>
              <TableHead>Email</TableHead>
              <DataTableSortHeader
                basePath={basePath}
                column="createdAt"
                params={params}
              >
                Terdaftar
              </DataTableSortHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {noMatches
                    ? "Tidak ada peserta yang cocok."
                    : "Belum ada peserta yang berhak mengikuti ujian ini."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    {participant.name}
                  </TableCell>
                  <TableCell>{participant.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {participant.createdAt.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        basePath={basePath}
        page={result.page}
        pageSize={result.pageSize}
        params={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </>
  )
}

export default async function ScheduleEligibilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { scheduleId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, SCHEDULES_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const [schedule, pageParams] = await Promise.all([
    getExamScheduleById(scheduleId),
    parseTableParams(await searchParams),
  ])

  if (!schedule) {
    notFound()
  }

  const [grantedUsers, grantedGroups, grantableUsers, grantableGroups, eligible] =
    await Promise.all([
      listGrantedUsers(scheduleId),
      listGrantedGroups(scheduleId),
      listGrantableUsers(scheduleId),
      listGrantableGroups(scheduleId),
      listEligibleParticipantsPage(scheduleId, pageParams),
    ])

  const basePath = `${SCHEDULES_PATH}/${scheduleId}/eligibility`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          href={SCHEDULES_PATH}
        >
          ← Kembali ke Jadwal Ujian
        </Link>
        <h1 className="text-2xl font-semibold">Aturan Akses · {schedule.name}</h1>
        <p className="text-sm text-muted-foreground">
          Peserta berhak mengikuti ujian ini jika diberi akses langsung atau
          menjadi anggota grup yang diberi akses.
        </p>
      </div>

      <ScheduleEligibilityManager
        grantableGroups={grantableGroups}
        grantableUsers={grantableUsers}
        grantedGroups={grantedGroups}
        grantedUsers={grantedUsers}
        scheduleId={scheduleId}
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Daftar Peserta Berhak</h2>
          <p className="text-sm text-muted-foreground">
            {eligible.total} peserta dihitung dari akses langsung dan anggota
            grup di atas.
          </p>
        </div>

        <EligibilitySearch basePath={basePath} params={pageParams} />
        <EligibleParticipantsTable
          basePath={basePath}
          params={pageParams}
          result={eligible}
        />
      </section>
    </div>
  )
}
