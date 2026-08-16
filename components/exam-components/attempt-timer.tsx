"use client"

import { useEffect, useRef, useState } from "react"

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, "0")

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

/**
 * The countdown for an attempt. The deadline is server-authoritative; this
 * only displays it and reports expiry via `onExpired` (the caller submits).
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
    // The deadline is fixed for the attempt's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineAt])

  return (
    <div aria-live="polite" className="text-sm tabular-nums">
      {deadlineAt === null ? (
        <span className="text-muted-foreground">Tanpa batas waktu</span>
      ) : expired ? (
        <span className="font-semibold text-destructive">Waktu habis</span>
      ) : (
        <span className="font-semibold">
          Sisa waktu: {formatRemaining(remaining ?? 0)}
        </span>
      )}
    </div>
  )
}
