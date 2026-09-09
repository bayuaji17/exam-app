"use client"

import { cn } from "@/lib/utils"

/**
 * The question grid: one button per question, showing answered state, flagged (ragu-ragu) state,
 * and current position in a 5-column layout with a progress widget matching the CBT interface design.
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
  const answeredCount = answered.size
  const progressPercent = count > 0 ? Math.round((answeredCount / count) * 100) : 0

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Navigation Card */}
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            NAVIGATION
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count} Questions total
          </p>
        </div>

        {/* 5-Column Grid */}
        <nav
          aria-label="Navigasi nomor soal"
          className="grid grid-cols-5 gap-2 my-4 max-h-[420px] overflow-y-auto pr-1"
        >
          {Array.from({ length: count }, (_, index) => {
            const isCurrent = index === currentIndex
            const isAnswered = answered.has(index)
            const isFlagged = flagged.has(index)

            return (
              <button
                key={index}
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                  // Current Active takes top precedence (solid blue)
                  isCurrent &&
                    "border-blue-600 bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700",
                  // Flagged (when not current, soft peach with red R badge)
                  !isCurrent &&
                    isFlagged &&
                    "border-amber-300 bg-amber-100/90 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100 font-semibold hover:bg-amber-200/80",
                  // Answered (when not current and not flagged)
                  !isCurrent &&
                    !isFlagged &&
                    isAnswered &&
                    "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200 font-medium hover:bg-blue-100/70",
                  // Default unanswered (when not current and not flagged)
                  !isCurrent &&
                    !isFlagged &&
                    !isAnswered &&
                    "border-border/80 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {index + 1}
                {isFlagged && (
                  <span
                    title="Ragu-ragu"
                    className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-xs ring-1 ring-background"
                  >
                    R
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Progress Card */}
      <div className="rounded-xl border bg-card p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-foreground">Progress</span>
          <span className="text-muted-foreground font-mono">{progressPercent}%</span>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {answeredCount} of {count} answered
        </p>
      </div>
    </div>
  )
}
