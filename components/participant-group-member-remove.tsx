"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
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
import { removeGroupMemberAction } from "@/lib/participants/actions"

/**
 * Per-row member removal with confirmation. The member is released from the
 * group; the account itself is untouched.
 */
export function ParticipantGroupMemberRemove({
  groupId,
  userId,
  name,
}: {
  groupId: string
  userId: string
  name: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleRemove() {
    setError(null)
    const result = await removeGroupMemberAction(groupId, userId)

    if (!result.ok) {
      const msg = result.message ?? "Aksi gagal."
      setError(msg)
      toast.error(msg)
      return
    }

    toast.success(`${name} berhasil dikeluarkan dari grup.`)
    setConfirming(false)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <>
      <Button
        onClick={() => setConfirming(true)}
        type="button"
        variant="destructive"
      >
        <Trash2 />
        Keluarkan
      </Button>

      {confirming ? (
        <Dialog open onOpenChange={(open) => setConfirming(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus {name} dari grup?</DialogTitle>
              <DialogDescription>
                Peserta tidak lagi menjadi anggota grup ini. Akun peserta tidak
                terpengaruh.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
              >
                Batal
              </Button>
              <Button
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={handleRemove}
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
