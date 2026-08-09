"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { APP_ROLES, type AppRole } from "@/lib/auth-roles"
import { formatRoleLabel } from "@/lib/users/format"

/**
 * Roles a super admin may assign. `super-admin` is absent: it is granted by
 * the seed script only, and the server rejects it.
 */
const ASSIGNABLE_ROLES: AppRole[] = [APP_ROLES.USER, APP_ROLES.ADMIN]

export function EditUserRoleForm({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: AppRole
}) {
  const router = useRouter()
  const [role, setRole] = useState<AppRole>(currentRole)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    const result = await authClient.admin.setRole({
      userId,
      role,
    })

    setIsSaving(false)

    if (result.error) {
      setError(result.error.message || "Unable to change this user's role.")
      return
    }

    // No router.refresh() after push(): it refetches the current page and can
    // cancel the navigation (see create-user-form).
    router.push("/dashboard/users")
  }

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={onSubmit}>
      <Field>
        <FieldLabel htmlFor="role">Role</FieldLabel>
        <Select
          disabled={isSaving}
          onValueChange={(value) => setRole(value as AppRole)}
          value={role}
        >
          <SelectTrigger id="role" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {formatRoleLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {error && <FieldError>{error}</FieldError>}

      <Button
        className="self-start"
        disabled={isSaving || role === currentRole}
        type="submit"
      >
        {isSaving ? "Menyimpan..." : "Simpan Role"}
      </Button>
    </form>
  )
}
