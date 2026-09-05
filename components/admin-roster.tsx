"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { APP_ROLES, type SystemRole } from "@/lib/auth-roles"
import type { UserListItem } from "@/lib/users/queries"

async function setRole(
  userId: string,
  role: SystemRole,
  onError: (message: string) => void
): Promise<boolean> {
  const { error } = await authClient.admin.setRole({ userId, role })

  if (error) {
    onError(error.message || "Unable to change this user's role.")
    return false
  }

  return true
}

export function DemoteAdminButton({ account }: { account: UserListItem }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function confirm() {
    setError(null)
    setIsSaving(true)
    const ok = await setRole(account.id, APP_ROLES.USER, setError)
    setIsSaving(false)

    if (ok) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Turunkan ke User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Turunkan {account.name}?</DialogTitle>
          <DialogDescription>
            {account.email} akan kehilangan akses admin dan kembali menjadi
            pengguna biasa.
          </DialogDescription>
        </DialogHeader>
        {error && <FieldError>{error}</FieldError>}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isSaving} type="button" variant="ghost">
              Batal
            </Button>
          </DialogClose>
          <Button
            disabled={isSaving}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {isSaving ? "Memproses..." : "Turunkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PromoteAdminDialog({
  candidates,
}: {
  candidates: UserListItem[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function confirm() {
    if (!userId) {
      return
    }

    setError(null)
    setIsSaving(true)
    const ok = await setRole(userId, APP_ROLES.ADMIN, setError)
    setIsSaving(false)

    if (ok) {
      setOpen(false)
      setUserId("")
      router.refresh()
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={candidates.length === 0}>Promosikan Pengguna</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promosikan ke Admin</DialogTitle>
          <DialogDescription>
            Pilih pengguna yang akan dinaikkan menjadi admin.
          </DialogDescription>
        </DialogHeader>
        <Select onValueChange={setUserId} value={userId}>
          <SelectTrigger aria-label="Pilih pengguna">
            <SelectValue placeholder="Pilih pengguna" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <FieldError>{error}</FieldError>}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isSaving} type="button" variant="ghost">
              Batal
            </Button>
          </DialogClose>
          <Button
            disabled={isSaving || !userId}
            onClick={confirm}
            type="button"
          >
            {isSaving ? "Memproses..." : "Promosikan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
