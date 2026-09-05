import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  ArrowRightIcon,
  MonitorCheckIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { listSessionReportSummaries } from "@/lib/reports/session-queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/reports/sessions"

function formatDateRange(startsAt: Date, endsAt: Date): string {
  const startStr = new Date(startsAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const endStr = new Date(endsAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${startStr} - ${endStr}`
}

export default async function SessionReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
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
  const search = queryParams.search?.trim() || undefined

  const sessions = await listSessionReportSummaries(search)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <MonitorCheckIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Laporan Per Sesi
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Rekapitulasi kehadiran peserta, tingkat penyelesaian, analisis pengumpulan,
          serta pencetakan berita acara pelaksanaan per sesi ujian.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 sm:max-w-sm" method="GET">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search || ""}
            placeholder="Cari jadwal atau paket ujian..."
            className="h-9 pl-9 text-xs"
          />
        </form>

        {search && (
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/dashboard/reports/sessions">Reset Pencarian</Link>
          </Button>
        )}
      </div>

      {/* Sessions Summary Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45px] text-center">No</TableHead>
              <TableHead className="min-w-[200px]">Jadwal & Paket Ujian</TableHead>
              <TableHead className="min-w-[180px]">Waktu Pelaksanaan</TableHead>
              <TableHead className="w-[120px] text-center">Peserta Hadir</TableHead>
              <TableHead className="w-[110px] text-center">% Hadir</TableHead>
              <TableHead className="w-[110px] text-center">Selesai</TableHead>
              <TableHead className="w-[140px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  Tidak ditemukan sesi ujian yang sesuai dengan kriteria.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s, index) => (
                <TableRow key={s.scheduleId} className="hover:bg-muted/40">
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {s.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Paket: {s.packageName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-medium text-foreground">
                        {formatDateRange(s.startsAt, s.endsAt)}
                      </span>
                      <span className="text-muted-foreground">
                        Durasi: {s.durationMinutes ? `${s.durationMinutes} menit` : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    <span className="font-bold text-foreground">{s.presentCount}</span>
                    <span className="text-muted-foreground"> / {s.eligibleCount}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-bold text-primary">
                    {s.attendanceRate}%
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {s.completedCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link href={`/dashboard/reports/sessions/${s.slug}`}>
                        Buka Presensi
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
    </div>
  )
}
