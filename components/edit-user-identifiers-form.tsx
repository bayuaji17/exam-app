"use client"

import { CreditCardIcon, Loader2Icon, SaveIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { APP_ROLES, type SystemRole } from "@/lib/auth-roles"
import {
  checkUserIdentifierAction,
  updateUserIdentifiersAction,
} from "@/lib/users/identifier-actions"
import { nisnSchema, nisSchema, nipSchema } from "@/lib/identifiers"

export function EditUserIdentifiersForm({
  userId,
  role,
  initialNisn,
  initialNis,
  initialNip,
}: {
  userId: string
  role: SystemRole
  initialNisn?: number | null
  initialNis?: string | null
  initialNip?: string | null
}) {
  const router = useRouter()
  const isParticipant = role === APP_ROLES.USER
  const isAdmin = role === APP_ROLES.ADMIN || role === APP_ROLES.SUPER_ADMIN

  const [nisn, setNisn] = useState<string>(
    initialNisn ? String(initialNisn) : ""
  )
  const [nis, setNis] = useState<string>(initialNis ?? "")
  const [nip, setNip] = useState<string>(initialNip ?? "")

  const [fieldErrors, setFieldErrors] = useState<{
    nisn?: string
    nis?: string
    nip?: string
    general?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  )

  function triggerUniqueCheck(
    field: "nisn" | "nis" | "nip",
    value: string | number
  ) {
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field])
    }

    if (typeof value === "string" && !value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
      return
    }

    debounceTimers.current[field] = setTimeout(async () => {
      try {
        const res = await checkUserIdentifierAction(field, value, userId)
        if (res.ok && res.taken) {
          const labelMap = { nisn: "NISN", nis: "NIS", nip: "NIP" }
          setFieldErrors((prev) => ({
            ...prev,
            [field]: `${labelMap[field]} sudah digunakan.`,
          }))
        } else {
          setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
        }
      } catch {
        // Silent catch for uniqueness check
      }
    }, 400)
  }

  const isDirty =
    (isParticipant &&
      (nisn !== (initialNisn ? String(initialNisn) : "") ||
        nis !== (initialNis ?? ""))) ||
    (isAdmin && nip !== (initialNip ?? ""))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})

    if (isParticipant) {
      const numNisn = Number(nisn)
      const parsedNisn = nisnSchema.safeParse(numNisn)
      if (!parsedNisn.success) {
        setFieldErrors((prev) => ({
          ...prev,
          nisn: parsedNisn.error.issues[0]?.message ?? "NISN tidak valid.",
        }))
        return
      }

      if (nis.trim()) {
        const parsedNis = nisSchema.safeParse(nis.trim())
        if (!parsedNis.success) {
          setFieldErrors((prev) => ({
            ...prev,
            nis: parsedNis.error.issues[0]?.message ?? "NIS tidak valid.",
          }))
          return
        }
      }
    }

    if (isAdmin) {
      const parsedNip = nipSchema.safeParse(nip.trim())
      if (!parsedNip.success) {
        setFieldErrors((prev) => ({
          ...prev,
          nip: parsedNip.error.issues[0]?.message ?? "NIP tidak valid.",
        }))
        return
      }
    }

    if (fieldErrors.nisn || fieldErrors.nis || fieldErrors.nip) {
      return
    }

    setIsSaving(true)

    const payload: {
      nisn?: number | null
      nis?: string | null
      nip?: string | null
    } = {}

    if (isParticipant) {
      payload.nisn = nisn ? Number(nisn) : null
      payload.nis = nis.trim() || null
    } else if (isAdmin) {
      payload.nip = nip.trim() || null
    }

    const result = await updateUserIdentifiersAction(userId, payload)
    setIsSaving(false)

    if (!result.ok) {
      setFieldErrors((prev) => ({ ...prev, general: result.message }))
      toast.error(result.message)
      return
    }

    toast.success("Nomor identitas berhasil diperbarui.")
    router.push("/dashboard/users")
  }

  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-6">
        {/* Card Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <CreditCardIcon className="size-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Nomor Identitas
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {isParticipant
              ? "Perbarui NISN dan NIS peserta ujian."
              : "Perbarui NIP staf/admin."}
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          id="edit-identifiers-form"
          onSubmit={handleSubmit}
        >
          {isParticipant && (
            <>
              <Field data-invalid={Boolean(fieldErrors.nisn)}>
                <FieldLabel htmlFor="edit-nisn">
                  NISN (Nomor Induk Siswa Nasional)
                </FieldLabel>
                <Input
                  aria-invalid={Boolean(fieldErrors.nisn)}
                  disabled={isSaving}
                  id="edit-nisn"
                  inputMode="numeric"
                  onChange={(e) => {
                    const val = e.target.value
                    setNisn(val)
                    if (val) {
                      triggerUniqueCheck("nisn", Number(val))
                    } else {
                      setFieldErrors((prev) => ({ ...prev, nisn: undefined }))
                    }
                  }}
                  placeholder="10 digit angka (cth. 1234567890)"
                  type="number"
                  value={nisn}
                />
                <FieldDescription className="text-xs">
                  Wajib diisi 10 digit angka.
                </FieldDescription>
                {fieldErrors.nisn && (
                  <FieldError>{fieldErrors.nisn}</FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(fieldErrors.nis)}>
                <FieldLabel htmlFor="edit-nis">
                  NIS (Nomor Induk Siswa)
                </FieldLabel>
                <Input
                  aria-invalid={Boolean(fieldErrors.nis)}
                  disabled={isSaving}
                  id="edit-nis"
                  onChange={(e) => {
                    const val = e.target.value
                    setNis(val)
                    if (val.trim().length >= 3) {
                      triggerUniqueCheck("nis", val.trim())
                    } else {
                      setFieldErrors((prev) => ({ ...prev, nis: undefined }))
                    }
                  }}
                  placeholder="cth. 2026-001 (opsional)"
                  type="text"
                  value={nis}
                />
                <FieldDescription className="text-xs">
                  Nomor induk siswa sekolah (opsional, 3–20 karakter).
                </FieldDescription>
                {fieldErrors.nis && <FieldError>{fieldErrors.nis}</FieldError>}
              </Field>
            </>
          )}

          {isAdmin && (
            <Field data-invalid={Boolean(fieldErrors.nip)}>
              <FieldLabel htmlFor="edit-nip">
                NIP (Nomor Induk Pegawai)
              </FieldLabel>
              <Input
                aria-invalid={Boolean(fieldErrors.nip)}
                disabled={isSaving}
                id="edit-nip"
                onChange={(e) => {
                  const val = e.target.value
                  setNip(val)
                  if (val.trim().length >= 3) {
                    triggerUniqueCheck("nip", val.trim())
                  } else {
                    setFieldErrors((prev) => ({ ...prev, nip: undefined }))
                  }
                }}
                placeholder="cth. 198501012010011001"
                type="text"
                value={nip}
              />
              <FieldDescription className="text-xs">
                Wajib diisi (3–20 karakter).
              </FieldDescription>
              {fieldErrors.nip && <FieldError>{fieldErrors.nip}</FieldError>}
            </Field>
          )}

          {fieldErrors.general && (
            <FieldError>{fieldErrors.general}</FieldError>
          )}
        </form>
      </div>

      <div>
        <Button
          className="gap-2 self-start"
          disabled={isSaving || !isDirty}
          form="edit-identifiers-form"
          type="submit"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          <span>{isSaving ? "Menyimpan..." : "Simpan Identitas"}</span>
        </Button>
      </div>
    </div>
  )
}
