"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import {
  BAN_DURATION_PRESETS,
  type BanDuration,
  type BanDurationPresetValue,
  banDurationToSeconds,
  formatBanExpiry,
} from "@/lib/users/edit"

type DurationKind = "permanent" | "temporary"
type TemporaryChoice = BanDurationPresetValue | "custom"

function buildDuration(
  kind: DurationKind,
  choice: TemporaryChoice,
  customDays: string
): BanDuration {
  if (kind === "permanent") {
    return { kind: "permanent" }
  }

  if (choice === "custom") {
    return { kind: "custom", days: Number(customDays) || 0 }
  }

  return { kind: "preset", preset: choice }
}

export function EditUserBanForm({
  userId,
  isBanned,
  currentBanReason,
  currentBanExpiry,
}: {
  userId: string
  isBanned: boolean
  currentBanReason: string | null
  currentBanExpiry: string | null
}) {
  const router = useRouter()
  const [reason, setReason] = useState(currentBanReason ?? "")
  const [kind, setKind] = useState<DurationKind>("permanent")
  const [choice, setChoice] = useState<TemporaryChoice>("24-hours")
  const [customDays, setCustomDays] = useState("1")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const seconds = banDurationToSeconds(
    buildDuration(kind, choice, customDays)
  )
  const preview = formatBanExpiry(seconds)

  async function submitBan(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    const { error: apiError } = await authClient.admin.banUser({
      userId,
      banReason: reason || undefined,
      banExpiresIn: seconds,
    })

    setIsSaving(false)

    if (apiError) {
      setError(apiError.message || "Unable to ban this user.")
      return
    }

    router.push("/dashboard/users")
  }

  async function submitUnban() {
    setError(null)
    setIsSaving(true)

    const { error: apiError } = await authClient.admin.unbanUser({ userId })

    setIsSaving(false)

    if (apiError) {
      setError(apiError.message || "Unable to lift this ban.")
      return
    }

    router.push("/dashboard/users")
  }

  if (isBanned) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            Akun ini diblokir
            {currentBanReason ? `: ${currentBanReason}` : "."}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentBanExpiry
              ? `Blokir berakhir ${currentBanExpiry}.`
              : "Blokir bersifat permanen."}
          </p>
        </div>

        {error && <FieldError>{error}</FieldError>}

        <Button
          className="self-start"
          disabled={isSaving}
          onClick={submitUnban}
          type="button"
          variant="outline"
        >
          {isSaving ? "Memproses..." : "Buka Blokir"}
        </Button>
      </div>
    )
  }

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={submitBan}>
      <Field>
        <FieldLabel htmlFor="banReason">Alasan Blokir</FieldLabel>
        <Input
          disabled={isSaving}
          id="banReason"
          onChange={(event) => setReason(event.target.value)}
          placeholder="Melanggar aturan ujian"
          type="text"
          value={reason}
        />
      </Field>

      <Field>
        <FieldLabel>Durasi</FieldLabel>
        <RadioGroup
          aria-label="Durasi"
          disabled={isSaving}
          onValueChange={(value) => setKind(value as DurationKind)}
          value={kind}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="duration-permanent" value="permanent" />
            <FieldLabel htmlFor="duration-permanent">Permanen</FieldLabel>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="duration-temporary" value="temporary" />
            <FieldLabel htmlFor="duration-temporary">Sementara</FieldLabel>
          </div>
        </RadioGroup>
      </Field>

      {kind === "temporary" && (
        <Field>
          <FieldLabel htmlFor="banDuration">Lama Blokir</FieldLabel>
          <Select
            disabled={isSaving}
            onValueChange={(value) => setChoice(value as TemporaryChoice)}
            value={choice}
          >
            <SelectTrigger id="banDuration" aria-label="Lama Blokir">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BAN_DURATION_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom (hari)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      {kind === "temporary" && choice === "custom" && (
        <Field>
          <FieldLabel htmlFor="customDays">Jumlah Hari</FieldLabel>
          <Input
            disabled={isSaving}
            id="customDays"
            min={1}
            onChange={(event) => setCustomDays(event.target.value)}
            type="number"
            value={customDays}
          />
        </Field>
      )}

      <FieldDescription data-testid="ban-expiry-preview">
        {preview
          ? `Blokir berakhir: ${preview}`
          : "Blokir tidak akan berakhir otomatis."}
      </FieldDescription>

      {error && <FieldError>{error}</FieldError>}

      <Button className="self-start" disabled={isSaving} type="submit">
        {isSaving ? "Memproses..." : "Blokir Akun"}
      </Button>
    </form>
  )
}
