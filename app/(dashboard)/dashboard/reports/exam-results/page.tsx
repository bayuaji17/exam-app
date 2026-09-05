import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowRightIcon, BarChart3Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReportExportButtons } from "@/components/reports/report-export-buttons"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { listReportSchedules } from "@/lib/reports/queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/reports/exam-results"

export default async function ExamResultsReportsHubPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)
  const effectivePermissions = await getUserEffectivePermissions(session.user.id)

  const isAuthorized =
    (role && userHasPermission(role, BASE_PATH)) ||
    (effectivePermissions && userHasPermission(effectivePermissions, BASE_PATH))

  if (!isAuthorized) {
    redirect("/dashboard/forbidden")
  }

  const schedules = await listReportSchedules()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Laporan Hasil Ujian
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Rekapitulasi komprehensif metrik analitik, kelulusan, dan ekspor data
          nilai peserta ujian.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jadwal Ujian</TableHead>
              <TableHead>Paket Soal</TableHead>
              <TableHead className="text-center">Terkumpul</TableHead>
              <TableHead className="text-center">Selesai Dinilai</TableHead>
              <TableHead className="text-right">Rata-rata Skor</TableHead>
              <TableHead className="text-right">Tingkat Kelulusan</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  Belum ada jadwal ujian dengan riwayat pengerjaan yang terkumpul.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((item) => (
                <TableRow key={item.scheduleId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${BASE_PATH}/${item.scheduleSlug}`}
                      className="text-foreground hover:text-primary hover:underline"
                    >
                      {item.scheduleTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.packageTitle}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="font-semibold text-foreground">
                      {item.submittedAttempts}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {item.totalAttempts}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {item.fullyGradedAttempts}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.averageScore}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.passingRate}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="default" asChild>
                        <Link href={`${BASE_PATH}/${item.scheduleSlug}`}>
                          Lihat Detail
                          <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <ReportExportButtons scheduleId={item.scheduleId} />
                    </div>
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
