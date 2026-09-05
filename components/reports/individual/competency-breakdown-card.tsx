import type { CategoryCompetency } from "@/lib/reports/individual-types"

export interface CompetencyBreakdownCardProps {
  competencies: CategoryCompetency[]
  className?: string
}

export function CompetencyBreakdownCard({
  competencies,
  className,
}: CompetencyBreakdownCardProps) {
  return (
    <div
      className={`rounded-xl border bg-card p-6 shadow-sm print:border-none print:p-0 print:shadow-none ${
        className || ""
      }`}
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground print:text-black">
          Capaian Kompetensi & Kategori Materi
        </h2>
        <p className="text-xs text-muted-foreground print:text-black">
          Evaluasi tingkat penguasaan kompetensi berdasarkan kategori butir soal
        </p>
      </div>

      {competencies.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Tidak ada data kategori materi pada paket ujian ini.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {competencies.map((comp) => {
            const barWidth = Math.min(100, Math.max(0, comp.percentage))

            return (
              <div
                key={comp.categoryId}
                className="space-y-2 rounded-lg border bg-muted/20 p-4 print:border print:border-neutral-300 print:bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground print:text-black">
                    {comp.categoryName}
                  </span>
                  <span className="font-mono text-sm font-bold text-primary print:text-black">
                    {comp.percentage}%
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted print:bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-primary print:bg-neutral-800"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground print:text-black">
                  <span>
                    Poin: <strong className="text-foreground print:text-black">{comp.earnedPoints}</strong> / {comp.maxPoints}
                  </span>
                  <span>
                    Benar: <strong className="text-foreground print:text-black">{comp.correctQuestions}</strong> / {comp.totalQuestions} soal
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
