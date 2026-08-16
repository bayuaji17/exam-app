"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

/**
 * Change the account password. The auth client verifies the current
 * password server-side before applying the new one.
 */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setMessage(null)

    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.")
      return
    }

    setSaving(true)

    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })

    setSaving(false)

    if (result.error) {
      setError(result.error.message ?? "Gagal mengubah kata sandi.")
      return
    }

    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setMessage("Kata sandi berhasil diubah.")
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">Kata sandi saat ini</FieldLabel>
          <Input
            autoComplete="current-password"
            id="currentPassword"
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            value={currentPassword}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="newPassword">Kata sandi baru</FieldLabel>
          <Input
            autoComplete="new-password"
            id="newPassword"
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            value={newPassword}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Ulangi kata sandi baru</FieldLabel>
          <Input
            autoComplete="new-password"
            id="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            value={confirmPassword}
          />
        </Field>
      </FieldGroup>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : null}

      <div>
        <Button disabled={saving} onClick={handleSubmit} type="button">
          {saving ? "Mengubah…" : "Ubah Kata Sandi"}
        </Button>
      </div>
    </div>
  )
}
