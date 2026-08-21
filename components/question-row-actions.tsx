"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

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

type ActiveDialog = "archive" | "restore" | "delete" | null

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
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string
  ) {
    setError(null)
    const result = await action()

    if (!result.ok) {
      const msg = result.message ?? "Aksi gagal."
      setError(msg)
      toast.error(msg)
      return
    }

    toast.success(successMessage)
    setActiveDialog(null)
    startTransition(() => {
      router.refresh()
    })
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setActiveDialog(null)
      setError(null)
    }
  }

  if (bankArchived) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {archived ? (
        <>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setError(null)
              setActiveDialog("restore")
            }}
          >
            <RotateCcw className="size-3.5" />
            Pulihkan
          </Button>
          <Button
            size="sm"
            type="button"
            variant="destructive"
            onClick={() => {
              setError(null)
              setActiveDialog("delete")
            }}
          >
            <Trash2 className="size-3.5" />
            Hapus
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => {
            setError(null)
            setActiveDialog("archive")
          }}
        >
          <Archive className="size-3.5" />
          Arsipkan
        </Button>
      )}

      {/* Confirmation Dialog: Archive Question */}
      {activeDialog === "archive" ? (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Arsipkan butir soal?</DialogTitle>
              <DialogDescription>
                Soal yang diarsipkan tidak akan dimasukkan ke dalam paket ujian
                baru, namun riwayat ujian yang telah menggunakan soal ini tetap
                terjaga.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog(null)}
              >
                Batal
              </Button>
              <Button
                disabled={isPending}
                type="button"
                onClick={() =>
                  run(
                    () => archiveQuestionAction(questionId),
                    "Soal berhasil diarsipkan."
                  )
                }
              >
                <Archive className="size-3.5" />
                Arsipkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Confirmation Dialog: Restore Question */}
      {activeDialog === "restore" ? (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pulihkan butir soal?</DialogTitle>
              <DialogDescription>
                Soal akan kembali berstatus aktif dan dapat digunakan kembali
                untuk pembuatan paket ujian.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog(null)}
              >
                Batal
              </Button>
              <Button
                disabled={isPending}
                type="button"
                onClick={() =>
                  run(
                    () => restoreQuestionAction(questionId),
                    "Soal berhasil dipulihkan."
                  )
                }
              >
                <RotateCcw className="size-3.5" />
                Pulihkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Confirmation Dialog: Delete Question */}
      {activeDialog === "delete" ? (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus butir soal?</DialogTitle>
              <DialogDescription>
                Soal ini akan terhapus permanen beserta media yang dilampirkan.
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog(null)}
              >
                Batal
              </Button>
              <Button
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={() =>
                  run(
                    () => deleteQuestionAction(questionId),
                    "Soal berhasil dihapus."
                  )
                }
              >
                <Trash2 className="size-3.5" />
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
