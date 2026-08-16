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
import { deleteParticipantGroupAction } from "@/lib/participants/actions"

/**
 * The terminal group delete, only reachable through confirmation. Groups
 * referenced by a schedule's access rules are rejected by the server.
 */
export function ParticipantGroupRowActions({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    const result = await deleteParticipantGroupAction(groupId)

    if (!result.ok) {
      setError(result.message ?? "Aksi gagal.")
      return
    }

    setConfirmingDelete(false)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <>
      <Button
        size="sm"
        type="button"
        variant="outline"
        className="text-destructive"
        onClick={() => setConfirmingDelete(true)}
      >
        Hapus
      </Button>

      {confirmingDelete ? (
        <Dialog open onOpenChange={(open) => setConfirmingDelete(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus grup peserta?</DialogTitle>
              <DialogDescription>
                Seluruh anggota grup akan dilepas. Grup yang sedang dipakai
                oleh aturan akses ujian tidak dapat dihapus. Tindakan ini
                tidak dapat dibatalkan.
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
                onClick={handleDelete}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
