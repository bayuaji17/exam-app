import type { ScoreDistributionBucket } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

export interface ScoreDistributionChartProps {
  distribution: ScoreDistributionBucket[]
  className?: string
}

export function ScoreDistributionChart({
  distribution,
  className,
}: ScoreDistributionChartProps) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count))

  return (
    <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
      <div className="mb-4">
        <h3 className="text-base font-semibold">Distribusi Rentang Nilai</h3>
        <p className="text-xs text-muted-foreground">
          Persebaran nilai peserta pada skala 0 - 100
        </p>
      </div>

      <div className="space-y-4">
        {distribution.map((bucket) => {
          const barWidthPercent =
            bucket.count > 0
              ? Math.max(4, Math.round((bucket.count / maxCount) * 100))
              : 0

          return (
            <div key={bucket.range} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {bucket.range}
                </span>
                <span className="text-muted-foreground">
                  {bucket.percentage}% ({bucket.count} peserta)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
