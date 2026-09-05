import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SessionGroupBreakdown } from "@/lib/reports/session-types"

export interface SessionGroupTableProps {
  groups: SessionGroupBreakdown[]
  className?: string
}

export function SessionGroupTable({
  groups,
  className,
}: SessionGroupTableProps) {
  return (
    <div
      className={`rounded-xl border bg-card p-6 shadow-sm print:border-none print:p-0 print:shadow-none ${
        className || ""
      }`}
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground print:text-black">
          Rekapitulasi per Rombel / Grup Peserta
        </h2>
        <p className="text-xs text-muted-foreground print:text-black">
          Perbandingan tingkat partisipasi kehadiran dan rata-rata skor per kelompok kelas
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border print:border print:border-neutral-300">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px] print:text-black">Rombel / Grup</TableHead>
              <TableHead className="text-center print:text-black">Terdaftar</TableHead>
              <TableHead className="text-center print:text-black">Hadir</TableHead>
              <TableHead className="text-center print:text-black">% Kehadiran</TableHead>
              <TableHead className="text-center print:text-black">Selesai</TableHead>
              <TableHead className="text-right print:text-black">Rata-rata Skor</TableHead>
              <TableHead className="text-right print:text-black">% Lulus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-20 text-center text-muted-foreground"
                >
                  Tidak ada data rombel / grup terdaftar pada sesi ini.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => (
                <TableRow key={g.groupName} className="print:break-inside-avoid">
                  <TableCell className="font-semibold text-foreground print:text-black">
                    {g.groupName}
                  </TableCell>
                  <TableCell className="text-center font-mono print:text-black">
                    {g.eligibleCount}
                  </TableCell>
                  <TableCell className="text-center font-mono print:text-black">
                    {g.presentCount}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-primary print:text-black">
                    {g.attendanceRate}%
                  </TableCell>
                  <TableCell className="text-center font-mono print:text-black">
                    {g.completedCount}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-foreground print:text-black">
                    {g.averageScore !== null ? g.averageScore : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold print:text-black">
                    {g.passRate !== null ? `${g.passRate}%` : "—"}
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
