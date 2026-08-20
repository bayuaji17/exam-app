"use client"

import {
  Loader2Icon,
  LockIcon,
  ShieldAlertIcon,
  UnlockIcon,
} from "lucide-react"
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
    return { kind: "custom", days: Number(customDays) }
  }

  return { kind: "preset", preset: choice }
}

function customDaysAreValid(customDays: string): boolean {
  const days = Number(customDays)

  return Number.isFinite(days) && days >= 1
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
  const [confirmBanOpen, setConfirmBanOpen] = useState(false)
  const [confirmUnbanOpen, setConfirmUnbanOpen] = useState(false)

  const isCustom = kind === "temporary" && choice === "custom"
  const customValid = !isCustom || customDaysAreValid(customDays)

  const seconds = banDurationToSeconds(buildDuration(kind, choice, customDays))
  const preview = isCustom && !customValid ? null : formatBanExpiry(seconds)

  async function handleConfirmBan() {
    setError(null)
    setIsSaving(true)

    const { error: apiError } = await authClient.admin.banUser({
      userId,
      banReason: reason || undefined,
      banExpiresIn: seconds,
    })

    setIsSaving(false)

    if (apiError) {
      const errorMessage = apiError.message || "Unable to ban this user."
      setError(errorMessage)
      toast.error(errorMessage)
      setConfirmBanOpen(false)
      return
    }

    setConfirmBanOpen(false)
    toast.success("Pengguna berhasil diblokir.")
    router.push("/dashboard/users")
  }

  async function handleConfirmUnban() {
    setError(null)
    setIsSaving(true)

    const { error: apiError } = await authClient.admin.unbanUser({ userId })

    setIsSaving(false)

    if (apiError) {
      const errorMessage = apiError.message || "Unable to lift this ban."
      setError(errorMessage)
      toast.error(errorMessage)
      setConfirmUnbanOpen(false)
      return
    }

    setConfirmUnbanOpen(false)
    toast.success("Blokir pengguna berhasil dibuka.")
    router.push("/dashboard/users")
  }

  if (isBanned) {
    return (
      <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-6">
          {/* Card Header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive dark:bg-destructive/20">
                <ShieldAlertIcon className="size-4" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Status Blokir
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Atur status akses pengguna untuk mengikuti ujian.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive dark:bg-destructive/10">
            <p className="font-semibold">
              Akun ini sedang diblokir
              {currentBanReason ? `: ${currentBanReason}` : "."}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {currentBanExpiry
                ? `Blokir berakhir pada ${currentBanExpiry}.`
                : "Blokir ini bersifat permanen."}
            </p>
          </div>

          {error && <FieldError>{error}</FieldError>}
        </div>

        <div>
          <Button
            className="gap-2 self-start"
            disabled={isSaving}
            onClick={() => setConfirmUnbanOpen(true)}
            type="button"
            variant="outline"
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UnlockIcon className="size-4" />
            )}
            <span>{isSaving ? "Memproses..." : "Buka Blokir"}</span>
          </Button>
        </div>

        {/* Confirmation Dialog for Unban */}
        <Dialog open={confirmUnbanOpen} onOpenChange={setConfirmUnbanOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Buka Blokir</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin membuka blokir akun pengguna ini?
                Pengguna akan dapat kembali masuk ke sistem dan mengikuti ujian.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                disabled={isSaving}
                onClick={() => setConfirmUnbanOpen(false)}
                type="button"
                variant="outline"
              >
                Batal
              </Button>
              <Button
                className="gap-2"
                disabled={isSaving}
                onClick={handleConfirmUnban}
                type="button"
              >
                {isSaving && <Loader2Icon className="size-4 animate-spin" />}
                <span>{isSaving ? "Memproses..." : "Ya, Buka Blokir"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-6">
        {/* Card Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <ShieldAlertIcon className="size-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Status Blokir
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Atur status akses pengguna untuk mengikuti ujian.
          </p>
        </div>

        <form
          className="flex flex-col gap-5"
          id="ban-user-form"
          onSubmit={(e) => {
            e.preventDefault()
            setConfirmBanOpen(true)
          }}
        >
          <Field>
            <FieldLabel htmlFor="banReason">
              Alasan Blokir (opsional)
            </FieldLabel>
            <Input
              disabled={isSaving}
              id="banReason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Melanggar aturan ujian"
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
                <FieldLabel
                  className="cursor-pointer"
                  htmlFor="duration-permanent"
                >
                  Permanen
                </FieldLabel>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="duration-temporary" value="temporary" />
                <FieldLabel
                  className="cursor-pointer"
                  htmlFor="duration-temporary"
                >
                  Sementara
                </FieldLabel>
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
            <Field data-invalid={!customValid}>
              <FieldLabel htmlFor="customDays">Jumlah Hari</FieldLabel>
              <Input
                aria-invalid={!customValid}
                disabled={isSaving}
                id="customDays"
                min={1}
                onChange={(event) => setCustomDays(event.target.value)}
                type="number"
                value={customDays}
              />
              {!customValid && <FieldError>Minimal 1 hari.</FieldError>}
            </Field>
          )}

          <FieldDescription
            className="text-xs"
            data-testid="ban-expiry-preview"
          >
            {isCustom && !customValid
              ? "Masukkan jumlah hari yang valid."
              : preview
                ? `Blokir berakhir: ${preview}`
                : "Akun akan diblokir hingga Anda mengaktifkannya kembali."}
          </FieldDescription>

          {error && <FieldError>{error}</FieldError>}
        </form>
      </div>

      <div>
        <Button
          className="gap-2 self-start"
          disabled={isSaving || !customValid}
          form="ban-user-form"
          type="submit"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <LockIcon className="size-4" />
          )}
          <span>{isSaving ? "Memproses..." : "Blokir Akun"}</span>
        </Button>
      </div>

      {/* Confirmation Dialog for Ban */}
      <Dialog open={confirmBanOpen} onOpenChange={setConfirmBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Blokir Akun</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memblokir akun pengguna ini? Pengguna
              tidak akan dapat masuk ke sistem atau mengikuti ujian yang sedang
              berjalan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              disabled={isSaving}
              onClick={() => setConfirmBanOpen(false)}
              type="button"
              variant="outline"
            >
              Batal
            </Button>
            <Button
              className="gap-2"
              disabled={isSaving}
              onClick={handleConfirmBan}
              type="button"
              variant="destructive"
            >
              {isSaving && <Loader2Icon className="size-4 animate-spin" />}
              <span>{isSaving ? "Memproses..." : "Ya, Blokir Akun"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
