"use client"

import { useMemo, useState } from "react"

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
import type {
  SessionAttendanceRow,
  SessionAttendanceStatus,
} from "@/lib/reports/session-types"

export interface SessionAttendanceTableProps {
  roster: SessionAttendanceRow[]
  className?: string
}

function formatTime(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SessionAttendanceTable({
  roster,
  className,
}: SessionAttendanceTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL")

  const filteredRoster = useMemo(() => {
    if (filterStatus === "ALL") return roster
    return roster.filter((r) => r.status === filterStatus)
  }, [roster, filterStatus])

  return (
    <div
      className={`rounded-xl border bg-card p-6 shadow-sm print:border-none print:p-0 print:shadow-none ${
        className || ""
      }`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground print:text-black">
            Daftar Hadir & Presensi Peserta ({roster.length})
          </h2>
          <p className="text-xs text-muted-foreground print:text-black">
            Catatan kehadiran, waktu mulai/selesai, cara pengumpulan, dan skor peserta
          </p>
        </div>

        {/* Filter Tabs (Hidden during print) */}
        <div className="flex flex-wrap items-center gap-1 print:hidden">
          <Button
            variant={filterStatus === "ALL" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus("ALL")}
          >
            Semua ({roster.length})
          </Button>
          <Button
            variant={filterStatus === "completed" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus("completed")}
          >
            Selesai ({roster.filter((r) => r.status === "completed").length})
          </Button>
          <Button
            variant={filterStatus === "in_progress" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus("in_progress")}
          >
            Sedang Mengerjakan ({roster.filter((r) => r.status === "in_progress").length})
          </Button>
          <Button
            variant={filterStatus === "absent" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus("absent")}
          >
            Belum Hadir ({roster.filter((r) => r.status === "absent").length})
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border print:border print:border-neutral-300">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45px] text-center print:text-black">No</TableHead>
              <TableHead className="min-w-[180px] print:text-black">Peserta Ujian</TableHead>
              <TableHead className="min-w-[120px] print:text-black">Identitas</TableHead>
              <TableHead className="min-w-[120px] print:text-black">Rombel / Grup</TableHead>
              <TableHead className="w-[120px] text-center print:text-black">Status Hadir</TableHead>
              <TableHead className="min-w-[140px] print:text-black">Waktu & Durasi</TableHead>
              <TableHead className="w-[110px] text-center print:text-black">Submit Mode</TableHead>
              <TableHead className="w-[90px] text-right print:text-black">Skor Akhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoster.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Tidak ada peserta untuk filter status ini.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoster.map((r, index) => (
                <TableRow key={r.userId} className="print:break-inside-avoid">
                  <TableCell className="text-center font-mono text-muted-foreground print:text-black">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground print:text-black">
                        {r.name}
                      </span>
                      <span className="text-xs text-muted-foreground print:text-black">
                        {r.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      {r.nisn && (
                        <span className="font-mono print:text-black">
                          NISN: {r.nisn}
                        </span>
                      )}
                      {r.nis && (
                        <span className="font-mono print:text-black">
                          NIS: {r.nis}
                        </span>
                      )}
                      {r.nip && (
                        <span className="font-mono print:text-black">
                          NIP: {r.nip}
                        </span>
                      )}
                      {!r.nisn && !r.nis && !r.nip && (
                        <span className="text-muted-foreground print:text-black">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground print:text-black">
                    {r.groupName || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.status === "completed" ? (
                      <Badge variant="success" className="text-[10px]">
                        Selesai
                      </Badge>
                    ) : r.status === "in_progress" ? (
                      <Badge variant="warning" className="text-[10px]">
                        Sedang Mengerjakan
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        Belum Hadir
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.startedAt ? (
                      <div className="flex flex-col text-xs">
                        <span className="text-foreground print:text-black">
                          {formatTime(r.startedAt)} - {formatTime(r.submittedAt)}
                        </span>
                        {r.durationMinutes !== null && (
                          <span className="text-[11px] text-muted-foreground print:text-black">
                            {r.durationMinutes} menit
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground print:text-black">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.submissionType === "participant" ? (
                      <Badge variant="outline" className="text-[10px]">
                        Mandiri
                      </Badge>
                    ) : r.submissionType === "system" ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Otomatis
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground print:text-black">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold print:text-black">
                    {r.score !== null ? (
                      <div className="flex flex-col items-end">
                        <span className="text-foreground print:text-black">{r.score}</span>
                        {r.passing === true && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 print:text-black">
                            (Lulus)
                          </span>
                        )}
                        {r.passing === false && (
                          <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 print:text-black">
                            (Gagal)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground print:text-black">—</span>
                    )}
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
