"use client"

import { Loader2Icon, SaveIcon, UserCogIcon } from "lucide-react"
import { useRouter } from "next/navigation"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { type SystemRole } from "@/lib/auth-roles"
import { CREATABLE_ROLES } from "@/lib/users/create"
import { formatRoleLabel } from "@/lib/users/format"

export function EditUserRoleForm({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: SystemRole
}) {
  const router = useRouter()
  const [role, setRole] = useState<SystemRole>(currentRole)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleConfirmSave() {
    setError(null)
    setIsSaving(true)

    const result = await authClient.admin.setRole({
      userId,
      role,
    })

    setIsSaving(false)

    if (result.error) {
      const errorMessage =
        result.error.message || "Unable to change this user's role."
      setError(errorMessage)
      toast.error(errorMessage)
      setConfirmOpen(false)
      return
    }

    setConfirmOpen(false)
    toast.success("Role pengguna berhasil diperbarui.")
    // No router.refresh() after push(): it refetches the current page and can
    // cancel the navigation (see create-user-form).
    router.push("/dashboard/users")
  }

  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-6">
        {/* Card Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <UserCogIcon className="size-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Ubah Role</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Pilih role yang sesuai untuk pengguna ini.
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          id="edit-role-form"
          onSubmit={(e) => {
            e.preventDefault()
            setConfirmOpen(true)
          }}
        >
          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Select
              disabled={isSaving}
              onValueChange={(value) => setRole(value as SystemRole)}
              value={role}
            >
              <SelectTrigger id="role" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATABLE_ROLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatRoleLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {error && <FieldError>{error}</FieldError>}
        </form>
      </div>

      <div>
        <Button
          className="gap-2 self-start"
          disabled={isSaving || role === currentRole}
          form="edit-role-form"
          type="submit"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          <span>{isSaving ? "Menyimpan..." : "Simpan Role"}</span>
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Role</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengubah role pengguna ini menjadi{" "}
              <strong className="text-foreground">
                {formatRoleLabel(role)}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              disabled={isSaving}
              onClick={() => setConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              Batal
            </Button>
            <Button
              className="gap-2"
              disabled={isSaving}
              onClick={handleConfirmSave}
              type="button"
            >
              {isSaving && <Loader2Icon className="size-4 animate-spin" />}
              <span>{isSaving ? "Menyimpan..." : "Ya, Simpan Role"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
