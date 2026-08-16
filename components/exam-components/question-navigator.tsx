"use client"

import { cn } from "@/lib/utils"

/**
 * The question grid: one button per question, showing answered state and the
 * current position. Server-rendered alternatives are not possible — the
 * attempt page holds its own client state.
 */
export function QuestionNavigator({
  count,
  currentIndex,
  answered,
  onSelect,
}: {
  count: number
  currentIndex: number
  answered: Set<number>
  onSelect: (index: number) => void
}) {
  return (
    <nav aria-label="Navigasi soal" className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, index) => {
        const isCurrent = index === currentIndex
        const isAnswered = answered.has(index)

        return (
          <button
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Soal ${index + 1}${isAnswered ? " — sudah dijawab" : ""}`}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
              isCurrent && "border-primary bg-primary text-primary-foreground",
              !isCurrent && isAnswered && "border-primary/60 bg-primary/10 text-primary",
              !isCurrent && !isAnswered && "hover:bg-accent"
            )}
            key={index}
            type="button"
            onClick={() => onSelect(index)}
          >
            {index + 1}
          </button>
        )
      })}
    </nav>
  )
}
