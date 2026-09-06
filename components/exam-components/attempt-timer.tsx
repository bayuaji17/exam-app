"use client"

import { useEffect, useRef, useState } from "react"
import { Clock } from "lucide-react"

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, "0")

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * The countdown for an attempt matching CBT header design.
 * Server-authoritative deadline; reports expiry via onExpired.
 */
export function AttemptTimer({
  deadlineAt,
  onExpired,
}: {
  deadlineAt: string | null
  onExpired: () => void
}) {
  const [remaining, setRemaining] = useState<number | null>(() =>
    deadlineAt === null ? null : new Date(deadlineAt).getTime() - Date.now()
  )
  const [expired, setExpired] = useState(false)
  const firedRef = useRef(false)

  useEffect(() => {
    if (deadlineAt === null) {
      return
    }

    firedRef.current = false

    const tick = () => {
      const left = new Date(deadlineAt).getTime() - Date.now()

      setRemaining(left)

      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        setExpired(true)
        onExpired()
      }
    }

    const interval = setInterval(tick, 1000)
    tick()

    return () => clearInterval(interval)
  }, [deadlineAt, onExpired])

  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm font-semibold tabular-nums shadow-2xs"
    >
      <Clock className="size-4 text-muted-foreground" />
      {deadlineAt === null ? (
        <span className="text-muted-foreground text-xs">Tanpa batas</span>
      ) : expired ? (
        <span className="text-destructive text-xs font-bold uppercase tracking-wider">
          Waktu Habis
        </span>
      ) : (
        <span className="text-foreground tracking-wide font-mono">
          {formatRemaining(remaining ?? 0)}
        </span>
      )}
    </div>
  )
}
