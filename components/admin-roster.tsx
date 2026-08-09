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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { authClient } from "@/lib/auth-client"
import { APP_ROLES, type AppRole } from "@/lib/auth-roles"
import { formatJoinedAt, formatRoleLabel } from "@/lib/users/format"
import type { UserListItem } from "@/lib/users/queries"

const COLUMNS = ["Nama", "Email", "Role", "Bergabung", "Aksi"]

/**
 * Change a role, then refresh the server data on the current page.
 *
 * `router.refresh()` here is the intended use: re-fetch this route's server
 * components after a mutation. There is no `push()` nearby, so the
 * push/refresh race from ticket 06 cannot occur.
 *
 * Returns whether the change succeeded, so the caller can close its dialog.
 */
async function setRoleAndRefresh(
  userId: string,
  role: AppRole,
  onError: (message: string) => void
): Promise<boolean> {
  const { error } = await authClient.admin.setRole({ userId, role })

  if (error) {
    onError(error.message || "Unable to change this user's role.")
    return false
  }

  return true
}

function DemoteDialog({ account }: { account: UserListItem }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function confirm() {
    setError(null)
    setIsSaving(true)

    const ok = await setRoleAndRefresh(account.id, APP_ROLES.USER, setError)

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

function PromoteDialog({ candidates }: { candidates: UserListItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function confirm() {
    if (!userId) {
      return
    }

    setError(null)
    setIsSaving(true)

    const ok = await setRoleAndRefresh(userId, APP_ROLES.ADMIN, setError)

    setIsSaving(false)

    if (ok) {
      setOpen(false)
      setUserId(null)
      router.refresh()
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={candidates.length === 0}>
          Promosikan Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promosikan ke Admin</DialogTitle>
          <DialogDescription>
            Pilih pengguna yang akan dinaikkan menjadi admin.
          </DialogDescription>
        </DialogHeader>

        <Select onValueChange={setUserId} value={userId ?? undefined}>
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
          <Button disabled={isSaving || !userId} onClick={confirm} type="button">
            {isSaving ? "Memproses..." : "Promosikan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminRoster({
  roster,
  promotable,
}: {
  roster: UserListItem[]
  promotable: UserListItem[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Manajemen Admin</h1>
          <p className="text-sm text-muted-foreground">
            {roster.length} akun dengan hak admin.
          </p>
        </div>
        <PromoteDialog candidates={promotable} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada admin.
                </TableCell>
              </TableRow>
            ) : (
              roster.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>{formatRoleLabel(account.role)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatJoinedAt(account.createdAt)}
                  </TableCell>
                  <TableCell>
                    {account.role === APP_ROLES.SUPER_ADMIN ? (
                      <span className="text-sm text-muted-foreground">
                        Tidak dapat diturunkan
                      </span>
                    ) : (
                      <DemoteDialog account={account} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
