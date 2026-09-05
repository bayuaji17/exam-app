import { Badge } from "@/components/ui/badge"
import type { StudentTranscriptReport } from "@/lib/reports/individual-types"

export interface IndividualReportHeaderProps {
  report: StudentTranscriptReport
  className?: string
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function IndividualReportHeader({
  report,
  className,
}: IndividualReportHeaderProps) {
  const { student } = report

  return (
    <div
      className={`flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm print:border-none print:p-0 print:shadow-none ${
        className || ""
      }`}
    >
      {/* Official Heading */}
      <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-start print:border-b-2 print:border-black">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-black">
            Laporan Penilaian Akademik
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl print:text-2xl print:text-black">
            {report.scheduleTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground print:text-black">
            Paket: <strong className="text-foreground print:text-black">{report.packageTitle}</strong> ({report.kodePaket})
          </p>
        </div>

        {/* Score & Status Highlight */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground print:text-black">Nilai Akhir</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-foreground print:text-3xl print:text-black">
                {report.finalScore !== null ? report.finalScore : "—"}
              </span>
              <span className="text-sm font-medium text-muted-foreground print:text-black">
                / {report.maxTotalPoints}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {!report.fullyGraded ? (
              <Badge variant="warning" className="text-xs font-semibold">
                Menunggu Penilaian
              </Badge>
            ) : report.passing === true ? (
              <Badge variant="success" className="text-xs font-semibold">
                Lulus
              </Badge>
            ) : report.passing === false ? (
              <Badge variant="destructive" className="text-xs font-semibold">
                Tidak Lulus
              </Badge>
            ) : (
              <Badge variant="muted" className="text-xs">
                —
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground print:text-black">
              KKM: {report.passScore !== null ? report.passScore : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Meta Grid: Student info & Attempt Details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground print:text-black">Nama Peserta</span>
          <p className="text-sm font-semibold text-foreground print:text-black">{student.name}</p>
          <p className="text-xs text-muted-foreground print:text-black">{student.email}</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground print:text-black">Nomor Identitas</span>
          <div className="space-y-0.5 font-mono text-xs">
            {student.nisn && (
              <div>
                <span className="text-muted-foreground print:text-black">NISN: </span>
                <span className="font-semibold text-foreground print:text-black">{student.nisn}</span>
              </div>
            )}
            {student.nis && (
              <div>
                <span className="text-muted-foreground print:text-black">NIS: </span>
                <span className="font-semibold text-foreground print:text-black">{student.nis}</span>
              </div>
            )}
            {student.nip && (
              <div>
                <span className="text-muted-foreground print:text-black">NIP: </span>
                <span className="font-semibold text-foreground print:text-black">{student.nip}</span>
              </div>
            )}
            {!student.nisn && !student.nis && !student.nip && (
              <span className="text-muted-foreground print:text-black">—</span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground print:text-black">No. Peserta / Token</span>
          <p className="font-mono text-sm font-semibold text-foreground print:text-black">
            {report.nomorPeserta || "—"}
          </p>
          <p className="text-xs text-muted-foreground print:text-black">
            Durasi: {report.durationMinutes !== null ? `${report.durationMinutes} Menit` : "—"}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground print:text-black">Waktu Pengumpulan</span>
          <p className="text-xs font-medium text-foreground print:text-black">
            {formatDate(report.submittedAt)}
          </p>
          <p className="text-[11px] text-muted-foreground print:text-black">
            Mulai: {formatDate(report.startedAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
