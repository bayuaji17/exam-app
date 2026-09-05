import {
  CheckCircle2Icon,
  ClockIcon,
  HelpCircleIcon,
  UserCheckIcon,
} from "lucide-react"

import type { SessionKPIStats } from "@/lib/reports/session-types"

export interface SessionKpiCardsProps {
  kpi: SessionKPIStats
  className?: string
}

export function SessionKpiCards({ kpi, className }: SessionKpiCardsProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${
        className || ""
      }`}
    >
      {/* 1. Kehadiran */}
      <div className="flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm print:border-neutral-300 print:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground print:text-black">
            Kehadiran Peserta
          </span>
          <div className="rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
            <UserCheckIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground print:text-black">
            {kpi.presentCount}
          </span>
          <span className="text-xs text-muted-foreground print:text-black">
            / {kpi.eligibleCount} Terdaftar
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-blue-600 dark:text-blue-400 print:text-black">
            {kpi.attendanceRate}%
          </span>
          <span className="text-muted-foreground print:text-black">
            Tingkat kehadiran
          </span>
        </div>
      </div>

      {/* 2. Penyelesaian */}
      <div className="flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm print:border-neutral-300 print:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground print:text-black">
            Selesai Mengerjakan
          </span>
          <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground print:text-black">
            {kpi.completedCount}
          </span>
          <span className="text-xs text-muted-foreground print:text-black">
            Peserta
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 print:text-black">
            {kpi.completionRate}%
          </span>
          <span className="text-muted-foreground print:text-black">
            Tingkat penyelesaian
          </span>
        </div>
      </div>

      {/* 3. Belum Hadir / Absen */}
      <div className="flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm print:border-neutral-300 print:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground print:text-black">
            Tidak Hadir / Absen
          </span>
          <div className="rounded-md bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
            <HelpCircleIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 print:text-black">
            {kpi.absentCount}
          </span>
          <span className="text-xs text-muted-foreground print:text-black">
            Peserta
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground print:text-black">
          <span>Sedang aktif: </span>
          <strong className="text-foreground print:text-black">{kpi.inProgressCount}</strong>
        </div>
      </div>

      {/* 4. Pengumpulan: Mandiri vs Sistem */}
      <div className="flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm print:border-neutral-300 print:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground print:text-black">
            Audit Pengumpulan
          </span>
          <div className="rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
            <ClockIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground print:text-black">
            {kpi.manualSubmitCount}
          </span>
          <span className="text-xs text-muted-foreground print:text-black">
            Mandiri
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground print:text-black">
          <span>Otomatis deadline: </span>
          <strong className="text-foreground print:text-black">{kpi.autoSubmitCount}</strong>
        </div>
      </div>
    </div>
  )
}
