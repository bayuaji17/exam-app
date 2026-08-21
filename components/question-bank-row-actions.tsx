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
  archiveQuestionBankAction,
  deleteQuestionBankAction,
  restoreQuestionBankAction,
} from "@/lib/question-banks/lifecycle-actions"

type ActiveDialog = "archive" | "restore" | "delete" | null

/**
 * The bank lifecycle controls on the bank list row: archive, restore, and
 * terminal delete (only offered from the archived state, with
 * confirmation).
 */
export function QuestionBankRowActions({
  bankId,
  archived,
}: {
  bankId: string
  archived: boolean
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

  return (
    <div className="flex items-center gap-2">
      {archived ? (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError(null)
              setActiveDialog("restore")
            }}
          >
            <RotateCcw />
            Pulihkan
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setError(null)
              setActiveDialog("delete")
            }}
          >
            <Trash2 />
            Hapus
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null)
            setActiveDialog("archive")
          }}
        >
          <Archive />
          Arsipkan
        </Button>
      )}

      {/* Confirmation Dialog: Archive */}
      {activeDialog === "archive" ? (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Arsipkan bank soal?</DialogTitle>
              <DialogDescription>
                Bank soal yang diarsipkan tidak akan muncul di daftar pilihan
                pembuatan ujian, namun seluruh soal dan media di dalamnya tetap
                tersimpan aman.
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
                    () => archiveQuestionBankAction(bankId),
                    "Bank soal berhasil diarsipkan."
                  )
                }
              >
                <Archive />
                Arsipkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Confirmation Dialog: Restore */}
      {activeDialog === "restore" ? (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pulihkan bank soal?</DialogTitle>
              <DialogDescription>
                Bank soal akan kembali berstatus aktif dan dapat digunakan
                kembali untuk pembuatan soal atau paket ujian.
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
                    () => restoreQuestionBankAction(bankId),
                    "Bank soal berhasil dipulihkan."
                  )
                }
              >
                <RotateCcw />
                Pulihkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Confirmation Dialog: Delete */}
      {activeDialog === "delete" ? (
        <Dialog open onOpenChange={handleOpenChange}>
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
                    () => deleteQuestionBankAction(bankId),
                    "Bank soal berhasil dihapus."
                  )
                }
              >
                <Trash2 />
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
