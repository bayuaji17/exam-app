"use client"

import {
  Loader2Icon,
  LockIcon,
  SaveIcon,
  ShieldIcon,
  UserCogIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { type SystemRole } from "@/lib/auth-roles"
import { assignUserRolesAction } from "@/lib/users/roles-actions"

export interface EditUserRoleFormProps {
  userId: string
  currentRole?: SystemRole
  availableRoles?: Array<{
    id: string
    name: string
    slug: string
    isSystem: boolean
    description?: string | null
  }>
  initialRoleIds?: string[]
}

export function EditUserRoleForm({
  userId,
  currentRole,
  availableRoles = [],
  initialRoleIds = [],
}: EditUserRoleFormProps) {
  const router = useRouter()
  const [selectedRoleIds, setSelectedRoleIds] =
    useState<string[]>(initialRoleIds)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isDynamicMode = availableRoles.length > 0

  // Check if roles have changed
  const hasChanged = isDynamicMode
    ? JSON.stringify([...selectedRoleIds].sort()) !==
      JSON.stringify([...initialRoleIds].sort())
    : false

  function toggleRole(roleId: string) {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId))
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId])
    }
  }

  async function handleConfirmSave() {
    setError(null)
    setIsSaving(true)

    if (selectedRoleIds.length === 0) {
      setError("Setiap pengguna harus memiliki minimal 1 peran aktif.")
      setIsSaving(false)
      setConfirmOpen(false)
      return
    }

    const result = await assignUserRolesAction(userId, selectedRoleIds)
    setIsSaving(false)

    if (!result.ok) {
      const errorMessage = result.message || "Gagal memperbarui peran pengguna."
      setError(errorMessage)
      toast.error(errorMessage)
      setConfirmOpen(false)
      return
    }

    setConfirmOpen(false)
    toast.success("Peran pengguna berhasil diperbarui.")
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
            <h3 className="text-base font-bold text-foreground">
              Pengaturan Peran Pengguna (RBAC)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Pilih satu atau beberapa peran untuk pengguna ini. Hak akses yang
            diperoleh adalah gabungan dari semua peran yang dipilih.
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
          {isDynamicMode ? (
            <div className="space-y-3">
              {availableRoles.map((r) => {
                const isSelected = selectedRoleIds.includes(r.id)
                const isSuperAdminRole = r.slug === "super-admin"

                return (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 ${
                      isSelected
                        ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                        : ""
                    }`}
                    key={r.id}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="mt-0.5"
                      disabled={isSaving}
                      onCheckedChange={() => toggleRole(r.id)}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {r.name}
                        </span>
                        {r.isSystem ? (
                          <Badge
                            className="gap-0.5 text-[10px]"
                            variant="outline"
                          >
                            <LockIcon className="size-2.5" />
                            <span>Sistem</span>
                          </Badge>
                        ) : (
                          <Badge
                            className="gap-0.5 text-[10px]"
                            variant="secondary"
                          >
                            <ShieldIcon className="size-2.5" />
                            <span>Kustom</span>
                          </Badge>
                        )}
                        {isSuperAdminRole && (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            (Bypass Hak Akses Penuh)
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-[11px] text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Role saat ini: <strong>{currentRole}</strong>
            </p>
          )}

          {error && <FieldError>{error}</FieldError>}
        </form>
      </div>

      <div>
        <Button
          className="gap-2 self-start"
          disabled={isSaving || (isDynamicMode && !hasChanged)}
          form="edit-role-form"
          type="submit"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          <span>{isSaving ? "Menyimpan..." : "Simpan Peran"}</span>
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Peran</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyimpan konfigurasi peran untuk pengguna
              ini? Pengguna akan menerima akumulasi izin dari{" "}
              <strong>{selectedRoleIds.length}</strong> peran yang dipilih.
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
              <span>{isSaving ? "Menyimpan..." : "Ya, Simpan Peran"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
