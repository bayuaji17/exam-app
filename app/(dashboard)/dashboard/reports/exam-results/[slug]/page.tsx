import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  LayersIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ReportExportButtons } from "@/components/reports/report-export-buttons"
import { ReportParticipantsTable } from "@/components/reports/report-participants-table"
import { ReportStatCard } from "@/components/reports/report-stat-card"
import { ScoreDistributionChart } from "@/components/reports/score-distribution-chart"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { getScheduleReportData } from "@/lib/reports/queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/reports/exam-results"

export default async function ScheduleReportDetailPage(props: {
  params: Promise<{ slug: string }>
}) {
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

  const { slug } = await props.params
  const report = await getScheduleReportData(slug)

  if (!report) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
              <Link href={BASE_PATH}>
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Laporan Analisis
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {report.scheduleTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
            <span>Paket: <strong className="text-foreground">{report.packageTitle}</strong></span>
            <span>•</span>
            <Badge variant="outline">
              KKM: {report.passScore !== null ? report.passScore : "Tidak Ditentukan"}
            </Badge>
            <Badge variant="outline">
              Total Poin: {report.totalPoints}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ReportExportButtons scheduleId={report.scheduleId} />
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStatCard
          title="Tingkat Kelulusan"
          value={`${report.stats.passingRate}%`}
          description={`${report.stats.passingCount} lulus, ${report.stats.failingCount} tidak lulus`}
          icon={<CheckCircle2Icon className="h-5 w-5 text-emerald-500" />}
        />
        <ReportStatCard
          title="Rata-rata Skor"
          value={report.stats.averageScore}
          description={`Median: ${report.stats.medianScore}`}
          icon={<TrendingUpIcon className="h-5 w-5 text-blue-500" />}
        />
        <ReportStatCard
          title="Partisipasi Peserta"
          value={`${report.stats.totalAttemptsSubmitted}`}
          description={`dari ${report.stats.totalParticipantsEligible} berhak (${report.stats.totalFullyGraded} dinilai)`}
          icon={<UsersIcon className="h-5 w-5 text-purple-500" />}
        />
        <ReportStatCard
          title="Rentang Nilai"
          value={`${report.stats.highestScore} / ${report.stats.lowestScore}`}
          description={`Maks / Min (Deviasi: ${report.stats.standardDeviation})`}
          icon={<LayersIcon className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Distribution Chart & Statistics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <ScoreDistributionChart distribution={report.stats.distribution} />
        </div>
      </div>

      {/* Participant Roster Table */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Daftar Nilai Peserta ({report.participants.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Rincian pengerjaan individual, status verifikasi soal esai manual, dan hasil kelulusan.
          </p>
        </div>

        <ReportParticipantsTable participants={report.participants} />
      </div>
    </div>
  )
}
