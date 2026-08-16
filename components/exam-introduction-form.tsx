"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ExamIntroductionEditor } from "@/components/exam-introduction-editor"
import { updateExamScheduleIntroductionAction } from "@/lib/exam-schedules/actions"
import type { TipTapDoc } from "@/lib/content-policy"

/**
 * The introduction editor for one schedule: writes the rich-text document,
 * saves it through the server action (re-validated against the introduction
 * policy), and refreshes.
 */
export function ExamIntroductionForm({
  scheduleId,
  initialContent,
}: {
  scheduleId: string
  initialContent: TipTapDoc | null
}) {
  const router = useRouter()
  const [content, setContent] = useState<TipTapDoc | null>(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(value: TipTapDoc | null = content) {
    setSaving(true)
    setError(null)

    const result = await updateExamScheduleIntroductionAction(scheduleId, value)

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan introduction.")
      setSaving(false)
      return
    }

    setContent(value)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <ExamIntroductionEditor
        initialContent={initialContent}
        onChange={(doc) => setContent(doc)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <Button disabled={saving} onClick={() => void handleSave()} type="button">
          {saving ? "Menyimpan…" : "Simpan Introduction"}
        </Button>
        <Button
          disabled={saving}
          onClick={() => void handleSave(null)}
          type="button"
          variant="outline"
        >
          Hapus (kembali ke teks default)
        </Button>
      </div>
    </div>
  )
}
