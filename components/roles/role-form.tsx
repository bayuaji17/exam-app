"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  InfoIcon,
  Loader2Icon,
  LockIcon,
  SaveIcon,
  ShieldCheckIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createRoleAction, updateRoleAction } from "@/lib/roles/actions"
import {
  type RoleFormInput,
  type RoleFormValues,
  roleFormSchema,
} from "@/lib/roles/validation"
import { PermissionMatrix } from "./permission-matrix"

export interface RoleFormProps {
  role?: {
    id: string
    name: string
    slug: string
    description: string | null
    isSystem: boolean
    isDefault: boolean
    permissions: string[]
  }
}

export function RoleForm({ role }: RoleFormProps) {
  const router = useRouter()
  const isEdit = Boolean(role)
  const isSystemRole = Boolean(role?.isSystem)

  const form = useForm<RoleFormInput, unknown, RoleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(roleFormSchema) as any,
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? [],
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: RoleFormValues) {
    const result = isEdit
      ? await updateRoleAction(role!.id, values)
      : await createRoleAction(values)

    if (!result.ok) {
      const msg = result.message ?? "Gagal menyimpan peran."
      form.setError("root", { message: msg })
      toast.error(msg)
      return
    }

    toast.success(
      isEdit ? "Peran berhasil diperbarui." : "Peran baru berhasil dibuat."
    )
    router.push("/dashboard/roles")
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        {/* Header navigation & title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="outline">
              <Link href="/dashboard/roles">
                <ArrowLeftIcon className="size-4" />
                <span className="sr-only">Kembali</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {isEdit ? `Ubah Peran: ${role?.name}` : "Tambah Peran Baru"}
              </h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                {isEdit
                  ? "Sesuaikan nama, deskripsi, dan matriks hak akses peran."
                  : "Buat peran khusus dan tentukan daftar izin hak aksesnya."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/dashboard/roles">Batal</Link>
            </Button>
            <Button
              className="gap-2"
              disabled={
                isSubmitting || (isSystemRole && role?.slug === "super-admin")
              }
              type="submit"
            >
              {isSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Peran"}</span>
            </Button>
          </div>
        </div>

        {/* System Role Notification */}
        {isSystemRole && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs dark:bg-primary/10">
            <div className="flex items-start gap-3">
              <LockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Peran Sistem Terproteksi
                </p>
                <p className="text-muted-foreground">
                  {role?.slug === "super-admin"
                    ? "Peran Super Administrator memiliki hak akses bypass wildcard (*) ke seluruh fungsionalitas sistem. Nama dan izin peran ini tidak dapat diubah."
                    : "Peran sistem bawaan ini dilindungi agar stabilitas platform terjaga. Nama peran tidak dapat diubah."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Info Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Informasi Umum Peran
            </h2>
          </div>

          <FieldGroup className="gap-5">
            {/* Nama Role */}
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor={field.name}>Nama Peran</FieldLabel>
                    {isSystemRole && (
                      <Badge className="text-[10px]" variant="secondary">
                        Sistem
                      </Badge>
                    )}
                  </div>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                    disabled={isSystemRole}
                    id={field.name}
                    placeholder="Contoh: Guru Mata Pelajaran, Pengawas Ujian"
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Deskripsi */}
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Deskripsi</FieldLabel>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                    disabled={isSystemRole && role?.slug === "super-admin"}
                    id={field.name}
                    placeholder="Jelaskan ruang lingkup dan tanggung jawab peran ini..."
                    rows={3}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </div>

        {/* Permission Matrix Card */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Matriks Izin Hak Akses (Permissions)
            </h2>
            <p className="text-xs text-muted-foreground">
              Pilih kapabilitas dan batasan operasional yang diberikan kepada
              pengguna dengan peran ini.
            </p>
          </div>

          <Controller
            control={form.control}
            name="permissions"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <PermissionMatrix
                  disabled={isSubmitting}
                  onChange={field.onChange}
                  readOnly={isSystemRole && role?.slug === "super-admin"}
                  selectedPermissions={(field.value as string[]) ?? []}
                />
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </div>
            )}
          />
        </div>

        {/* Global Error Banner */}
        {form.formState.errors.root && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2 font-medium">
              <InfoIcon className="size-4" />
              <span>{form.formState.errors.root.message}</span>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
