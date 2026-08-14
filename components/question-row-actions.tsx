"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  archiveQuestionAction,
  deleteQuestionAction,
  restoreQuestionAction,
} from "@/lib/question-banks/lifecycle-actions"

/**
 * The question lifecycle controls on a bank detail row: archive, restore,
 * and terminal delete (only offered from the archived state, with
 * confirmation). Hidden entirely while the bank itself is archived.
 */
export function QuestionRowActions({
  questionId,
  archived,
  bankArchived,
}: {
  questionId: string
  archived: boolean
  bankArchived: boolean
}) {
  const router = useRouter()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function run(
    action: () => Promise<{ ok: boolean; message?: string }>
  ) {
    setError(null)
    const result = await action()

    if (!result.ok) {
      setError(result.message ?? "Aksi gagal.")
      return
    }

    setConfirmingDelete(false)
    refresh()
  }

  if (bankArchived) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {archived ? (
        <>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => run(() => restoreQuestionAction(questionId))}
          >
            Pulihkan
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            Hapus
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => run(() => archiveQuestionAction(questionId))}
        >
          Arsipkan
        </Button>
      )}

      {confirmingDelete ? (
        <Dialog open onOpenChange={(open) => setConfirmingDelete(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus soal?</DialogTitle>
              <DialogDescription>
                Soal ini akan terhapus permanen beserta media yang
                dilampirkan. Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(false)}
              >
                Batal
              </Button>
              <Button
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={() => run(() => deleteQuestionAction(questionId))}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
