"use client"

import { cn } from "@/lib/utils"

/**
 * The question grid: one button per question, showing answered state, flagged (ragu-ragu) state,
 * and current position.
 */
export function QuestionNavigator({
  count,
  currentIndex,
  answered,
  flagged = new Set(),
  onSelect,
}: {
  count: number
  currentIndex: number
  answered: Set<number>
  flagged?: Set<number>
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navigasi Nomor Soal
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Terjawab: <span className="font-semibold text-foreground">{answered.size}</span> / {count}
          {flagged.size > 0 && (
            <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
              ({flagged.size} ragu-ragu)
            </span>
          )}
        </span>
      </div>

      <nav aria-label="Navigasi soal" className="flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, index) => {
          const isCurrent = index === currentIndex
          const isAnswered = answered.has(index)
          const isFlagged = flagged.has(index)

          return (
            <button
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Soal ${index + 1}${isFlagged ? " — ragu-ragu" : isAnswered ? " — sudah dijawab" : ""}`}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-all",
                // Flagged state takes visual priority for awareness
                isFlagged && [
                  "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold",
                  isCurrent && "ring-2 ring-amber-500 ring-offset-2 ring-offset-background font-bold",
                ],
                // Answered state (and not flagged)
                !isFlagged && isAnswered && [
                  "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  isCurrent && "border-primary bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
                ],
                // Unanswered state (and not flagged)
                !isFlagged && !isAnswered && [
                  "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                  isCurrent && "border-primary bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2 ring-offset-background",
                ]
              )}
              key={index}
              type="button"
              onClick={() => onSelect(index)}
            >
              {index + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-amber-500" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-4 pt-1 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-emerald-500/60 bg-emerald-500/10 inline-block" />
          <span>Sudah dijawab</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative size-3 rounded-sm border border-amber-500 bg-amber-500/20 inline-block">
            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500" />
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">Ragu-ragu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-border bg-background inline-block" />
          <span>Belum dijawab</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-primary bg-primary inline-block" />
          <span>Sedang dibuka</span>
        </div>
      </div>
    </div>
  )
}
