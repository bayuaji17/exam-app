"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  movePackageQuestionAction,
  removeQuestionFromPackageAction,
} from "@/lib/exam-packages/actions"

/**
 * Per-row composition controls: move up/down and remove.
 */
export function PackageQuestionActions({
  examId,
  questionId,
  position,
  total,
}: {
  examId: string
  questionId: string
  position: number
  total: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    const result = await action()

    if (!result.ok) {
      setError(result.message ?? "Aksi gagal.")
      return
    }

    refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label="Naikkan urutan"
        disabled={isPending || position === 0}
        size="icon-sm"
        type="button"
        variant="outline"
        onClick={() =>
          run(() => movePackageQuestionAction(examId, questionId, "up"))
        }
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Turunkan urutan"
        disabled={isPending || position === total - 1}
        size="icon-sm"
        type="button"
        variant="outline"
        onClick={() =>
          run(() => movePackageQuestionAction(examId, questionId, "down"))
        }
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Keluarkan dari paket"
        disabled={isPending}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() =>
          run(() => removeQuestionFromPackageAction(examId, questionId))
        }
      >
        <Trash2 aria-hidden="true" className="size-4 text-destructive" />
      </Button>

      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
