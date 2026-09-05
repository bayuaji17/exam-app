"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { updatePackageQuestionScoreAction } from "@/lib/exam-packages/actions"

/**
 * The per-question points override input on a composition row. Empty means
 * equal points (null). Saves on blur or Enter.
 *
 * The displayed value is the prop until the admin starts editing (draft),
 * so a router.refresh after a save never fights the input.
 */
export function PackageQuestionScore({
  examId,
  questionId,
  initialScore,
}: {
  examId: string
  questionId: string
  initialScore: string | null
}) {
  const router = useRouter()
  const startTransition = useTransition()[1]
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedValue = useRef(initialScore ?? "")

  const value = draft ?? initialScore ?? ""

  async function save() {
    const trimmed = value.trim()
    const next = trimmed === "" ? null : Number(trimmed)

    if (trimmed !== "" && !Number.isFinite(next)) {
      setError("Poin harus berupa angka.")
      setDraft(null)
      return
    }

    const previous = savedValue.current
    const nextText = trimmed === "" ? "" : String(next)

    if (nextText === previous) {
      setDraft(null)
      return
    }

    setSaving(true)
    setError(null)

    const result = await updatePackageQuestionScoreAction(
      examId,
      questionId,
      next
    )

    setSaving(false)

    if (!result.ok) {
      setError(result.message)
      setDraft(null)
      return
    }

    savedValue.current = nextText
    setDraft(null)

    startTransition(() => {
      router.refresh()
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      void save()
    }

    if (event.key === "Escape") {
      setDraft(null)
      setError(null)
      event.currentTarget.blur()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        aria-label="Poin soal"
        aria-invalid={error ? true : undefined}
        className="w-20"
        disabled={saving}
        inputMode="decimal"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={handleKeyDown}
        placeholder="Sama rata"
        step="0.01"
        type="number"
        value={value}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
