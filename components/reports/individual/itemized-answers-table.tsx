import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ItemizedQuestionResult } from "@/lib/reports/individual-types"

export interface ItemizedAnswersTableProps {
  questions: ItemizedQuestionResult[]
  className?: string
}

function getQuestionTypeBadge(type: string) {
  switch (type) {
    case "single":
      return <Badge variant="outline" className="text-[10px]">Pilihan Ganda</Badge>
    case "scored":
      return <Badge variant="outline" className="text-[10px]">Skor Bobot</Badge>
    case "manual":
      return <Badge variant="outline" className="text-[10px]">Esai / Uraian</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{type}</Badge>
  }
}

export function ItemizedAnswersTable({
  questions,
  className,
}: ItemizedAnswersTableProps) {
  return (
    <div
      className={`rounded-xl border bg-card p-6 shadow-sm print:border-none print:p-0 print:shadow-none ${
        className || ""
      }`}
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground print:text-black">
          Rincian Jawaban Butir Soal ({questions.length})
        </h2>
        <p className="text-xs text-muted-foreground print:text-black">
          Daftar butir pertanyaan, respon siswa, status kebenaran, dan perolehan skor
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border print:border print:border-neutral-300">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45px] text-center print:text-black">No</TableHead>
              <TableHead className="w-[120px] print:text-black">Tipe & Kategori</TableHead>
              <TableHead className="min-w-[220px] print:text-black">Pertanyaan</TableHead>
              <TableHead className="min-w-[180px] print:text-black">Jawaban Peserta</TableHead>
              <TableHead className="w-[110px] text-center print:text-black">Status</TableHead>
              <TableHead className="w-[90px] text-right print:text-black">Poin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Tidak ada data butir soal untuk pengerjaan ini.
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q) => (
                <TableRow key={q.questionId} className="print:break-inside-avoid">
                  <TableCell className="text-center font-mono font-medium print:text-black">
                    {q.position}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getQuestionTypeBadge(q.type)}
                      <span className="text-[11px] text-muted-foreground print:text-black">
                        {q.categoryName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2 text-foreground print:line-clamp-none print:text-black">
                      {q.promptText || "(Tanpa teks prompt)"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2 font-medium text-foreground print:line-clamp-none print:text-black">
                      {q.studentAnswerText}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    {q.type === "manual" && q.pointsAwarded === null ? (
                      <Badge variant="warning" className="text-[10px]">
                        Menunggu Koreksi
                      </Badge>
                    ) : q.isCorrect === true ? (
                      <Badge variant="success" className="text-[10px]">
                        Benar
                      </Badge>
                    ) : q.isCorrect === false ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Salah
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Dinilai
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold print:text-black">
                    <span>{q.pointsAwarded !== null ? q.pointsAwarded : "—"}</span>
                    <span className="font-normal text-muted-foreground print:text-black">
                      {" "}
                      / {q.maxPoints}
                    </span>
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
