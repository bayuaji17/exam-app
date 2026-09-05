"use client"

import { useState, useTransition } from "react"
import { Check, Copy, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { regenerateScheduleTokenAction } from "@/lib/exam-schedules/actions"

export function ScheduleTokenCell({
  scheduleId,
  initialToken,
}: {
  scheduleId: string
  initialToken: string | null
}) {
  const [token, setToken] = useState(initialToken)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleCopy() {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRegenerate() {
    if (!confirm("Regenerasi token ujian? Token lama tidak akan dapat digunakan oleh peserta baru yang belum masuk.")) {
      return
    }

    startTransition(async () => {
      const result = await regenerateScheduleTokenAction({ scheduleId })
      if (result.ok) {
        setToken(result.token)
      }
    })
  }

  if (!token) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm">
      <span className="font-semibold tracking-wider text-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
        {token}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        title="Salin Token"
        onClick={handleCopy}
        type="button"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        title="Regenerasi Token"
        disabled={isPending}
        onClick={handleRegenerate}
        type="button"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      </Button>
    </div>
  )
}
