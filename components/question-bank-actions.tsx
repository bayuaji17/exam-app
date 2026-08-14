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
  archiveQuestionBankAction,
  deleteQuestionBankAction,
  restoreQuestionBankAction,
} from "@/lib/question-banks/lifecycle-actions"

/**
 * The bank lifecycle controls on the bank detail page: archive, restore, and
 * terminal delete (only offered from the archived state, with confirmation).
 */
export function QuestionBankActions({
  bankId,
  archived,
}: {
  bankId: string
  archived: boolean
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

  return (
    <div className="flex items-center gap-2">
      {archived ? (
        <>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => run(() => restoreQuestionBankAction(bankId))}
          >
            Pulihkan Bank
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            Hapus Bank
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => run(() => archiveQuestionBankAction(bankId))}
        >
          Arsipkan Bank
        </Button>
      )}

      {confirmingDelete ? (
        <Dialog open onOpenChange={(open) => setConfirmingDelete(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus bank soal?</DialogTitle>
              <DialogDescription>
                Seluruh soal di dalam bank ini akan ikut terhapus permanen,
                beserta media yang dilampirkan. Tindakan ini tidak dapat
                dibatalkan.
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
                onClick={() => run(() => deleteQuestionBankAction(bankId))}
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
