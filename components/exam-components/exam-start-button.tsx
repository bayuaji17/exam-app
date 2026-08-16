"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { startAttemptAction } from "@/lib/attempts/actions"

/**
 * Starts (or resumes) an attempt and navigates to it. The server decides
 * resume-vs-new: an open attempt is returned as-is.
 */
export function ExamStartButton({
  scheduleId,
  label,
}: {
  scheduleId: string
  label: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setPending(true)
    setError(null)

    const result = await startAttemptAction(scheduleId)

    if (!result.ok) {
      setError(result.message ?? "Gagal memulai ujian.")
      setPending(false)
      return
    }

    router.push(`/exam/${scheduleId}/attempt/${result.attemptId}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={pending} onClick={handleStart} type="button">
        {pending ? "Memulai…" : label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
