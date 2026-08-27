"use client"

import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { useState } from "react"
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
import { deleteRoleAction } from "@/lib/roles/actions"

export interface DeleteRoleDialogProps {
  role: {
    id: string
    name: string
    isSystem: boolean
    userCount: number
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRoleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!role) return null

  const isBlockedByUserCount = role.userCount > 0
  const isSystem = role.isSystem

  async function handleDelete() {
    if (!role || isBlockedByUserCount || isSystem) return

    setIsDeleting(true)
    const result = await deleteRoleAction(role.id)
    setIsDeleting(false)

    if (!result.ok) {
      toast.error(result.message ?? "Gagal menghapus peran.")
      return
    }

    toast.success(`Peran "${role.name}" berhasil dihapus.`)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangleIcon className="size-5" />
          </div>
          <DialogTitle>Hapus Peran: {role.name}</DialogTitle>
          <DialogDescription>
            {isSystem ? (
              <span className="text-destructive">
                Peran sistem bawaan dilindungi dan tidak dapat dihapus dari
                aplikasi.
              </span>
            ) : isBlockedByUserCount ? (
              <span className="font-medium text-destructive">
                Peran ini sedang digunakan oleh{" "}
                <strong>{role.userCount}</strong> pengguna aktif. Anda harus
                mencabut atau mengalihkan peran tersebut dari semua pengguna
                sebelum dapat menghapusnya.
              </span>
            ) : (
              "Apakah Anda yakin ingin menghapus peran kustom ini? Tindakan ini permanen dan tidak dapat dibatalkan."
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {isBlockedByUserCount || isSystem ? "Tutup" : "Batal"}
          </Button>
          {!isBlockedByUserCount && !isSystem && (
            <Button
              className="gap-2"
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
              <span>{isDeleting ? "Menghapus..." : "Ya, Hapus Peran"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
