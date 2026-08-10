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
