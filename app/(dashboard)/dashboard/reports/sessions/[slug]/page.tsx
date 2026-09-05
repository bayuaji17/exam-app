import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, CalendarIcon, ClockIcon, LayersIcon } from "lucide-react"

import { SessionAttendanceTable } from "@/components/reports/sessions/session-attendance-table"
import { SessionGroupTable } from "@/components/reports/sessions/session-group-table"
import { SessionKpiCards } from "@/components/reports/sessions/session-kpi-cards"
import { SessionPrintButton } from "@/components/reports/sessions/session-print-button"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { getSessionReportDetail } from "@/lib/reports/session-queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/reports/sessions"

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function SessionReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
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

  const resolvedParams = await params
  const report = await getSessionReportDetail(resolvedParams.slug)

  if (!report) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6 print:m-0 print:p-0">
      {/* Navigation & Action Bar (Hidden in print) */}
      <div className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <Button asChild variant="ghost" size="sm" className="w-fit text-xs">
          <Link href="/dashboard/reports/sessions">
            <ArrowLeftIcon className="mr-1.5 h-4 w-4" />
            Kembali ke Daftar Sesi
          </Link>
        </Button>
        <SessionPrintButton />
      </div>

      {/* Official Header (Academic Heading for Print & Screen) */}
      <div className="rounded-xl border bg-card p-6 shadow-sm print:border-none print:p-0 print:shadow-none">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary print:text-black">
            Berita Acara Pelaksanaan & Presensi Ujian
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground print:text-xl print:text-black">
            {report.scheduleName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground print:text-black">
            Paket Soal: <span className="font-semibold text-foreground print:text-black">{report.packageName}</span>
            {report.passScore !== null && (
              <> • Batas Kelulusan (KKM): <span className="font-mono font-bold text-foreground print:text-black">{report.passScore}</span></>
            )}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t pt-4 text-xs text-muted-foreground print:border-neutral-300 print:text-black">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 print:hidden" />
            <span>Tanggal: <strong>{formatDate(report.startsAt)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 print:hidden" />
            <span>
              Waktu: <strong>{formatTime(report.startsAt)} - {formatTime(report.endsAt)} WIB</strong>
              {report.durationMinutes && <> ({report.durationMinutes} menit)</>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LayersIcon className="h-3.5 w-3.5 print:hidden" />
            <span>Total Terdaftar: <strong>{report.kpi.eligibleCount} Peserta</strong></span>
          </div>
        </div>
      </div>

      {/* Key Metric KPI Cards */}
      <SessionKpiCards kpi={report.kpi} />

      {/* Group Comparative Breakdown */}
      {report.groups.length > 0 && (
        <SessionGroupTable groups={report.groups} />
      )}

      {/* Attendance Roster */}
      <SessionAttendanceTable roster={report.roster} />

      {/* Official Sign-off & Proctor Verification Block */}
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm print:break-inside-avoid print:border-none print:p-0 print:shadow-none">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">
          Pengesahan Berita Acara Ujian
        </h3>
        <p className="mt-1 text-xs text-muted-foreground print:text-black">
          Berita acara ini dibuat dan ditandatangani oleh panitia pelaksana dan pengawas ujian dengan sebenar-benarnya.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground print:text-black">Pengawas Ruangan 1</span>
            <div className="my-10 h-10 w-36 border-b border-dashed border-muted-foreground/50 print:border-neutral-400" />
            <span className="text-xs font-medium text-foreground print:text-black">( .................................................. )</span>
            <span className="text-[10px] text-muted-foreground print:text-black">NIP. .................................................</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground print:text-black">Pengawas Ruangan 2</span>
            <div className="my-10 h-10 w-36 border-b border-dashed border-muted-foreground/50 print:border-neutral-400" />
            <span className="text-xs font-medium text-foreground print:text-black">( .................................................. )</span>
            <span className="text-[10px] text-muted-foreground print:text-black">NIP. .................................................</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground print:text-black">Ketua Panitia Pelaksana</span>
            <div className="my-10 h-10 w-36 border-b border-dashed border-muted-foreground/50 print:border-neutral-400" />
            <span className="text-xs font-medium text-foreground print:text-black">( .................................................. )</span>
            <span className="text-[10px] text-muted-foreground print:text-black">NIP. .................................................</span>
          </div>
        </div>
      </div>
    </div>
  )
}
