import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ScheduleReportParticipantItem } from "@/lib/reports/types"

export interface ReportParticipantsTableProps {
  participants: ScheduleReportParticipantItem[]
  className?: string
}

function formatSubmittedAt(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getIdentifierBadge(p: ScheduleReportParticipantItem) {
  if (p.identifierNisn) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        NISN: <span className="font-medium text-foreground">{p.identifierNisn}</span>
      </span>
    )
  }
  if (p.identifierNis) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        NIS: <span className="font-medium text-foreground">{p.identifierNis}</span>
      </span>
    )
  }
  if (p.identifierNip) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        NIP: <span className="font-medium text-foreground">{p.identifierNip}</span>
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

export function ReportParticipantsTable({
  participants,
  className,
}: ReportParticipantsTableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border bg-card shadow-sm ${className || ""}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">No</TableHead>
            <TableHead>Peserta</TableHead>
            <TableHead>Nomor Identitas</TableHead>
            <TableHead>Waktu Submit</TableHead>
            <TableHead className="text-right">Nilai Akhir</TableHead>
            <TableHead className="text-center">Status Koreksi</TableHead>
            <TableHead className="text-center">Status Kelulusan</TableHead>
            <TableHead className="w-[60px] text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-28 text-center text-muted-foreground"
              >
                Belum ada data pengerjaan peserta untuk jadwal ini.
              </TableCell>
            </TableRow>
          ) : (
            participants.map((p, idx) => (
              <TableRow key={p.attemptId}>
                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                  {idx + 1}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{p.participantName}</div>
                  <div className="text-xs text-muted-foreground">{p.participantEmail}</div>
                </TableCell>
                <TableCell>{getIdentifierBadge(p)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatSubmittedAt(p.submittedAt)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {p.score !== null ? p.score : "—"}
                </TableCell>
                <TableCell className="text-center">
                  {p.fullyGraded ? (
                    <Badge variant="success">Selesai Dinilai</Badge>
                  ) : (
                    <Badge variant="warning">Perlu Koreksi Manual</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {!p.fullyGraded ? (
                    <Badge variant="muted">Menunggu Penilaian</Badge>
                  ) : p.passing === true ? (
                    <Badge variant="success">Lulus</Badge>
                  ) : p.passing === false ? (
                    <Badge variant="destructive">Tidak Lulus</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {!p.fullyGraded ? (
                    <Link
                      href={`/dashboard/manual-grading/${p.attemptId}`}
                      title="Buka koreksi manual"
                      className="inline-flex items-center justify-center text-primary hover:underline"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
