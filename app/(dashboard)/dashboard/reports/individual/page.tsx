import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowRightIcon, GraduationCapIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IndividualFilterBar } from "@/components/reports/individual/individual-filter-bar"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import {
  listIndividualReportParticipants,
  listReportSchedulesFilter,
} from "@/lib/reports/individual-queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/reports/individual"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function IndividualReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ scheduleId?: string; search?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)
  const effectivePermissions = await getUserEffectivePermissions(
    session.user.id
  )

  const isAuthorized =
    (role && userHasPermission(role, BASE_PATH)) ||
    (effectivePermissions && userHasPermission(effectivePermissions, BASE_PATH))

  if (!isAuthorized) {
    redirect("/dashboard/forbidden")
  }

  const queryParams = await searchParams
  const currentPage = Math.max(1, Number(queryParams.page) || 1)
  const pageSize = 20
  const offset = (currentPage - 1) * pageSize

  const [schedules, { items: participants, total }] = await Promise.all([
    listReportSchedulesFilter(),
    listIndividualReportParticipants({
      scheduleId: queryParams.scheduleId,
      search: queryParams.search,
      limit: pageSize,
      offset,
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <GraduationCapIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Laporan Individu
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pencarian transkrip nilai, analisis penguasaan materi per kategori,
          dan pencetakan rapor hasil asesmen per siswa.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <IndividualFilterBar
        schedules={schedules}
        currentScheduleId={queryParams.scheduleId}
        currentSearch={queryParams.search}
      />

      {/* Participants Roster Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45px] text-center">No</TableHead>
              <TableHead className="min-w-[180px]">Peserta Ujian</TableHead>
              <TableHead className="min-w-[140px]">Identitas</TableHead>
              <TableHead className="min-w-[200px]">Jadwal Pelaksanaan</TableHead>
              <TableHead className="w-[100px] text-right">Nilai</TableHead>
              <TableHead className="w-[120px] text-center">Kelulusan</TableHead>
              <TableHead className="w-[140px] text-muted-foreground">
                Dikumpulkan
              </TableHead>
              <TableHead className="w-[110px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  Tidak ditemukan data peserta ujian yang memenuhi kriteria
                  filter.
                </TableCell>
              </TableRow>
            ) : (
              participants.map((p, index) => (
                <TableRow key={p.attemptId} className="hover:bg-muted/40">
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {offset + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {p.participantName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.participantEmail}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      {p.identifierNisn && (
                        <span className="font-mono">
                          NISN: {p.identifierNisn}
                        </span>
                      )}
                      {p.identifierNis && (
                        <span className="font-mono">NIS: {p.identifierNis}</span>
                      )}
                      {p.identifierNip && (
                        <span className="font-mono">NIP: {p.identifierNip}</span>
                      )}
                      {!p.identifierNisn &&
                        !p.identifierNis &&
                        !p.identifierNip && (
                          <span className="text-muted-foreground">—</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">
                        {p.scheduleTitle}
                      </span>
                      {p.nomorPeserta && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          No: {p.nomorPeserta}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {p.score !== null ? p.score : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {!p.fullyGraded ? (
                      <Badge variant="warning" className="text-[10px]">
                        Menunggu Koreksi
                      </Badge>
                    ) : p.passing === true ? (
                      <Badge variant="success" className="text-[10px]">
                        Lulus
                      </Badge>
                    ) : p.passing === false ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Tidak Lulus
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        —
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.submittedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link
                        href={`/dashboard/reports/individual/${p.attemptId}`}
                      >
                        Buka Rapor
                        <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>
            Menampilkan {offset + 1} - {Math.min(offset + pageSize, total)} dari{" "}
            {total} peserta
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link
                  href={`?${new URLSearchParams({
                    ...(queryParams.scheduleId
                      ? { scheduleId: queryParams.scheduleId }
                      : {}),
                    ...(queryParams.search
                      ? { search: queryParams.search }
                      : {}),
                    page: String(currentPage - 1),
                  }).toString()}`}
                >
                  Sebelumnya
                </Link>
              </Button>
            )}
            <span>
              Halaman {currentPage} dari {totalPages}
            </span>
            {currentPage < totalPages && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link
                  href={`?${new URLSearchParams({
                    ...(queryParams.scheduleId
                      ? { scheduleId: queryParams.scheduleId }
                      : {}),
                    ...(queryParams.search
                      ? { search: queryParams.search }
                      : {}),
                    page: String(currentPage + 1),
                  }).toString()}`}
                >
                  Berikutnya
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
