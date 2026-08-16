"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveManualScoreAction } from "@/lib/grading/actions"

/**
 * The grade control for one manual question: a draft value, a save button,
 * and a clear button. The server bounds the score by the question's weight
 * and recomputes the attempt total.
 */
export function ManualGradeInput({
  attemptId,
  questionId,
  weight,
  currentScore,
}: {
  attemptId: string
  questionId: string
  weight: number
  currentScore: string | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(currentScore ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function save(score: string | null) {
    setSaving(true)
    setError(null)

    const value = score === null || score === "" ? null : Number(score)
    const result = await saveManualScoreAction(attemptId, questionId, value)

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan nilai.")
      setSaving(false)
      return
    }

    setDraft(score ?? "")
    setSaving(false)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={`Nilai soal ${questionId.slice(0, 8)} (maks ${weight})`}
        disabled={saving}
        inputMode="decimal"
        onChange={(event) => setDraft(event.target.value)}
        type="number"
        value={draft}
        className="w-28"
      />
      <span className="text-sm text-muted-foreground">/ {weight}</span>
      <Button
        disabled={saving || isPending}
        size="sm"
        type="button"
        onClick={() => save(draft)}
      >
        Simpan
      </Button>
      {currentScore !== null ? (
        <Button
          disabled={saving || isPending}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => save(null)}
        >
          Hapus
        </Button>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
